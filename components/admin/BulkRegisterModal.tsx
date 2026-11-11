"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, TABLE_CELL, TABLE_HEAD } from "@/components/admin/styles";
import { parseBulkText } from "@/lib/bulk-parse";

/** 스프레드시트 6열을 붙여넣어 기업·투자자를 한 번에 등록한다. */
export function BulkRegisterModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  /** 등록을 실행하고, 실패하면 보여 줄 오류 문구를 돌려준다(성공이면 null). */
  onSubmit: (text: string) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { rows, hasErrors } = useMemo(() => parseBulkText(text), [text]);
  const errorCount = rows.filter((row) => row.errors.length > 0).length;

  async function submit() {
    setPending(true);
    setServerError(null);
    const error = await onSubmit(text);
    if (error === null) {
      onClose();
      return;
    }
    setServerError(error);
    setPending(false);
  }

  return (
    <Modal title="참가자 일괄 등록" onClose={onClose} wide>
      <label htmlFor="bulk-text" className="mt-2 block text-text">
        스프레드시트에서 [순번 | 기업명 | 대표자명 | 전화번호 | 아이템 소개 | 비고] 6열을 복사하여
        붙여넣으세요. (101번 이상은 외부 심사위원으로 자동 인식됩니다.)
      </label>
      <p className="mt-1 text-caption text-text-muted">
        이미 등록된 번호는 새 내용으로 갱신됩니다. 한 행이라도 오류가 있으면 아무것도 등록되지 않습니다.
      </p>
      <textarea
        id="bulk-text"
        rows={6}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setServerError(null);
        }}
        spellCheck={false}
        className="mt-2 block w-full rounded-md border border-text-muted bg-surface p-2 font-mono text-caption text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      {rows.length > 0 ? (
        <>
          <p aria-live="polite" className={`mt-3 ${hasErrors ? "text-danger" : "text-text"}`}>
            {hasErrors
              ? `${rows.length}행 중 ${errorCount}행에 오류가 있습니다. 고친 뒤 다시 붙여넣어 주세요.`
              : `${rows.length}행을 등록할 수 있습니다.`}
          </p>
          <div
            className="mt-2 max-h-64 overflow-auto"
            tabIndex={0}
            role="region"
            aria-label="붙여넣은 내용 미리보기"
          >
            <table className="w-full min-w-[640px] border-collapse text-caption text-text">
              <thead>
                <tr>
                  <th scope="col" className={TABLE_HEAD}>행</th>
                  <th scope="col" className={TABLE_HEAD}>순번</th>
                  <th scope="col" className={TABLE_HEAD}>기업명</th>
                  <th scope="col" className={TABLE_HEAD}>대표자명</th>
                  <th scope="col" className={TABLE_HEAD}>전화번호</th>
                  <th scope="col" className={TABLE_HEAD}>구분 / 오류</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const invalid = row.errors.length > 0;
                  return (
                    <tr key={row.line} className={invalid ? "bg-danger-surface" : undefined}>
                      <td className={TABLE_CELL}>{row.line}</td>
                      <td className={TABLE_CELL}>{row.no ?? "?"}</td>
                      <td className={TABLE_CELL}>{row.company_name}</td>
                      <td className={TABLE_CELL}>{row.leader_name}</td>
                      <td className={TABLE_CELL}>{row.phone ?? row.phone_input}</td>
                      <td className={`${TABLE_CELL} ${invalid ? "font-semibold text-danger" : ""}`}>
                        {invalid
                          ? `오류: ${row.errors.join(" ")}`
                          : row.no !== null && row.no >= 101
                            ? "외부 심사위원"
                            : "기업 + 대표"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {serverError ? (
        <p role="alert" className="mt-3 rounded-md bg-danger-surface p-3 text-danger">
          {serverError}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className={BUTTON_SECONDARY}>
          닫기
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || rows.length === 0 || hasErrors}
          className={BUTTON_PRIMARY}
        >
          {pending ? "등록하는 중…" : "등록 실행"}
        </button>
      </div>
    </Modal>
  );
}
