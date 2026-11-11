import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

// 테스트 전용 일회용 Postgres. 임시 폴더에 새로 만들고 끝나면 지운다.
// 연결된(원격·공유) 데이터베이스에는 절대 접속하지 않는다.

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");
const PASSWORD = "local-test-only";

// Supabase가 프로젝트에 미리 만들어 두는 API 역할과 기본 권한을 흉내 낸다.
// 기본 권한까지 재현해야 마이그레이션의 REVOKE가 실제로 효과가 있는지 볼 수 있다.
const SUPABASE_ROLE_BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("빈 포트를 찾지 못했습니다."));
      });
    });
  });
}

export type ApiRole = "anon" | "authenticated" | "service_role";

export interface LocalDatabase {
  /** 슈퍼유저 연결. 테스트 데이터 준비에만 쓴다. */
  admin: pg.Pool;
  /** 지정한 Supabase API 역할로 동작하는 연결 풀. */
  as(role: ApiRole): pg.Pool;
  stop(): Promise<void>;
}

export async function startLocalDatabase(): Promise<LocalDatabase> {
  const databaseDir = await mkdtemp(path.join(tmpdir(), "jumpup-pg-"));
  const port = await freePort();
  const server = new EmbeddedPostgres({
    databaseDir,
    port,
    user: "postgres",
    password: PASSWORD,
    // 라이브러리가 종료 시 폴더를 직접 지우게 두면(persistent: false) Windows의 파일 잠금 때문에
    // 간헐적으로 EBUSY로 실패한다. 삭제는 아래 stop()에서 재시도하며 직접 한다.
    persistent: true,
    onLog: () => undefined,
  });
  await server.initialise();
  await server.start();

  const connection = { host: "127.0.0.1", port, user: "postgres", password: PASSWORD, database: "postgres" };
  const admin = new pg.Pool({ ...connection, max: 2 });
  await admin.query(SUPABASE_ROLE_BOOTSTRAP);

  const migrations = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of migrations) {
    await admin.query(await readFile(path.join(MIGRATIONS_DIR, name), "utf8"));
  }

  const pools = new Map<ApiRole, pg.Pool>();

  return {
    admin,
    as(role) {
      let pool = pools.get(role);
      if (!pool) {
        pool = new pg.Pool({ ...connection, max: 20, options: `-c role=${role}` });
        pools.set(role, pool);
      }
      return pool;
    },
    async stop() {
      await Promise.all([admin.end(), ...[...pools.values()].map((pool) => pool.end())]);
      await server.stop();
      // Windows에서는 서버가 멈춘 직후에도 파일 잠금이 남을 수 있어 삭제를 재시도한다.
      // 그래도 못 지우면 테스트 결과와 무관한 임시 폴더이므로 경고만 남긴다.
      try {
        await rm(databaseDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
      } catch (error) {
        console.warn(`[test] 임시 DB 폴더를 지우지 못했습니다(직접 삭제해도 됩니다): ${databaseDir}`, error);
      }
    },
  };
}
