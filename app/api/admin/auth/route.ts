import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminCookie, isAdminPassword } from "@/lib/admin-auth";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ password: z.string().min(1).max(200) });

// 로그인 전 누구나 호출할 수 있다. 비밀번호가 맞을 때만 관리자 세션 쿠키를 준다.
export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return adminFail(400, "요청 형식이 올바르지 않습니다.");

  try {
    if (!isAdminPassword(parsed.data.password)) return adminFail(401, "비밀번호가 일치하지 않습니다.");
    const response = adminOk();
    response.cookies.set(adminCookie());
    return response;
  } catch (error) {
    return adminError("api/admin/auth", error);
  }
}
