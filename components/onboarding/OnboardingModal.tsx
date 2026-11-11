"use client";

import { motion, MotionConfig } from "framer-motion";
import { Ban, Clock, Coins, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const RULES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Coins,
    title: "가상 예산 10억 원",
    body: "1인당 총 10억 원이 지급됩니다. 10억 원을 넘는 배분은 할 수 없습니다.",
  },
  {
    icon: SlidersHorizontal,
    title: "1억 원 단위 조정",
    body: "기업 카드의 +1억 / -1억 버튼으로만 금액을 조정합니다. 마감 전까지 몇 번이든 바꿀 수 있습니다.",
  },
  {
    icon: Ban,
    title: "자기 기업 투자 금지",
    body: "소속 기업 카드에는 ‘내 기업 (투자 불가)’ 표시가 붙고 버튼이 눌리지 않습니다.",
  },
  {
    icon: Clock,
    title: "투자 오픈 시 반영",
    body: "운영진이 ‘투자 오픈’으로 전환해야 버튼이 켜지고, ‘투자 마감’이 되면 다시 잠깁니다.",
  },
];

const EMPHASIS: Record<"founder" | "external", string> = {
  founder: "참여 기업 대표: 소속 기업에는 투자할 수 없습니다.",
  external: "외부 투자자: 모든 참가 기업에 자유롭게 투자할 수 있습니다.",
};

/**
 * 투자 규칙 안내 모달.
 * auto가 true면 첫 접속 때 스스로 뜬 것이므로 ‘다시 보지 않기’ 선택을 보여 준다.
 * 닫힐 때 onClose(dontShowAgain)로 그 선택을 알려 준다.
 */
export function OnboardingModal({
  auto,
  investorType,
  onClose,
}: {
  auto: boolean;
  investorType?: "founder" | "external";
  onClose: (dontShowAgain: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 브라우저 기본 <dialog>: 포커스 가두기와 Esc 닫기를 브라우저가 처리한다.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="onboarding-title"
      // Esc로 닫히는 경우. 버튼으로 닫을 때는 아래에서 선택 값을 직접 넘긴다.
      onCancel={(event) => {
        event.preventDefault();
        onClose(false);
      }}
      // 어두운 바깥 영역을 누르면 닫는다(dialog 자신이 눌린 경우가 바깥 영역이다).
      onClick={(event) => {
        if (event.target === ref.current) onClose(false);
      }}
      className="w-[calc(100%-2rem)] max-w-md overflow-visible bg-transparent p-0 text-text backdrop:bg-text/60 backdrop:backdrop-blur-sm"
    >
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="flex max-h-[85vh] flex-col rounded-xl border border-border bg-surface"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border p-4">
            <div>
              <h2 id="onboarding-title" className="text-h2">
                투자 규칙 안내
              </h2>
              <p className="mt-1 text-text-muted">시작하기 전에 네 가지만 확인해 주세요.</p>
            </div>
            <button
              type="button"
              onClick={() => onClose(false)}
              aria-label="안내 닫기"
              className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X aria-hidden="true" size={24} strokeWidth={2} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {investorType ? (
              <p className="mb-3 rounded-md bg-danger-surface p-3 font-semibold text-danger">
                {EMPHASIS[investorType]}
              </p>
            ) : null}
            <ul className="flex flex-col gap-3">
              {RULES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-body text-primary">
                    <Icon aria-hidden="true" size={24} strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-h3 font-semibold">{title}</strong>
                    <span className="block text-text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border p-4">
            {auto ? (
              <label className="mb-3 flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(event) => setDontShowAgain(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
                다시 보지 않기
              </label>
            ) : null}
            <button
              type="button"
              autoFocus
              onClick={() => onClose(auto && dontShowAgain)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {auto ? "확인하고 시작하기" : "확인"}
            </button>
          </div>
        </motion.div>
      </MotionConfig>
    </dialog>
  );
}
