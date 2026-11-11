import type { NextRequest } from "next/server";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { fetchDashboard } from "@/lib/admin-data";
import { adminError, adminOk } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

// 연락처와 공개 전 집계를 포함하므로 관리자만 읽을 수 있다.
export async function GET(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  try {
    return adminOk({ data: await fetchDashboard() });
  } catch (error) {
    return adminError("api/admin/dashboard", error);
  }
}
