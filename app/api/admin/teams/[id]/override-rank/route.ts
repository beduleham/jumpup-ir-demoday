import type { NextRequest } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { overrideTeamRank } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const requestSchema = z.object({ manual_rank_override: z.number().int().min(1).max(99).nullable() });

// 동점 등으로 자동 순위를 바꿔야 할 때 관리자가 순위를 직접 지정하거나(null이면) 해제한다.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const id = idSchema.safeParse(params.id);
  const parsed = requestSchema.safeParse(await readJson(request));
  if (!id.success || !parsed.success) return adminFail(400, "요청 형식이 올바르지 않습니다.");

  try {
    await overrideTeamRank(id.data, parsed.data.manual_rank_override);
    return adminOk();
  } catch (error) {
    return adminError("api/admin/teams/override-rank", error);
  }
}
