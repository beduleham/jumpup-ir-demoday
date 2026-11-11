import { expiredAdminCookie } from "@/lib/admin-auth";
import { adminOk } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

// 이 브라우저의 관리자 세션 쿠키만 지운다. 세션이 없어도 결과는 같다.
export function POST() {
  const response = adminOk();
  response.cookies.set(expiredAdminCookie());
  return response;
}
