import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { hasAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "관리자 콘솔 | 모의 IR 데모데이",
  robots: { index: false, follow: false },
};

// 관리자 세션이 없으면 로그인 폼만 보여 준다. 데이터는 모두 관리자 전용 API가 다시 검증해 내려준다.
export default function AdminPage() {
  return hasAdminSession() ? <AdminConsole /> : <AdminLoginForm />;
}
