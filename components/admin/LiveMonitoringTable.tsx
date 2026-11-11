"use client";

import { useState } from "react";
import { RankOverrideModal } from "@/components/admin/RankOverrideModal";
import { BUTTON_SECONDARY, PANEL, TABLE_CELL, TABLE_HEAD } from "@/components/admin/styles";
import { tiedTeamNumbers } from "@/lib/ranking";
import type { AdminTeam } from "@/types/admin";

const BADGE = "ml-1 rounded-sm px-1 text-caption";

/** 기업별 유치 현황과 순위. 순위 보정에서 수동 순위를 넣으면 자동 순위 대신 그 순위가 쓰인다. */
export function LiveMonitoringTable({
  teams,
  busy,
  showTies,
  onOverrideRank,
}: {
  teams: AdminTeam[];
  busy: boolean;
  /** 투자가 끝나 집계가 확정된 뒤에만 동점을 표시한다(투자 중에는 계속 바뀐다). */
  showTies: boolean;
  /** 순위를 저장한다. 실패하면 보여 줄 문구를, 성공하면 null을 돌려준다. */
  onOverrideRank: (teamId: string, rank: number | null) => Promise<string | null>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editing = teams.find((team) => team.id === editingId);
  const tied = showTies ? tiedTeamNumbers(teams) : new Set<number>();
  // 동점인데 아직 순위를 정하지 않은 기업이 있으면 시상 전에 확인하도록 알린다.
  const unresolved = teams.filter((team) => tied.has(team.team_no) && team.manual_rank_override === null).length;

  return (
    <section aria-labelledby="teams-title" className={PANEL}>
      <h2 id="teams-title" className="text-h2 text-text">
        기업별 유치 현황
      </h2>
      <p className="mt-1 text-caption text-text-muted">
        자동 순위: 유치액 → 투자자 수 → 외부 유치액 → 기업 번호. 단위는 억 원입니다.
      </p>
      {unresolved > 0 ? (
        <p role="status" className="mt-2 rounded-md bg-warning-surface p-3 text-warning">
          유치액·투자자 수·외부 유치액이 모두 같은 기업이 {unresolved}곳 있습니다. 지금은 기업 번호순으로
          순위가 정해져 있으니, 필요하면 [순위 보정]으로 직접 지정해 주세요.
        </p>
      ) : null}
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="teams-title">
        <table className="w-full min-w-[640px] border-collapse text-body text-text">
          <thead>
            <tr>
              <th scope="col" className={TABLE_HEAD}>최종</th>
              <th scope="col" className={TABLE_HEAD}>자동</th>
              <th scope="col" className={TABLE_HEAD}>번호</th>
              <th scope="col" className={TABLE_HEAD}>기업명</th>
              <th scope="col" className={TABLE_HEAD}>대표자</th>
              <th scope="col" className={`${TABLE_HEAD} text-right`}>유치액</th>
              <th scope="col" className={`${TABLE_HEAD} text-right`}>투자자 수</th>
              <th scope="col" className={`${TABLE_HEAD} text-right`}>외부 유치</th>
              <th scope="col" className={TABLE_HEAD}>순위 보정</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <td className={`${TABLE_CELL} whitespace-nowrap text-h3 font-semibold`}>
                  {team.final_rank}
                  {team.manual_rank_override !== null ? (
                    <span className={`${BADGE} bg-warning-surface text-warning`}>수동</span>
                  ) : null}
                  {tied.has(team.team_no) ? (
                    <span className={`${BADGE} bg-danger-surface text-danger`}>동점</span>
                  ) : null}
                </td>
                <td className={`${TABLE_CELL} text-text-muted`}>{team.calculated_rank}</td>
                <td className={TABLE_CELL}>{team.team_no}</td>
                <td className={TABLE_CELL}>{team.company_name}</td>
                <td className={TABLE_CELL}>{team.leader_name}</td>
                <td className={`${TABLE_CELL} text-right font-semibold`}>{team.total_raised_units}</td>
                <td className={`${TABLE_CELL} text-right`}>{team.investor_count}</td>
                <td className={`${TABLE_CELL} text-right`}>{team.external_raised_units}</td>
                <td className={TABLE_CELL}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSaveError(null);
                      setEditingId(team.id);
                    }}
                    aria-label={`${team.company_name} 순위 보정`}
                    className={BUTTON_SECONDARY}
                  >
                    순위 보정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <RankOverrideModal
          team={editing}
          teamCount={teams.length}
          busy={busy}
          error={saveError}
          onClose={() => setEditingId(null)}
          onSave={async (rank) => {
            const error = await onOverrideRank(editing.id, rank);
            setSaveError(error);
            if (error === null) setEditingId(null);
          }}
        />
      ) : null}
    </section>
  );
}
