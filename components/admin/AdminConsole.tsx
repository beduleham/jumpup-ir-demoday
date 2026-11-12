"use client";

import { Upload, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminToolbox } from "@/components/admin/AdminToolbox";
import { BulkRegisterModal, type BulkSubmitResult } from "@/components/admin/BulkRegisterModal";
import { InvestorStatusList } from "@/components/admin/InvestorStatusList";
import { LiveMonitoringTable } from "@/components/admin/LiveMonitoringTable";
import { RevealStepController } from "@/components/admin/RevealStepController";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, PANEL } from "@/components/admin/styles";
import { useNetworkStatus } from "@/hooks/use-network-status";
import type { BulkRegisterRow } from "@/lib/bulk-parse";
import {
  adminDashboardSchema,
  RESET_CONFIRMATION,
  ROSTER_RESET_CONFIRMATION,
  type AdminDashboard,
  type UpdateSettingsRequest,
} from "@/types/admin";

const POLL_INTERVAL_MS = 2000;
const TOAST_MS = 5000;
const CONNECTION_ERROR = "서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.";

const REALTIME_FAILED =
  "변경은 저장되었지만 실시간 알림을 보내지 못했습니다. 참가자 화면 반영이 몇 초 늦을 수 있습니다.";

const failureSchema = z.object({ error: z.string() });
const realtimeFailedSchema = z.object({ realtime: z.literal("failed") });
const bulkResultSchema = z.object({
  data: z.object({ registered_teams_count: z.number(), registered_investors_count: z.number() }),
});

type Problem = "session" | "connection" | null;

type SendResult = { ok: true; body: unknown } | { ok: false; error: string };

