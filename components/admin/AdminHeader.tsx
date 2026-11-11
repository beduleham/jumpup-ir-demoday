"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT, PANEL } from "@/components/admin/styles";
import { isRevert, isSkip, STAGE_ORDER } from "@/lib/state-machine";
import type { AdminDashboard, UpdateSettingsRequest } from "@/types/admin";
import { STATUS_LABELS, type CompetitionStatus } from "@/types/competition";

function formatSeoulTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

/** 대회 단계 전환과 발표 기업 지정. */
export function AdminHeader({
  dashboard,
  busy,
  onChange,
}: {
  dashboard: AdminDashboard;
  busy: boolean;
  onChange: (patch: UpdateSettingsRequest) => void;
}) {
  const { settings, teams } = dashboard;
  const [confirming, setConfirming] = useState<CompetitionStatus | null>(null);
  const byNumber = [...teams].sort((a, b) => a.team_no - b.team_no);
  const pitchIndex = byNumber.findIndex((team) => team.id === settings.current_pitch_team_id);

  function selectStage(stage: CompetitionStatus) {
    if (stage === settings.status) return;
    // 투자가 열렸거나 끝난 뒤에 그 이전 단계로 되돌리는 것은 한 번 더 확인한다.
    if (isRevert(settings.status, stage)) setConfirming(stage);
    else onChange({ status: stage });
  }

  function movePitch(offset: number) {
    const next = byNumber[pitchIndex + offset];
    if (next) onChange({ current_pitch_team_id: next.id });
  }

  return (
    <section aria-labelledby="stage-title" className={PANEL}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stage-title" className="text-h2 text-text">
          대회 진행 단계
        </h2>
        <p className="text-caption text-text-muted">
          현재 <strong className="text-text">{STATUS_LABELS[settings.status]}</strong> · 마지막 변경{" "}
          {formatSeoulTime(settings.updated_at)}
        </p>
      </div>

      <ol className="mt-3 flex flex-wrap gap-2">
        {STAGE_ORDER.map((stage, index) => {
          const current = stage === settings.status;
          // 앞으로는 바로 다음 단계로만 갈 수 있다(서버도 같은 규칙으로 거절한다).
          const skipped = isSkip(settings.status, stage);
          return (
            <li key={stage}>
              <button
                type="button"
                disabled={busy || skipped}
                title={skipped ? "이전 단계를 먼저 거쳐야 합니다." : undefined}
                aria-current={current ? "step" : undefined}
                onClick={() => selectStage(stage)}
                className={current ? BUTTON_PRIMARY : BUTTON_SECONDARY}
              >
                {index + 1}. {STATUS_LABELS[stage]}
                {current ? <span className="sr-only"> (현재 단계)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>

      {settings.status === "pitching" ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor="pitch-team" className="text-caption font-semibold text-text-muted">
              현재 발표 기업
            </label>
            <select
              id="pitch-team"
              disabled={busy || byNumber.length === 0}
              value={settings.current_pitch_team_id ?? ""}
              onChange={(event) => onChange({ current_pitch_team_id: event.target.value || null })}
              className={`${INPUT} w-full`}
            >
              <option value="">지정 안 함</option>
              {byNumber.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_no}번 {team.company_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || pitchIndex <= 0}
            onClick={() => movePitch(-1)}
            className={BUTTON_SECONDARY}
          >
            <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
            이전 기업
          </button>
          <button
            type="button"
            disabled={busy || pitchIndex >= byNumber.length - 1}
            onClick={() => movePitch(1)}
            className={BUTTON_SECONDARY}
          >
            다음 기업
            <ChevronRight aria-hidden="true" size={20} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      {confirming ? (
        <Modal title="이전 단계로 되돌리기" onClose={() => setConfirming(null)}>
          <p className="mt-2 text-text">
            이미 투자가 진행되었거나 마감되었습니다. 이전 상태로 되돌리시겠습니까? (기존 투자 내역은
            유지됩니다)
          </p>
          <p className="mt-2 text-text-muted">
            {STATUS_LABELS[settings.status]} → {STATUS_LABELS[confirming]}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(null)} className={BUTTON_SECONDARY}>
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ status: confirming, confirm_revert: true });
                setConfirming(null);
              }}
              className={BUTTON_PRIMARY}
            >
              확인
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
