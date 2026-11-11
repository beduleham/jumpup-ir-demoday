"use client";

import { motion } from "framer-motion";

export function ClosedView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 text-center">
      <div aria-hidden="true" className="relative h-40 w-40">
        <motion.span
          className="absolute inset-0 rounded-full border-8 border-primary"
          animate={{ scale: [1, 1.5], opacity: [0.9, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="absolute inset-6 rounded-full bg-primary" />
      </div>
      <h1 className="text-display-1">투자 마감!</h1>
      <p className="text-display-2 font-normal text-stage-muted">최종 결과를 집계하고 있습니다...</p>
    </div>
  );
}
