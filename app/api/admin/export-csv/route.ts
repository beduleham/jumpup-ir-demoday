import type { NextRequest } from "next/server";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { fetchDashboard, fetchInvestmentRows } from "@/lib/admin-data";
import { adminError } from "@/lib/admin-http";
import { buildResultsCsv, resultsCsvFilename } from "@/lib/results-csv";

export const dynamic = "force-dynamic";

// 최종 순위표와 상세 투자 매트릭스를 엑셀에서 바로 열리는 CSV(UTF-8 BOM)로 내려준다.
export async function GET(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  try {
    const [dashboard, investments] = await Promise.all([fetchDashboard(), fetchInvestmentRows()]);
    return new Response(buildResultsCsv(dashboard, investments), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${resultsCsvFilename()}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return adminError("api/admin/export-csv", error);
  }
}
