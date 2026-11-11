import { redirect } from "next/navigation";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { TokenLogin } from "@/components/auth/TokenLogin";
import { CurrentPitchCard } from "@/components/home/CurrentPitchCard";
import { HomeLoadFailure } from "@/components/home/HomeLoadFailure";
import { StateHeroBanner } from "@/components/home/StateHeroBanner";
import { StateWatcher } from "@/components/home/StateWatcher";
import { TeamList } from "@/components/home/TeamList";
import { InvestmentDashboard } from "@/components/investment/InvestmentDashboard";
import { ParticipantResultSummary } from "@/components/results/ParticipantResultSummary";
import { fetchPublicState, fetchPublicTeams } from "@/lib/competition-state";
import { mobileResultsVisible } from "@/lib/reveal";
import { readSessionInvestor } from "@/lib/session";
import {
  STATUS_LABELS,
  stateSnapshot,
  type PublicState,
  type PublicTeam,
} from "@/types/competition";

// 대회 상태와 세션 쿠키에 따라 매 요청마다 달라지는 화면이다.
export const dynamic = "force-dynamic";

async function loadHomeData(): Promise<{ state: PublicState; teams: PublicTeam[] } | null> {
  try {
    const [state, teams] = await Promise.all([fetchPublicState(), fetchPublicTeams()]);
    return { state, teams };
  } catch (error) {
    console.error("[home] 대회 상태 조회 실패", error);
    return null;
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { token?: string | string[] };
}) {
  const session = readSessionInvestor();
  const token = typeof searchParams.token === "string" ? searchParams.token : null;

  // 이미 로그인한 기기에서는 초대 토큰을 쓰지 않고 주소만 정리한다.
  if (session && token) redirect("/");

  const data = await loadHomeData();

  if (!data) {
    return (
      <main className="p-4">
        <HomeLoadFailure />
      </main>
    );
  }

  const { state, teams } = data;

  return (
    <>
      <main className="flex flex-col gap-3 p-4">
        {session ? null : token ? <TokenLogin token={token} /> : <PhoneLoginForm />}
        <StateHeroBanner status={state.status} />
        {state.status === "pitching" && state.current_pitch_team ? (
          <CurrentPitchCard team={state.current_pitch_team} />
        ) : null}
        {session && mobileResultsVisible(state.status) ? (
          <ParticipantResultSummary investor={session} version={state.updated_at} />
        ) : null}
        {session ? (
          <InvestmentDashboard
            investor={session}
            teams={teams}
            status={state.status}
            budgetUnits={state.budget_units}
          />
        ) : (
          <TeamList teams={teams} />
        )}
      </main>
      <StateWatcher snapshot={stateSnapshot(state)} statusLabel={STATUS_LABELS[state.status]} />
    </>
  );
}
