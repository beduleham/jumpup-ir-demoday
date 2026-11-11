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
    return state.status === "revealed" ? (
      <CenterMessage title="집계된 순위 데이터가 없습니다." body="대회 운영본부 확인이 필요합니다." />
    ) : (
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
              <div role="alert" className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <p className="text-display-2 text-danger-icon">실시간 집계 서버와 통신할 수 없습니다.</p>
                <p className="text-h1 text-stage-muted">자동으로 다시 연결하고 있습니다.</p>
                {/* 다시 시도 중임을 보여 주는 움직이는 막대 */}
                <div aria-hidden="true" className="h-2 w-[720px] overflow-hidden rounded-sm bg-stage-surface">
                  <motion.div
                    className="h-full w-1/3 rounded-sm bg-primary"
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            ) : (
              <div role="status" className="flex h-full flex-col items-center justify-center gap-8">
                <span
                  aria-hidden="true"
                  className="block h-8 w-8 animate-spin rounded-full border-4 border-stage-border border-t-primary motion-reduce:animate-none"
                />
                <p className="text-h1 text-stage-muted">시상식 화면을 준비하고 있습니다...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </DisplayContainer>
    </MotionConfig>
  );
}
