"use client";

import { Download, RotateCcw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { BUTTON_DANGER, BUTTON_SECONDARY, INPUT, PANEL } from "@/components/admin/styles";
import { RESET_CONFIRMATION } from "@/types/admin";

const SPINNER =
  "block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none";

/** 서버가 만든 CSV를 받아 브라우저의 파일 저장으로 넘긴다. */
async function downloadResultsCsv(): Promise<void> {
  const response = await fetch("/api/admin/export-csv", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const filename =
    /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "jumpup_ir_results.csv";

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** 결과 CSV 내보내기와 리허설 초기화. */
export function AdminToolbox({
  onReset,
  onNotice,
}: {
  /** 초기화를 실행하고 성공 여부를 돌려준다. */
  onReset: () => Promise<boolean>;
  /** 화면 아래 알림으로 보여 줄 문구 */
  onNotice: (message: string) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadResultsCsv();
      onNotice("결과 CSV 파일이 성공적으로 다운로드되었습니다.");
    } catch (error) {
      console.error("[admin] CSV 내보내기 실패", error);
      onNotice("CSV 파일 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setExporting(false);
    }
  }

  function closeReset() {
    if (resetting) return;
    setResetOpen(false);
    setConfirmation("");
    setResetFailed(false);
  }

  async function runReset() {
    if (resetting || confirmation !== RESET_CONFIRMATION) return;
    setResetting(true);
    setResetFailed(false);
    const ok = await onReset();
    setResetting(false);
    if (ok) {
      setResetOpen(false);
      setConfirmation("");
      onNotice("모의 투자 데이터가 성공적으로 초기화되었습니다.");
    } else {
      setResetFailed(true);
    }
  }

  return (
    <section aria-labelledby="tools-title" className={PANEL}>
      <h2 id="tools-title" className="text-h2 text-text">
        운영 도구
      </h2>

      <h3 className="mt-3 text-h3 text-text">데이터 관리 및 리허설 제어</h3>
      <p className="mt-1 text-text-muted">
        결과 CSV에는 최종 순위 요약과 투자자별 상세 배분표가 들어 있습니다. 엑셀에서 바로 열 수 있습니다.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={exportCsv} disabled={exporting} className={BUTTON_SECONDARY}>
          {exporting ? (
            <>
              <span aria-hidden="true" className={SPINNER} />
              CSV 생성 중...
            </>
          ) : (
            <>
              <Download aria-hidden="true" size={20} strokeWidth={2} />
              결과 데이터 CSV 다운로드
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className={`${BUTTON_SECONDARY} border-danger text-danger`}
        >
          <RotateCcw aria-hidden="true" size={20} strokeWidth={2} />
          리허설 투자 데이터 초기화
        </button>
      </div>

      {resetOpen ? (
        <Modal title="리허설 투자 데이터 초기화" onClose={closeReset} locked={resetting}>
          {resetFailed ? (
            <p role="alert" className="mt-3 rounded-md bg-danger-surface p-3 text-danger">
              초기화 처리에 실패했습니다. 관리자 세션을 확인 후 다시 시도해주세요.
            </p>
          ) : null}
          <p className="mt-2 text-text-muted">
            현재까지 기록된 모든 모의 투자 내역이 영구 삭제되며, 대회 상태가 &lsquo;준비&rsquo; 단계로
            되돌아갑니다. 등록된 기업 및 투자자 명단은 안전하게 유지됩니다.
          </p>
          <p className="mt-3 flex items-center gap-2 rounded-md bg-warning-surface p-3 font-semibold text-warning">
            <TriangleAlert aria-hidden="true" size={20} strokeWidth={2} className="shrink-0" />
            이 작업은 되돌릴 수 없습니다.
          </p>
          <label htmlFor="reset-confirmation" className="mt-3 block text-text">
            계속하려면 <strong>{RESET_CONFIRMATION}</strong>을 입력하세요.
          </label>
          <input
            id="reset-confirmation"
            value={confirmation}
            placeholder={`"${RESET_CONFIRMATION}" 입력`}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={resetting}
            autoComplete="off"
            className={`${INPUT} mt-2 w-full`}
          />
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
              {resetting ? (
                <>
                  <span aria-hidden="true" className={SPINNER} />
                  초기화 진행 중...
                </>
              ) : (
                "데이터 완전 초기화"
              )}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
