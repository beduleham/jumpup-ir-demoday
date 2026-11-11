"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, TABLE_CELL, TABLE_HEAD } from "@/components/admin/styles";
import { parseBulkText, toRegisterRows, type BulkRegisterRow } from "@/lib/bulk-parse";

const PLACEHOLDER = [
  "순번\t기업명\t대표자명\t전화번호\t아이템 소개\t비고",
  "1\t○○테크\t홍길동\t010-1234-5678\tAI 기반 행사 운영 솔루션\t",
  "101\t\t김심사\t010-9876-5432\t\t외부 심사위원",
].join("\n");

const CLOSE_AFTER_SUCCESS_MS = 1500;

export type BulkSubmitResult =
  | { ok: true; teams: number; investors: number }
  | { ok: false; error: string };

/** 스프레드시트 6열을 붙여넣어 기업·투자자를 한 번에 등록한다. */
export function BulkRegisterModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (rows: BulkRegisterRow[]) => Promise<BulkSubmitResult>;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BulkSubmitResult | null>(null);
  const { rows, hasErrors } = useMemo(() => parseBulkText(text), [text]);

  const errorCount = rows.filter((row) => row.errors.length > 0).length;
  const teamCount = rows.filter((row) => row.kind === "founder").length;
  const judgeCount = rows.filter((row) => row.kind === "external").length;
  const succeeded = result?.ok === true;

  // 성공 안내를 잠깐 보여 준 뒤 스스로 닫는다.
  useEffect(() => {
    if (!succeeded) return;
    const timer = setTimeout(onClose, CLOSE_AFTER_SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [succeeded, onClose]);

  async function submit() {
    setPending(true);
    setResult(null);
    setResult(await onSubmit(toRegisterRows(rows)));
    setPending(false);
  }

  return (
    <Modal title="참가 기업 및 투자자 일괄 등록 (6열 붙여넣기)" onClose={onClose} wide>
      <label htmlFor="bulk-text" className="mt-2 block text-text">
        스프레드시트의 6개 열(
        <strong>순번, 기업명, 대표자명, 전화번호, 아이템 소개, 비고</strong>)을 머리글 포함 또는 미포함으로
        복사하여 아래 영역에 붙여넣으세요.
      </label>
      <ul className="mt-1 list-disc pl-5 text-caption text-text-muted">
        <li>순번 1~99번: 참여 기업 및 기업 대표 (소속 기업 자동 연결, 자기 기업 투자 불가 적용)</li>
        <li>순번 101번 이상: 외부 투자자·전문 심사위원 (소속 기업 없음)</li>
        <li>이미 등록된 순번은 새 내용으로 갱신됩니다. 한 행이라도 오류가 있으면 아무것도 등록되지 않습니다.</li>
      </ul>
      <textarea
        id="bulk-text"
        rows={6}
        value={text}
        placeholder={PLACEHOLDER}
        disabled={pending || succeeded}
        onChange={(event) => {
          setText(event.target.value);
          setResult(null);
        }}
        spellCheck={false}
        className="mt-2 block w-full rounded-md border border-text-muted bg-surface p-2 font-mono text-caption text-text placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      {rows.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-text-muted">
          복사한 스프레드시트 텍스트를 붙여넣으면 미리보기가 표시됩니다.
        </p>
      ) : (
        <>
          <p aria-live="polite" className="mt-3 flex flex-wrap items-center gap-2 text-text">
            <span className="rounded-sm bg-body px-2 py-1 font-semibold">
              총 {rows.length}건 (참여 기업 {teamCount}개사, 외부 심사위원 {judgeCount}명)
            </span>
            <span
              className={`rounded-sm px-2 py-1 font-semibold ${hasErrors ? "bg-danger-surface text-danger" : "bg-success-surface text-success"}`}
            >
              오류 {errorCount}건
            </span>
          </p>
          <div
            className="mt-2 max-h-64 overflow-auto"
            tabIndex={0}
            role="region"
            aria-label="붙여넣은 내용 미리보기"
          >
            <table className="w-full min-w-[820px] border-collapse text-caption text-text">
              <thead>
                <tr>
                  <th scope="col" className={TABLE_HEAD}>행</th>
                  <th scope="col" className={TABLE_HEAD}>순번</th>
                  <th scope="col" className={TABLE_HEAD}>구분</th>
                  <th scope="col" className={TABLE_HEAD}>기업명</th>
                  <th scope="col" className={TABLE_HEAD}>대표/심사자명</th>
                  <th scope="col" className={TABLE_HEAD}>전화번호(정규화)</th>
                  <th scope="col" className={TABLE_HEAD}>아이템 소개</th>
                  <th scope="col" className={TABLE_HEAD}>검증 상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const invalid = row.errors.length > 0;
                  return (
                    <tr key={row.line} className={invalid ? "bg-danger-surface" : undefined}>
                      <td className={TABLE_CELL}>{row.line}</td>
                      <td className={TABLE_CELL}>{row.no ?? "?"}</td>
                      <td className={TABLE_CELL}>
                        {row.kind === "founder" ? "참여기업(대표)" : row.kind === "external" ? "외부심사위원" : "-"}
                      </td>
                      <td className={TABLE_CELL}>{row.company_name}</td>
                      <td className={TABLE_CELL}>{row.leader_name}</td>
                      <td className={TABLE_CELL}>{row.phone ?? row.phone_input}</td>
                      <td className={`${TABLE_CELL} max-w-56 truncate`} title={row.description}>
                        {row.description}
                      </td>
                      <td className={`${TABLE_CELL} ${invalid ? "" : "bg-success-surface"}`}>
                        {invalid ? (
                          <span className="flex items-start gap-1 font-semibold text-danger">
                            <TriangleAlert aria-hidden="true" size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                            <span>
                              {row.errors.map((error) => (
                                <span key={error} className="block">
                                  [행 {row.line}] {error}
                                </span>
                              ))}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CircleCheck aria-hidden="true" size={14} strokeWidth={2} />
                            정상
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {result?.ok === false ? (
        <p role="alert" className="mt-3 rounded-md bg-danger-surface p-3 text-danger">
          {result.error}
        </p>
      ) : null}
      {result?.ok === true ? (
        <p role="status" className="mt-3 rounded-md bg-success-surface p-3 text-success">
          총 {result.teams}개 기업, {result.investors}명의 투자자가 성공적으로 등록(갱신)되었습니다.
        </p>
      ) : null}
      {pending ? (
        <p role="status" className="mt-3 text-text-muted">
          등록 처리 중... (창을 닫지 마세요)
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className={BUTTON_SECONDARY}>
          닫기
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || succeeded || rows.length === 0 || hasErrors}
          className={BUTTON_PRIMARY}
        >
          {pending ? (
            <>
              <span
                aria-hidden="true"
                className="block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent motion-reduce:animate-none"
              />
              등록 처리 중...
            </>
          ) : (
            `${rows.length}건 일괄 등록 실행`
          )}
        </button>
      </div>
    </Modal>
  );
}
