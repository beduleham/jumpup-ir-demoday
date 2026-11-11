"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

const STEP_BUTTON =
  "inline-flex min-h-12 min-w-12 flex-1 items-center justify-center gap-1 rounded-md px-3 text-h3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const DISABLED_LOOK = "cursor-not-allowed opacity-40";

/** 한 기업에 배분한 금액과 1억 원 단위 증감 버튼. */
export function InvestmentControls({
  teamName,
  currentUnits,
  canDecrease,
  canIncrease,
  limitReached,
  onIncrement,
  onDecrement,
  onLimitTap,
}: {
  teamName: string;
  /** 이 기업에 배분한 금액(억 원) */
  currentUnits: number;
  canDecrease: boolean;
  canIncrease: boolean;
  /** 투자는 열려 있지만 남은 투자금이 없어 더 늘릴 수 없는 상태 */
  limitReached: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  /** 한도를 다 쓴 상태에서 +1억을 눌렀을 때(안내를 띄우는 데 쓴다) */
  onLimitTap: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <p className="min-w-20 text-text">
        <span className="block text-caption text-text-muted">내 투자</span>
        <strong className="relative block h-7 overflow-hidden text-h2">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={currentUnits}
              className="block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {currentUnits}억 원
            </motion.span>
          </AnimatePresence>
        </strong>
      </p>
      <div className="flex flex-1 gap-2">
        <motion.button
          type="button"
          whileTap={canDecrease ? { scale: 0.94 } : undefined}
          onClick={onDecrement}
          disabled={!canDecrease}
          aria-label={`${teamName} 투자금 1억 원 줄이기`}
          className={`${STEP_BUTTON} border border-text-muted bg-surface text-text ${canDecrease ? "" : DISABLED_LOOK}`}
        >
          <Minus aria-hidden="true" size={20} strokeWidth={2} />
          1억
        </motion.button>
        {/* 한도를 다 쓴 경우에는 눌렀을 때 이유를 알려 줄 수 있도록 disabled 대신 aria-disabled를 쓴다. */}
        <motion.button
          type="button"
          whileTap={canIncrease ? { scale: 0.94 } : undefined}
          onClick={() => {
            if (canIncrease) onIncrement();
            else if (limitReached) onLimitTap();
          }}
          disabled={!canIncrease && !limitReached}
          aria-disabled={!canIncrease}
          aria-label={`${teamName} 투자금 1억 원 늘리기`}
          className={`${STEP_BUTTON} bg-primary text-primary-foreground ${canIncrease ? "hover:bg-primary-hover" : DISABLED_LOOK}`}
        >
          <Plus aria-hidden="true" size={20} strokeWidth={2} />
          1억
        </motion.button>
      </div>
    </div>
  );
}