/** 관리자 콘솔 본체: 대시보드를 주기적으로 새로 읽고, 모든 변경 요청을 서버로 보낸다. */
export function AdminConsole() {
  const router = useRouter();
  const online = useNetworkStatus();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const loading = useRef(false);

  const refresh = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        setProblem("session");
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      setDashboard(adminDashboardSchema.parse(z.object({ data: z.unknown() }).parse(body).data));
      setProblem(null);
    } catch (error) {
      console.error("[admin] 대시보드 조회 실패", error);
      setProblem("connection");
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  /** 변경 요청을 보내고, 끝나면 대시보드를 새로 읽는다. */
  const send = useCallback(
    async (method: "POST" | "PATCH", path: string, payload: unknown): Promise<SendResult> => {
      setBusy(true);
      try {
        const response = await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body: unknown = await response.json();
        if (response.ok) {
          await refresh();
          return { ok: true, body };
        }
        if (response.status === 401) setProblem("session");
        const failure = failureSchema.safeParse(body);
        return { ok: false, error: failure.success ? failure.data.error : CONNECTION_ERROR };
      } catch (error) {
        console.error("[admin] 요청 실패", path, error);
        return { ok: false, error: CONNECTION_ERROR };
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  async function changeSettings(patch: UpdateSettingsRequest) {
    const result = await send("POST", "/api/admin/settings", patch);
    if (!result.ok) setToast(result.error);
    else if (realtimeFailedSchema.safeParse(result.body).success) setToast(REALTIME_FAILED);
  }

  /** 실패하면 순위 보정 창에 보여 줄 문구를, 성공하면 null을 돌려준다. */
  async function overrideRank(teamId: string, rank: number | null): Promise<string | null> {
    const result = await send("PATCH", `/api/admin/teams/${teamId}/override-rank`, {
      manual_rank_override: rank,
    });
    if (!result.ok) return result.error;
    if (realtimeFailedSchema.safeParse(result.body).success) setToast(REALTIME_FAILED);
    else setToast(rank === null ? "자동 정렬 순위로 되돌렸습니다." : `수동 순위를 ${rank}위로 저장했습니다.`);
    return null;
  }

  async function registerBulk(rows: BulkRegisterRow[]): Promise<BulkSubmitResult> {
    const result = await send("POST", "/api/admin/bulk-register", { rows });
    if (!result.ok) return { ok: false, error: result.error };
    const counts = bulkResultSchema.parse(result.body).data;
    return { ok: true, teams: counts.registered_teams_count, investors: counts.registered_investors_count };
  }

  // 모달이 성공 후 스스로 닫히는 타이머를 걸므로, 다시 그려져도 같은 함수여야 한다.
  const closeBulk = useCallback(() => setBulkOpen(false), []);

  async function resetInvestments(): Promise<boolean> {
    const result = await send("POST", "/api/admin/reset-investments", { confirmation: RESET_CONFIRMATION });
    return result.ok;
  }

  async function resetRoster(): Promise<boolean> {
    const result = await send("POST", "/api/admin/reset-roster", { confirmation: ROSTER_RESET_CONFIRMATION });
    return result.ok;
  }

  async function logout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("[admin] 로그아웃 요청 실패", error);
    }
    router.refresh();
  }

  const empty = dashboard !== null && dashboard.teams.length === 0 && dashboard.investors.length === 0;

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {online ? null : (
          <p role="status" className="mr-auto inline-flex items-center gap-1 rounded-md bg-warning-surface px-3 py-2 font-semibold text-warning">
            <WifiOff aria-hidden="true" size={20} strokeWidth={2} />
            네트워크 연결 끊김 - 변경이 저장되지 않을 수 있습니다
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBulkOpen(true)} className={BUTTON_PRIMARY}>
            <Upload aria-hidden="true" size={20} strokeWidth={2} />
            엑셀/스프레드시트 일괄 등록
          </button>
          <button type="button" onClick={logout} className={BUTTON_SECONDARY}>
            로그아웃
          </button>
        </div>
      </div>

      {problem ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger-surface p-3 text-danger">
          <p>관리자 세션이 만료되었거나 서버 통신에 실패했습니다.</p>
          {problem === "session" ? (
            <button type="button" onClick={() => router.refresh()} className={BUTTON_SECONDARY}>
              다시 로그인
            </button>
          ) : (
            <button type="button" onClick={() => void refresh()} className={BUTTON_SECONDARY}>
              다시 시도
            </button>
          )}
        </div>
      ) : null}

      {dashboard === null ? (
        problem ? null : (
          <p role="status" className={`${PANEL} text-text-muted`}>
            대시보드를 불러오는 중입니다…
          </p>
        )
      ) : (
        <>
          <AdminHeader dashboard={dashboard} busy={busy} onChange={changeSettings} />

          {dashboard.settings.status === "revealed" ? (
            <RevealStepController
              step={dashboard.settings.reveal_step}
              busy={busy}
              onStep={(step) => void changeSettings({ reveal_step: step })}
            />
          ) : null}

          <section aria-label="투자 현황 요약" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className={PANEL}>
              <p className="text-caption font-semibold text-text-muted">투자 참여율</p>
              <p className="mt-1 text-h1 text-text">{dashboard.summary.participation_rate}%</p>
              <p className="text-caption text-text-muted">
                {dashboard.summary.participated_investors}명 / 전체 {dashboard.summary.total_investors}명
              </p>
            </div>
            <div className={PANEL}>
              <p className="text-caption font-semibold text-text-muted">총 투자 집계액</p>
              <p className="mt-1 text-h1 text-text">{dashboard.summary.total_invested_units}억 원</p>
            </div>
            <div className={PANEL}>
              <p className="text-caption font-semibold text-text-muted">배분을 마치지 않은 투자자</p>
              <p className="mt-1 text-h1 text-text">
                {dashboard.investors.filter((investor) => !investor.is_submitted).length}명
              </p>
            </div>
          </section>

          {empty ? (
            <section className={`${PANEL} text-center`}>
              <p className="text-h3 text-text">등록된 기업 및 투자자 데이터가 없습니다.</p>
              <p className="mt-1 text-text-muted">
                상단의 [엑셀/스프레드시트 일괄 등록] 버튼을 눌러 참가자를 등록해주세요.
              </p>
              <button type="button" onClick={() => setBulkOpen(true)} className={`${BUTTON_PRIMARY} mt-3`}>
                <Upload aria-hidden="true" size={20} strokeWidth={2} />
                엑셀/스프레드시트 일괄 등록
              </button>
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <LiveMonitoringTable
                  teams={dashboard.teams}
                  busy={busy}
                  showTies={dashboard.settings.status === "closed" || dashboard.settings.status === "revealed"}
                  onOverrideRank={overrideRank}
                />
              </div>
              <div className="min-w-0">
                <InvestorStatusList investors={dashboard.investors} />
              </div>
            </div>
          )}

          <AdminToolbox onReset={resetInvestments} onResetRoster={resetRoster} onNotice={setToast} />
        </>
      )}

      {bulkOpen ? <BulkRegisterModal onClose={closeBulk} onSubmit={registerBulk} /> : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
        {toast ? (
          <p className="pointer-events-auto max-w-md rounded-md bg-text px-4 py-3 text-surface shadow-lg">{toast}</p>
        ) : null}
      </div>
    </main>
  );
}
