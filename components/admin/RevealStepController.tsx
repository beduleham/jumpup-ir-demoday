"use client";

import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/admin/styles";
import { WINNER_STEP } from "@/lib/reveal";
import { REVEAL_STEP_LABELS } from "@/types/admin";

const LAST_STEP = REVEAL_STEP_LABELS.length - 1;

/**
 * 시상식 리모컨. 결과 공개 단계에서 대형 스크린의 시상 단계를 넘긴다.
 * 넓은 화면에서는 스크롤해도 위쪽에 붙어 있고, 좁은 화면에서는 내용을 가리지 않도록 붙이지 않는다.
 * 축하 효과 재격발은 같은 단계(1위 발표)를 다시 저장해 대형 스크린이 효과를 한 번 더 쏘게 한다.
 */
export function RevealStepController({
  step,
  busy,
  onStep,
}: {
  step: number;
  busy: boolean;
  onStep: (step: number) => void;
}) {
  const nextLabel = REVEAL_STEP_LABELS[step + 1];

  return (
    <section
      aria-labelledby="reveal-title"
      className="z-10 rounded-xl border-2 border-primary bg-surface p-4 shadow-lg md:sticky md:top-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reveal-title" className="text-h2 text-text">
          시상식 리모컨
        </h2>
        <p aria-live="polite" className="text-text">
          현재 <strong>{step}단계</strong> / {LAST_STEP}단계 ·{" "}
          <strong>{REVEAL_STEP_LABELS[step] ?? "추가 단계"}</strong>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || step <= 0}
          onClick={() => onStep(step - 1)}
          className={BUTTON_SECONDARY}
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
          이전 단계
        </button>
        <button
          type="button"
          disabled={busy || step >= LAST_STEP}
          onClick={() => onStep(step + 1)}
          className={BUTTON_PRIMARY}
        >
          {nextLabel ? `다음 단계 (${nextLabel})` : "마지막 단계입니다"}
          <ChevronRight aria-hidden="true" size={20} strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={busy || step !== WINNER_STEP}
          title={step === WINNER_STEP ? undefined : "1위 발표 단계에서 사용할 수 있습니다."}
          onClick={() => onStep(WINNER_STEP)}
          className={BUTTON_SECONDARY}
        >
          <PartyPopper aria-hidden="true" size={20} strokeWidth={2} />
          축하 효과 다시 터뜨리기
        </button>
      </div>

      <ol aria-label="단계 바로 가기" className="mt-3 flex flex-wrap gap-2">
        {REVEAL_STEP_LABELS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={busy}
              aria-current={index === step ? "step" : undefined}
              onClick={() => {
                if (index !== step) onStep(index);
              }}
              className={index === step ? BUTTON_PRIMARY : BUTTON_SECONDARY}
            >
              {index}. {label}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
