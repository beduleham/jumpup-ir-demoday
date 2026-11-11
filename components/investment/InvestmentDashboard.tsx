"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HomeErrorView } from "@/components/home/HomeErrorView";
import { BudgetHeader } from "@/components/investment/BudgetHeader";
import { TeamInvestmentCard } from "@/components/investment/TeamInvestmentCard";
import type { CompetitionStatus, PublicTeam, SessionInvestor } from "@/types/competition";
import { myInvestmentsResponseSchema, setInvestmentResponseSchema } from "@/types/investment";

type Allocations = Record<string, number>;
type LoadState = "loading" | "ready" | "error";

const NETWORK_ERROR = "투자 반영에 실패했습니다. 다시 시도해주세요.";
const LIMIT_REACHED = "가상 투자금 한도를 모두 소진했습니다. 더 투자하려면 다른 기업의 금액을 줄여 주세요.";
const TOAST_MS = 4000;

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function fetchMyAllocations(): Promise<Allocations> {
  const response = await fetch("/api/investments/mine", { cache: "no-store" });
  const body = myInvestmentsResponseSchema.parse(await response.json());
  if (!body.success) throw new RequestError(body.error, response.status);
  return Object.fromEntries(body.data.allocations.map((item) => [item.team_id, item.amount_units]));
}

async function saveAllocation(teamId: string, targetUnits: number): Promise<void> {
  const response = await fetch("/api/investments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_id: teamId, target_units: targetUnits }),
  });
  const body = setInvestmentResponseSchema.parse(await response.json());
  if (!body.success) throw new RequestError(body.error, response.status);
}

function total(allocations: Allocations): number {
  return Object.values(allocations).reduce((sum, units) => sum + units, 0);
}

/**
 * 로그인한 참가자의 투자 화면. 탭하면 화면에 먼저 반영하고(낙관적 갱신),
 * 서버에는 한 번에 하나씩 "이 기업을 N억으로" 요청을 보낸다. 서버가 거절하면 서버 값으로 되돌린다.
 */
export function InvestmentDashboard({
  investor,
  teams,
  status,
  budgetUnits,
}: {
  investor: SessionInvestor;
  teams: PublicTeam[];
  status: CompetitionStatus;
  budgetUnits: number;
}) {
  const router = useRouter();
  const [allocations, setAllocations] = useState<Allocations>({});
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // desired: 화면에 보이는 값, confirmed: 서버가 확정한 값. 둘의 차이가 아직 보내지 않은 변경이다.
  const desired = useRef<Allocations>({});
  const confirmed = useRef<Allocations>({});
  const flushing = useRef(false);

  const show = useCallback((next: Allocations) => {
    desired.current = next;
    setAllocations(next);
  }, []);

  const load = useCallback(async () => {
    try {
      const server = await fetchMyAllocations();
      confirmed.current = server;
      show(server);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        // 세션이 만료되었다. 서버가 로그인 화면을 다시 그리게 한다.
        router.refresh();
        return;
      }
      console.error("[invest] 내 투자 내역 조회 실패", error);
      setLoadState("error");
    }
  }, [router, show]);

  // 처음 들어올 때와 대회 단계가 바뀔 때(마감, 리허설 초기화 등) 서버 값으로 맞춘다.
  useEffect(() => {
    void load();
  }, [load, status]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setSaving(true);
    let sentAny = false;
    try {
      for (;;) {
        const dirty = Object.keys({ ...desired.current, ...confirmed.current }).filter(
          (id) => (desired.current[id] ?? 0) !== (confirmed.current[id] ?? 0),
        );
        if (dirty.length === 0) {
          // 보낼 변경이 더 없고 서버가 확정한 합계가 한도에 닿았으면 배분이 끝났음을 알린다.
          if (sentAny && total(confirmed.current) >= budgetUnits) {
            setToast(`가상 투자금 ${budgetUnits}억 원을 모두 배분했습니다.`);
          }
          return;
        }

        // 줄이는 변경을 먼저 보내야, 서버가 보는 합계가 중간에 한도를 넘지 않는다.
        const teamId =
          dirty.find((id) => (desired.current[id] ?? 0) < (confirmed.current[id] ?? 0)) ?? dirty[0];
        const target = desired.current[teamId] ?? 0;

        try {
          await saveAllocation(teamId, target);
          confirmed.current = { ...confirmed.current, [teamId]: target };
          sentAny = true;
        } catch (error) {
          const known = error instanceof RequestError;
          if (!known) console.error("[invest] 투자 저장 실패", error);
          setToast(known ? error.message : NETWORK_ERROR);
          // 화면을 서버가 확정한 값으로 되돌리고, 가능하면 최신 값을 다시 받는다.
          show({ ...confirmed.current });
          await load();
          if (known && error.status === 409) router.refresh();
          return;
        }
      }
    } finally {
      flushing.current = false;
      setSaving(false);
    }
  }, [budgetUnits, load, router, show]);

  const open = status === "open" && loadState === "ready";
  const investedUnits = total(allocations);

  function change(teamId: string, delta: 1 | -1) {
    if (!open) return;
    const current = desired.current[teamId] ?? 0;
    const next = current + delta;
    if (next < 0 || (delta > 0 && total(desired.current) >= budgetUnits)) return;
    show({ ...desired.current, [teamId]: next });
    void flush();
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      router.refresh();
    } catch (error) {
      console.error("[invest] 로그아웃 실패", error);
      setToast(NETWORK_ERROR);
    }
  }

  return (
    <section id="teams" aria-labelledby="invest-title" className="scroll-mt-4">
      <BudgetHeader
        investor={investor}
        status={status}
        budgetUnits={budgetUnits}
        investedUnits={investedUnits}
        saving={saving}
        onLogout={logout}
      />

      <h2 id="invest-title" className="mt-4 text-h2 text-text">
        투자 대상 기업
      </h2>
      {status === "open" ? null : (
        <p className="mt-1 text-text-muted">투자 오픈 단계에서만 금액을 바꿀 수 있습니다.</p>
      )}

      {loadState === "loading" ? (
        <p role="status" className="mt-3 rounded-xl border border-border bg-surface p-4 text-text-muted">
          내 투자 내역을 불러오는 중입니다…
        </p>
      ) : null}

      {loadState === "error" ? (
        <div className="mt-3">
          <HomeErrorView
            pending={false}
            onRetry={() => {
              setLoadState("loading");
              void load();
            }}
          />
        </div>
      ) : null}

      {loadState === "ready" && teams.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface p-4 text-center text-text">
          등록된 참여 기업이 없습니다. 잠시 후 새로고침 해주세요.
        </p>
      ) : null}

      {loadState === "ready" && teams.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-3">
          {teams.map((team) => {
            const units = allocations[team.id] ?? 0;
            return (
              <TeamInvestmentCard
                key={team.id}
                team={team}
                units={units}
                isOwnTeam={investor.team_id === team.id}
                canDecrease={open && units > 0}
                canIncrease={open && investedUnits < budgetUnits}
                limitReached={open && investedUnits >= budgetUnits}
                onChange={(delta) => change(team.id, delta)}
                onLimitTap={() => setToast(LIMIT_REACHED)}
              />
            );
          })}
        </ul>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
        {toast ? (
          <p className="pointer-events-auto max-w-md rounded-md bg-text px-4 py-3 text-surface shadow-lg">
            {toast}
          </p>
        ) : null}
      </div>
    </section>
  );
}
