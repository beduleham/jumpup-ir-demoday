"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 브라우저 기본 <dialog>를 쓰는 모달. 포커스 가두기와 Esc 닫기는 브라우저가 처리한다. */
export function Modal({
  title,
  onClose,
  wide = false,
  locked = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  /** true인 동안에는 Esc로 닫히지 않는다(되돌릴 수 없는 작업이 진행 중일 때). */
  locked?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        if (locked) event.preventDefault();
      }}
      aria-labelledby="modal-title"
      className={`w-full rounded-xl border border-border bg-surface p-0 text-text backdrop:bg-text/50 ${wide ? "max-w-4xl" : "max-w-md"}`}
    >
      <div className="p-4">
        <h2 id="modal-title" className="text-h2">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
