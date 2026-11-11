"use client";

import { motion } from "framer-motion";
import { JoinQr } from "@/components/display/JoinQr";

// 쏠림을 막기 위해 투자 중에는 기업별 현황을 보여 주지 않는다(서버도 공개 전에는 집계를 내보내지 않는다).
export function OpenView() {
  return (
    <div className="grid h-full grid-cols-[1fr_520px] items-center gap-16">
      <section>
        <h1 className="text-display-1">모의 투자가 진행 중입니다</h1>
        <p className="mt-8 text-display-2 font-normal text-stage-muted">
          각 대표팀에게 가상 투자금을 배분해주세요.
        </p>
        <p className="mt-12 inline-flex items-center gap-5 rounded-xl border border-stage-border bg-stage-surface px-8 py-5 text-display-2">
          <span aria-hidden="true" className="flex gap-2">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="block h-5 w-5 rounded-full bg-accent"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }}
              />
            ))}
          </span>
          투표 진행 중
        </p>
      </section>
      <section className="flex flex-col items-center gap-6 text-center">
        <JoinQr size={340} />
        <p className="text-h1 text-stage-muted">아직 입장하지 않았다면 QR 코드로 접속하세요.</p>
      </section>
    </div>
  );
}
