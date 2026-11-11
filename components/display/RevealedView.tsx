"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect } from "react";
import {
  AWARD_NAMES,
  CONFETTI_COLORS,
  FINAL_TABLE_STEP,
  revealedRanks,
  spotlightRank,
  teaserRank,
  WINNER_STEP,
} from "@/lib/reveal";
import type { TeamResultItem } from "@/types/results";

const CONFETTI_MS = 3000;
const CONFETTI_INTERVAL_MS = 250;
// 양쪽에서 6개씩, 12회 = 총 144개(저사양 PC를 고려해 150개 이하)
const CONFETTI_PER_SIDE = 6;

const RANK_TONE: Record<number, { border: string; badge: string }> = {
  1: { border: "border-accent", badge: "bg-accent text-accent-foreground" },
  2: { border: "border-medal-silver", badge: "bg-medal-silver text-accent-foreground" },
  3: { border: "border-medal-bronze", badge: "bg-medal-bronze text-accent-foreground" },
};

/** 1위 공개 순간 3초 동안 좌우에서 축하 효과를 쏜다. 움직임 줄이기 설정이면 쏘지 않는다. */
function useWinnerConfetti(active: boolean) {
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const until = Date.now() + CONFETTI_MS;
    const timer = setInterval(() => {
      if (Date.now() >= until) {
        clearInterval(timer);
        return;
      }
      for (const side of [0, 1]) {
        void confetti({
          particleCount: CONFETTI_PER_SIDE,
          angle: side === 0 ? 60 : 120,
          spread: 60,
          origin: { x: side, y: 0.7 },
          colors: CONFETTI_COLORS,
        });
      }
    }, CONFETTI_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      confetti.reset();
    };
  }, [active]);
}

function Message({ title, body, pulse = false }: { title: string; body?: string; pulse?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <motion.h1
        className="text-display-1"
        animate={pulse ? { scale: [1, 1.06, 1] } : undefined}
        transition={pulse ? { duration: 0.6, repeat: Infinity } : undefined}
      >
        {title}
      </motion.h1>
      {body ? <p className="text-display-2 font-normal text-stage-muted">{body}</p> : null}
    </div>
  );
}

function SpotlightCard({ rank, team }: { rank: number; team: TeamResultItem }) {
  const tone = RANK_TONE[rank];
  return (
    <motion.section
      key={rank}
      initial={{ opacity: 0, y: 80, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`mx-auto flex w-full max-w-[1400px] flex-col items-center rounded-2xl border-4 bg-stage-surface px-16 py-12 text-center ${tone.border}`}
    >
      <p className={`inline-flex items-center gap-3 rounded-xl px-8 py-3 text-display-2 ${tone.badge}`}>
        <Trophy aria-hidden="true" size={48} strokeWidth={2} />
        {rank}위 · {AWARD_NAMES[rank]}
      </p>
      <h1 className="mt-8 text-display-1">{team.company_name}</h1>
      <p className="mt-3 text-display-2 font-normal text-stage-muted">
        {team.team_no}번 · {team.leader_name} 대표
      </p>
      <p className="mt-8 text-display-2">
        유치 총액 <strong className="text-accent">{team.total_raised_units}억 원</strong>
        <span className="text-stage-muted"> · 투자자 {team.investor_count}명</span>
      </p>
    </motion.section>
  );
}

function EarlierCard({ rank, team }: { rank: number; team: TeamResultItem }) {
  return (
    <li className={`flex items-center gap-4 rounded-xl border-2 bg-stage-surface px-6 py-4 ${RANK_TONE[rank].border}`}>
      <span className={`rounded-md px-3 py-1 text-h1 ${RANK_TONE[rank].badge}`}>{rank}위</span>
      <span className="text-h1">{team.company_name}</span>
      <span className="text-h1 text-stage-muted">{team.total_raised_units}억 원</span>
    </li>
  );
}

function FinalTable({ results }: { results: TeamResultItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <h1 className="text-display-2">최종 순위</h1>
      <ol className="mt-6 grid flex-1 grid-flow-col grid-cols-2 grid-rows-6 gap-x-8 gap-y-3">
        {results.map((team, index) => {
          const tone = RANK_TONE[team.final_rank];
          return (
            <motion.li
              key={team.team_id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex items-center gap-5 rounded-xl border-2 bg-stage-surface px-6 ${tone ? tone.border : "border-stage-border"}`}
            >
              <span
                className={`inline-flex min-w-24 justify-center rounded-md px-3 py-2 text-h1 font-bold ${tone ? tone.badge : "bg-stage-body text-stage-text"}`}
              >
                {team.final_rank}위
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-h1">{team.company_name}</span>
                <span className="block truncate text-h2 text-stage-muted">
                  {team.team_no}번 · {team.leader_name} 대표
                </span>
              </span>
              <span className="text-right">
                <span className="block text-h1 font-bold">{team.total_raised_units}억 원</span>
                <span className="block text-h2 text-stage-muted">투자자 {team.investor_count}명</span>
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export function RevealedView({ step, results }: { step: number; results: TeamResultItem[] }) {
  useWinnerConfetti(step === WINNER_STEP);

  if (step >= FINAL_TABLE_STEP) return <FinalTable results={results} />;

  const byRank = (rank: number) => results.find((team) => team.final_rank === rank);
  const teaser = teaserRank(step);
  const spotlight = spotlightRank(step);
  const spotlightTeam = spotlight ? byRank(spotlight) : undefined;
  const earlier = revealedRanks(step).filter((rank) => rank !== spotlight);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {teaser ? (
          <Message
            title={`${teaser}위 ${AWARD_NAMES[teaser]}을 발표합니다`}
            body={teaser === 1 ? "영예의 1위는 어느 기업일까요?" : undefined}
            pulse={teaser === 1}
          />
        ) : spotlight && spotlightTeam ? (
          <SpotlightCard rank={spotlight} team={spotlightTeam} />
        ) : spotlight ? (
          <Message title={`${spotlight}위에 해당하는 기업이 없습니다`} />
        ) : (
          <Message title="곧 최종 순위가 공개됩니다" body="잠시 후 수상 기업을 발표합니다." />
        )}
      </div>

      {earlier.length > 0 ? (
        <ul aria-label="앞서 발표된 수상 기업" className="mt-8 flex justify-center gap-6">
          {earlier.map((rank) => {
            const team = byRank(rank);
            return team ? <EarlierCard key={rank} rank={rank} team={team} /> : null;
          })}
        </ul>
      ) : null}
    </div>
  );
}
