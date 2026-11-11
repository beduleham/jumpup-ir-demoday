import type { NextRequest } from "next/server";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { bulkRegister } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";
import { bulkRegisterRequestSchema, BULK_MAX_ROWS, validateBulkRows } from "@/lib/bulk-parse";

export const dynamic = "force-dynamic";

// 기업·투자자 명단을 한 트랜잭션으로 등록(같은 번호는 갱신)한다.
// 화면이 미리 검증하더라도 서버가 같은 규칙으로 다시 검증하며, 한 행이라도 문제가 있으면 아무것도 등록하지 않는다.
export async function POST(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const parsed = bulkRegisterRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return adminFail(400, `요청 형식이 올바르지 않습니다. 한 번에 1~${BULK_MAX_ROWS}행을 보내 주세요.`);
  }

  const { rows, hasErrors } = validateBulkRows(parsed.data.rows);
  if (hasErrors) {
    const rowErrors = rows
      .filter((row) => row.errors.length > 0)
      .map((row) => ({ line: row.line, errors: row.errors }));
    return adminFail(400, `[행 ${rowErrors[0].line}] ${rowErrors[0].errors[0]}`, { row_errors: rowErrors });
  }

  try {
    return adminOk({ data: await bulkRegister(rows) });
  } catch (error) {
    return adminError("api/admin/bulk-register", error);
  }
}
