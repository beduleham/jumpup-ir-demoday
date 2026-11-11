"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT } from "@/components/admin/styles";
import type { AdminTeam } from "@/types/admin";

const SPINNER =
  "block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none";

/** 한 기업의 최종 순위를 직접 정하거나 자동 정렬로 되돌린다. 저장이 끝나면 부모가 닫는다. */
export function RankOverrideModal({
  team,
  teamCount,
  busy,
  error,
  onSave,
  onClose,
}: {
  team: AdminTeam;
  teamCount: number;
  busy: boolean;
  /** 직전 저장이 실패했을 때 보여 줄 문구 */
  error: string | null;
  onSave: (rank: number | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(team.manual_rank_override === null ? "" : String(team.manual_rank_override));
  const rank = Number(value);
  const valid = value !== "" && Number.isInteger(rank) && rank >= 1 && rank <= teamCount;

  return (
    <Modal title={`${team.team_no}번 ${team.company_name} 순위 보정`} onClose={onClose} locked={busy}>
      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-danger-surface p-3 text-danger">
          {error}
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-text">
        <dt className="text-text-muted">현재 최종 순위</dt>
        <dd className="font-semibold">
          {team.final_rank}위{team.manual_rank_override !== null ? " (수동)" : ""}
        </dd>
        <dt className="text-text-muted">자동 정렬 순위</dt>
        <dd>{team.calculated_rank}위</dd>
        <dt className="text-text-muted">총 유치액</dt>
        <dd>{team.total_raised_units}억 원</dd>
        <dt className="text-text-muted">유치 건수</dt>
        <dd>{team.investor_count}건</dd>
        <dt className="text-text-muted">외부 투자 유치액</dt>
        <dd>{team.external_raised_units}억 원</dd>
      </dl>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !busy) onSave(rank);
        }}
      >
        <label htmlFor="rank-override" className="block text-text">
          지정할 순위 (1~{teamCount})
        </label>
        <input
          id="rank-override"
          type="number"
          min={1}
          max={teamCount}
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
          aria-invalid={value !== "" && !valid}
          aria-describedby="rank-override-help"
          className={`${INPUT} mt-2 w-full`}
        />
        <p id="rank-override-help" className="mt-2 text-caption text-text-muted">
          같은 순위를 여러 기업에 지정하면 공동 순위로 표시됩니다.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy || team.manual_rank_override === null}
            onClick={() => onSave(null)}
            className={BUTTON_SECONDARY}
          >
            자동 정렬로 초기화
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={BUTTON_SECONDARY}>
            취소
          </button>
          <button type="submit" disabled={busy || !valid} className={BUTTON_PRIMARY}>
            {busy ? <span aria-hidden="true" className={SPINNER} /> : null}
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
