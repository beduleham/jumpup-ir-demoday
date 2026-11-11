import type { NextRequest } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { bulkRegister } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";
import { parseBulkText } from "@/lib/bulk-parse";

export const dynamic = "force-dynamic";

// 붙여넣기 한 번에 들어올 수 있는 최대 크기(수백 행이면 충분하다).
const requestSchema = z.object({ raw_tsv_text: z.string().min(1).max(200_000) });

// 스프레드시트 6열을 한 트랜잭션으로 등록한다. 한 행이라도 문제가 있으면 아무것도 등록하지 않는다.
export async function POST(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return adminFail(400, "요청 형식이 올바르지 않습니다.");

  const { rows, hasErrors } = parseBulkText(parsed.data.raw_tsv_text);
  if (rows.length === 0) return adminFail(400, "등록할 행이 없습니다.");
  if (hasErrors) {
    const rowErrors = rows
      .filter((row) => row.errors.length > 0)
      .map((row) => ({ line: row.line, errors: row.errors }));
    return adminFail(400, `${rowErrors[0].line}행: ${rowErrors[0].errors[0]}`, { row_errors: rowErrors });
  }

  try {
    return adminOk({ data: await bulkRegister(rows) });
  } catch (error) {
    return adminError("api/admin/bulk-register", error);
  }
}
