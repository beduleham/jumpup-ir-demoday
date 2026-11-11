"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT, PANEL } from "@/components/admin/styles";
import { RESET_CONFIRMATION, REVEAL_STEP_LABELS, type AdminSettings } from "@/types/admin";

const LAST_STEP = REVEAL_STEP_LABELS.length - 1;

/** 시상 연출 단계, CSV 내보내기, 리허설 초기화. */
export function AdminToolbox({
  settings,
  busy,
  onRevealStep,
  onReset,
}: {
  settings: AdminSettings;
  busy: boolean;
  onRevealStep: (step: number) => void;
  /** 초기화를 실행하고, 실패하면 보여 줄 오류 문구를 돌려준다(성공이면 null). */
  onReset: () => Promise<string | null>;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const revealed = settings.status === "revealed";

  function closeReset() {
    setResetOpen(false);
    setConfirmation("");
    setResetError(null);
  }

  async function runReset() {
    setResetting(true);
    setResetError(null);
    const error = await onReset();
    setResetting(false);
    if (error === null) closeReset();
    else setResetError(error);
  }

  return (
    <section aria-labelledby="tools-title" className={PANEL}>
      <h2 id="tools-title" className="text-h2 text-text">
        운영 도구
      </h2>

      <h3 className="mt-3 text-h3 text-text">시상 연출 단계</h3>
      {revealed ? (
        <>
          <p aria-live="polite" className="mt-1 text-text">
            현재 {settings.reveal_step}단계 ·{" "}
            <strong>{REVEAL_STEP_LABELS[settings.reveal_step] ?? "추가 단계"}</strong>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || settings.reveal_step <= 0}
              onClick={() => onRevealStep(settings.reveal_step - 1)}
              className={BUTTON_SECONDARY}
            >
              이전 단계
            </button>
            <button
              type="button"
              disabled={busy || settings.reveal_step >= LAST_STEP}
              onClick={() => onRevealStep(settings.reveal_step + 1)}
              className={BUTTON_PRIMARY}
            >
              다음 연출 단계
            </button>
          </div>
        </>
      ) : (
        <p className="mt-1 text-text-muted">결과 공개 단계에서 사용할 수 있습니다.</p>
      )}

      <h3 className="mt-4 text-h3 text-text">데이터</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href="/api/admin/export-csv" download className={BUTTON_SECONDARY}>
          <Download aria-hidden="true" size={20} strokeWidth={2} />
          결과 CSV 다운로드
        </a>
        <button type="button" onClick={() => setResetOpen(true)} className={BUTTON_SECONDARY}>
          <Trash2 aria-hidden="true" size={20} strokeWidth={2} />
          리허설 투자 초기화
        </button>
      </div>

      {resetOpen ? (
        <Modal title="리허설 투자 초기화" onClose={closeReset}>
          <p className="mt-2 text-text">
            등록된 기업과 참가자 정보는 유지되며, 모든 모의 투자 기록(금액)만 영구 삭제됩니다.
            계속하시겠습니까?
          </p>
          <p className="mt-2 text-text-muted">대회 단계도 &lsquo;준비&rsquo;로 돌아갑니다. 되돌릴 수 없습니다.</p>
          <label htmlFor="reset-confirmation" className="mt-3 block text-text">
            계속하려면 <strong>{RESET_CONFIRMATION}</strong>을 입력하세요.
          </label>
          <input
            id="reset-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            className={`${INPUT} mt-2 w-full`}
          />
          {resetError ? (
            <p role="alert" className="mt-3 rounded-md bg-danger-surface p-3 text-danger">
              {resetError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeReset} disabled={resetting} className={BUTTON_SECONDARY}>
              취소
            </button>
            <button
              type="button"
              onClick={runReset}
              disabled={resetting || confirmation !== RESET_CONFIRMATION}
              className={BUTTON_DANGER}
            >
              {resetting ? "초기화하는 중…" : "초기화 실행"}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
