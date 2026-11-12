import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { ApiRole, LocalDatabase } from "./local-postgres";

// 테스트 전용: 로컬 Postgres 앞에 두는 아주 작은 PostgREST 흉내.
// 앱이 실제로 쓰는 호출(열 지정 조회, eq 필터, order, limit, RPC)만 지원한다.
// supabase-js → HTTP → 실제 SQL(역할 적용) 경로로 라우트 핸들러를 검증하기 위한 것이다.

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export interface PostgrestShim {
  url: string;
  anonKey: string;
  serviceKey: string;
  /** 실시간 브로드캐스트 REST 호출로 받은 메시지(테스트 확인용) */
  broadcasts: Array<{ topic: string; event: string; payload: unknown }>;
  /** true로 바꾸면 브로드캐스트 호출이 500으로 실패한다 */
  failBroadcasts: boolean;
  stop(): Promise<void>;
}

function identifier(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`지원하지 않는 식별자: ${name}`);
  return `"${name}"`;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => (text += chunk));
    request.on("end", () => resolve(text));
    request.on("error", reject);
  });
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function sendDatabaseError(response: ServerResponse, error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "XX000";
  const message = error instanceof Error ? error.message : String(error);
  // PostgREST처럼 권한 오류는 403, 그 밖의 SQL 오류(RAISE EXCEPTION 포함)는 400으로 돌려준다.
  send(response, code === "42501" ? 403 : 400, { code, message, details: null, hint: null });
}

