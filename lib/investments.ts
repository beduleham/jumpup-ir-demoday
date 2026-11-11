import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import {
  setInvestmentDataSchema,
  type MyInvestmentsData,
  type SetInvestmentData,
} from "@/types/investment";

// 투자 원장 접근. investments는 브라우저 역할이 읽고 쓸 수 없으므로 서버가 특권 클라이언트로 처리한다.
// investorId는 반드시 검증된 세션에서 꺼낸 값이어야 한다(요청 본문의 값을 넘기지 말 것).

/** DB가 규칙 위반으로 거절한 투자 요청. message는 사용자에게 그대로 보여도 되는 문구다. */
export class InvestmentRejected extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// set_investment가 RAISE EXCEPTION으로 알리는 규칙 위반과 그에 맞는 HTTP 상태.
const REJECTIONS: ReadonlyArray<readonly [needle: string, status: number]> = [
  ["자기 소속 기업에는 투자할 수 없습니다", 403],
  ["한도", 400],
  ["투자 오픈 상태가 아닙니다", 409],
  ["유효하지 않은 투자자", 401],
  ["대상 기업이 존재하지 않습니다", 404],
  ["투자 금액은 0 이상", 400],
];

// plpgsql의 RAISE EXCEPTION 기본 SQLSTATE
const RAISE_EXCEPTION = "P0001";

export async function setInvestment(
  investorId: string,
  teamId: string,
  targetUnits: number,
): Promise<SetInvestmentData> {
  const supabase = createServiceClient();
  const result = await supabase.rpc("set_investment", {
    p_investor_id: investorId,
    p_team_id: teamId,
    p_target_units: targetUnits,
  });

  if (result.error) {
    const { code, message } = result.error;
    const rejection = code === RAISE_EXCEPTION ? REJECTIONS.find(([needle]) => message.includes(needle)) : undefined;
    if (rejection) throw new InvestmentRejected(message, rejection[1]);
    throw new Error(`set_investment 실패: ${message}`);
  }

  return setInvestmentDataSchema.parse(result.data);
}

export async function fetchMyInvestments(investorId: string): Promise<MyInvestmentsData> {
  const supabase = createServiceClient();

  const [investments, settings] = await Promise.all([
    supabase.from("investments").select("team_id, amount_units").eq("investor_id", investorId),
    supabase.from("settings").select("budget_units").limit(1).maybeSingle(),
  ]);
  if (investments.error) throw new Error(`투자 내역 조회 실패: ${investments.error.message}`);
  if (settings.error) throw new Error(`settings 조회 실패: ${settings.error.message}`);
  if (!settings.data) throw new Error("settings 레코드가 없습니다.");

  const allocations = investments.data.map((row) => ({
    team_id: row.team_id,
    amount_units: row.amount_units,
  }));
  const total = allocations.reduce((sum, item) => sum + item.amount_units, 0);

  return {
    investor_id: investorId,
    total_invested_units: total,
    remaining_units: settings.data.budget_units - total,
    allocations,
  };
}
