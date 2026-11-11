import { AuthPrompt } from "@/components/home/AuthPrompt";
import { BudgetSummaryBar } from "@/components/home/BudgetSummaryBar";
import { CurrentPitchCard } from "@/components/home/CurrentPitchCard";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeLoadFailure } from "@/components/home/HomeLoadFailure";
import { StateHeroBanner } from "@/components/home/StateHeroBanner";
import { StateWatcher } from "@/components/home/StateWatcher";
import { TeamList } from "@/components/home/TeamList";
import { fetchPublicState, fetchPublicTeams } from "@/lib/competition-state";
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

export default async function HomePage() {
  const session = readSessionInvestor();
  const data = await loadHomeData();

  if (!data) {
    return (
      <div className="mx-auto min-h-screen max-w-md">
        <HomeHeader />
        <main className="p-4">
          <HomeLoadFailure />
        </main>
      </div>
    );
  }

  const { state, teams } = data;

  return (
    <div className="mx-auto min-h-screen max-w-md">
      <HomeHeader />
      {session ? <BudgetSummaryBar session={session} budgetUnits={state.budget_units} /> : null}
      <main className="flex flex-col gap-3 p-4">
        {session ? null : <AuthPrompt />}
        <StateHeroBanner status={state.status} />
        {state.status === "pitching" && state.current_pitch_team ? (
          <CurrentPitchCard team={state.current_pitch_team} />
        ) : null}
        <TeamList teams={teams} />
      </main>
      <StateWatcher snapshot={stateSnapshot(state)} statusLabel={STATUS_LABELS[state.status]} />
    </div>
  );
}
