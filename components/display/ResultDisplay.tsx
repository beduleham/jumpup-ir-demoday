"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ClosedView } from "@/components/display/ClosedView";
import { DisplayContainer } from "@/components/display/DisplayContainer";
import { OpenView } from "@/components/display/OpenView";
import { PitchingView } from "@/components/display/PitchingView";
import { ReadyView } from "@/components/display/ReadyView";
import { RevealedView } from "@/components/display/RevealedView";
import { useDisplayData, type DisplayData } from "@/hooks/use-display-data";
import { STATUS_LABELS } from "@/types/competition";

function CenterMessage({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <p className="text-display-2">{title}</p>
      {body ? <p className="text-h1 text-stage-muted">{body}</p> : null}
    </div>
  );
}

function Stage({ data }: { data: DisplayData }) {
  const { state, results } = data;
  if (results.results.length === 0) {
    return (
      <CenterMessage
        title="등록된 참여 기업 정보가 없습니다."
        body="관리자 콘솔에서 기업을 먼저 등록해주세요."
      />
    );
  }
  switch (state.status) {
    case "ready":
      return <ReadyView teams={results.results} />;
    case "pitching":
      return <PitchingView current={state.current_pitch_team} teams={results.results} />;
    case "open":
      return <OpenView />;
    case "closed":
      return <ClosedView />;
    case "revealed":
      return <RevealedView step={state.reveal_step} results={results.results} changedAt={state.updated_at} />;
  }
}

/** 행사장 대형 스크린. 입력을 받지 않는 보기 전용 화면이며 대회 상태를 스스로 따라간다. */
export function ResultDisplay() {
  const { data, failed, link } = useDisplayData();
  // 단계나 시상 스텝, 발표 기업이 바뀔 때마다 화면을 전환 효과와 함께 바꾼다.
  const viewKey = data
    ? `${data.state.status}-${data.state.reveal_step}-${data.state.current_pitch_team?.id ?? ""}`
    : "loading";

  return (
    <MotionConfig reducedMotion="user">
      <DisplayContainer statusLabel={data ? STATUS_LABELS[data.state.status] : null} link={link} failed={failed}>
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {data ? (
              <Stage data={data} />
            ) : failed ? (
              <CenterMessage
                title="화면 정보를 불러오지 못했습니다."
                body="네트워크 상태를 확인해주세요. 자동으로 다시 시도하고 있습니다."
              />
            ) : (
              <div role="status" className="flex h-full flex-col items-center justify-center gap-8">
                <div className="h-48 w-[720px] animate-pulse rounded-2xl bg-stage-surface motion-reduce:animate-none" />
                <p className="text-h1 text-stage-muted">데모데이 디스플레이 시스템 연결 중...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </DisplayContainer>
    </MotionConfig>
  );
}