export async function startPostgrestShim(db: LocalDatabase): Promise<PostgrestShim> {
  const anonKey = "test-anon-key";
  const serviceKey = "test-service-role-key";
  const roles = new Map<string, ApiRole>([
    [anonKey, "anon"],
    [serviceKey, "service_role"],
  ]);

  const shim: PostgrestShim = {
    url: "",
    anonKey,
    serviceKey,
    broadcasts: [],
    failBroadcasts: false,
    stop: async () => undefined,
  };

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const apiKey = request.headers.apikey;
    const role = typeof apiKey === "string" ? roles.get(apiKey) : undefined;
    if (!role) return send(response, 401, { message: "Invalid API key" });
    const pool = db.as(role);

    const url = new URL(request.url ?? "/", "http://shim");

    // Supabase Realtime의 브로드캐스트 REST 전송을 흉내 낸다(성공 시 202).
    const broadcast = /\/broadcast\/([^/]+)\/events\/([^/]+)$/.exec(url.pathname);
    if (broadcast && request.method === "POST") {
      if (role !== "service_role" || shim.failBroadcasts) return send(response, 500, { message: "broadcast failed" });
      shim.broadcasts.push({
        topic: decodeURIComponent(broadcast[1]),
        event: decodeURIComponent(broadcast[2]),
        payload: JSON.parse(await readBody(request)),
      });
      response.writeHead(202);
      return response.end();
    }

    const rpc = /^\/rest\/v1\/rpc\/([^/]+)$/.exec(url.pathname);
    const table = /^\/rest\/v1\/([^/]+)$/.exec(url.pathname);

    try {
      if (rpc && request.method === "POST") {
        const args: Record<string, unknown> = JSON.parse((await readBody(request)) || "{}");
        const names = Object.keys(args);
        const placeholders = names.map((name, index) => `${identifier(name)} => $${index + 1}`);
        const result = await pool.query<{ result: unknown }>(
          `select public.${identifier(rpc[1])}(${placeholders.join(", ")}) as result`,
          // 객체·배열 인자는 PostgREST처럼 JSON으로 넘긴다(node-pg는 배열을 Postgres 배열로 바꿔 버린다).
          names.map((name) => {
            const value = args[name];
            return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
          }),
        );
        return send(response, 200, result.rows[0].result);
      }

      if (table && request.method === "GET") {
        const columns = (url.searchParams.get("select") ?? "*")
          .split(",")
          .map((column) => (column.trim() === "*" ? "*" : identifier(column.trim())));
        const conditions: string[] = [];
        const values: string[] = [];
        let order = "";
        let limit = "";
        for (const [key, value] of url.searchParams) {
          if (key === "select") continue;
          if (key === "order") {
            const [column, direction] = value.split(".");
            order = ` order by ${identifier(column)} ${direction === "desc" ? "desc" : "asc"}`;
          } else if (key === "limit") {
            limit = ` limit ${Number.parseInt(value, 10)}`;
          } else if (value.startsWith("eq.")) {
            values.push(value.slice(3));
            conditions.push(`${identifier(key)}::text = $${values.length}`);
          } else {
            throw new Error(`지원하지 않는 필터: ${key}=${value}`);
          }
        }
        const where = conditions.length > 0 ? ` where ${conditions.join(" and ")}` : "";
        const result = await pool.query(
          `select ${columns.join(", ")} from public.${identifier(table[1])}${where}${order}${limit}`,
          values,
        );
        if ((request.headers.accept ?? "").includes("vnd.pgrst.object")) {
          if (result.rows.length !== 1) {
            return send(response, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: null, hint: null });
          }
          return send(response, 200, result.rows[0]);
        }
        return send(response, 200, result.rows);
      }

      if (table && request.method === "PATCH") {
        const patch: Record<string, unknown> = JSON.parse(await readBody(request));
        const values: unknown[] = [];
        const assignments = Object.keys(patch).map((column) => {
          values.push(patch[column]);
          return `${identifier(column)} = $${values.length}`;
        });
        const conditions: string[] = [];
        for (const [key, value] of url.searchParams) {
          if (key === "select") continue;
          if (!value.startsWith("eq.")) throw new Error(`지원하지 않는 필터: ${key}=${value}`);
          values.push(value.slice(3));
          conditions.push(`${identifier(key)}::text = $${values.length}`);
        }
        // 조건 없는 전체 갱신은 실제 Supabase(pg_safeupdate)처럼 거부한다.
        if (conditions.length === 0) throw new Error("UPDATE requires a WHERE clause");
        const returning = (url.searchParams.get("select") ?? "*")
          .split(",")
          .map((column) => (column.trim() === "*" ? "*" : identifier(column.trim())));
        const result = await pool.query(
          `update public.${identifier(table[1])} set ${assignments.join(", ")} where ${conditions.join(" and ")} returning ${returning.join(", ")}`,
          values,
        );
        if ((request.headers.accept ?? "").includes("vnd.pgrst.object")) {
          if (result.rows.length !== 1) {
            return send(response, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: null, hint: null });
          }
          return send(response, 200, result.rows[0]);
        }
        return send(response, 200, result.rows);
      }

      if (table && request.method === "DELETE") {
        const values: string[] = [];
        const conditions: string[] = [];
        for (const [key, value] of url.searchParams) {
          if (key === "select") continue;
          if (value.startsWith("eq.")) {
            values.push(value.slice(3));
            conditions.push(`${identifier(key)}::text = $${values.length}`);
          } else if (value.startsWith("gte.")) {
            values.push(value.slice(4));
            conditions.push(`${identifier(key)} >= $${values.length}::numeric`);
          } else {
            throw new Error(`지원하지 않는 필터: ${key}=${value}`);
          }
        }
        // 조건 없는 전체 삭제는 실제 Supabase(pg_safeupdate)처럼 거부한다.
        if (conditions.length === 0) throw new Error("DELETE requires a WHERE clause");
        await pool.query(`delete from public.${identifier(table[1])} where ${conditions.join(" and ")}`, values);
        response.writeHead(204);
        return response.end();
      }

      return send(response, 404, { message: `shim: 지원하지 않는 요청 ${request.method} ${url.pathname}` });
    } catch (error) {
      return sendDatabaseError(response, error);
    }
  }

  const server = createServer((request, response) => void handle(request, response));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  shim.url = `http://127.0.0.1:${port}`;
  shim.stop = () =>
    new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => (error ? reject(error) : resolve()));
    });
  return shim;
}
