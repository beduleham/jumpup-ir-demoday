"use client";

import { useState } from "react";
import { BUTTON_SECONDARY, INPUT, PANEL, TABLE_CELL, TABLE_HEAD } from "@/components/admin/styles";
import type { AdminTeam } from "@/types/admin";

function RankOverride({
  team,
  busy,
  onSave,
}: {
  team: AdminTeam;
  busy: boolean;
  onSave: (teamId: string, rank: number | null) => void;
}) {
  const saved = team.manual_rank_override === null ? "" : String(team.manual_rank_override);
  const [value, setValue] = useState(saved);
  const rank = value === "" ? null : Number(value);
  const valid = rank === null || (Number.isInteger(rank) && rank >= 1 && rank <= 99);

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave(team.id, rank);
      }}
    >
      <input
        type="number"
        min={1}
        max={99}
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={`${team.company_name} 수동 순위 (비우면 자동 순위)`}
        aria-invalid={!valid}
        className={`${INPUT} w-16`}
      />
      <button type="submit" disabled={busy || !valid || value === saved} className={BUTTON_SECONDARY}>
        저장
      </button>
    </form>
  );
}

/** 기업별 유치 현황과 순위. 수동 순위를 넣으면 자동 순위 대신 그 순위가 쓰인다. */
export function LiveMonitoringTable({
  teams,
  busy,
  onOverrideRank,
}: {
  teams: AdminTeam[];
  busy: boolean;
  onOverrideRank: (teamId: string, rank: number | null) => void;
}) {
  return (
    <section aria-labelledby="teams-title" className={PANEL}>
      <h2 id="teams-title" className="text-h2 text-text">
        기업별 유치 현황
      </h2>
      <p className="mt-1 text-caption text-text-muted">
        자동 순위: 유치액 → 투자자 수 → 외부 유치액 → 기업 번호. 단위는 억 원입니다.
      </p>
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
              <th scope="col" className={TABLE_HEAD}>수동 순위</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <td className={`${TABLE_CELL} text-h3 font-semibold`}>
                  {team.final_rank}
                  {team.manual_rank_override !== null ? (
                    <span className="ml-1 rounded-sm bg-warning-surface px-1 text-caption text-warning">수동</span>
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
                  {/* 저장된 값이 바뀌면 입력 칸을 새 값으로 다시 만든다. */}
                  <RankOverride
                    key={team.manual_rank_override ?? "auto"}
                    team={team}
                    busy={busy}
                    onSave={onOverrideRank}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
