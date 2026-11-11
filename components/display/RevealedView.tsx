"use client";

import { motion } from "framer-motion";
import { Award, Trophy } from "lucide-react";
import { useEffect } from "react";
import { fireWinnerConfetti } from "@/lib/confetti";
import {
  AWARD_NAMES,
  FIRST_NON_AWARD_RANK,
  LOWER_RANKS_STEP,
  PODIUM_STEP,
  revealedRanks,
  spotlightRank,
  WINNER_STEP,
  WINNER_TEASER_STEP,
} from "@/lib/reveal";
import type { TeamResultItem } from "@/types/results";

const RANK_TONE: Record<number, { border: string; badge: string }> = {
  1: { border: "border-accent", badge: "bg-accent text-accent-foreground" },
  2: { border: "border-medal-silver", badge: "bg-medal-silver text-accent-foreground" },
  3: { border: "border-medal-bronze", badge: "bg-medal-bronze text-accent-foreground" },
};

/** 같은 순위가 둘 이상이면 공동 순위로 부른다. */
function rankLabel(rank: number, shared: boolean): string {
  return shared ? `공동 ${rank}위` : `${rank}위`;
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

/** 0단계: 시상식 시작을 기다리는 화면. 제목이 천천히 밝아졌다 어두워진다. */
function Waiting() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <motion.h1
        className="text-display-1"
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        모의 IR 최종 시상식
      </motion.h1>
      <p className="text-display-2 font-normal text-stage-muted">잠시 후 최종 시상식이 시작됩니다</p>
    </div>
  );
}

/** 1위 공개 직전: 어두운 무대 가운데에 조명이 켜지듯 밝은 원이 퍼진다. */
function WinnerTeaser() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8 text-center">
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[640px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-stage-surface"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.h1
        className="relative text-display-1"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      >
        대망의 1위 발표
      </motion.h1>
      <p className="relative text-display-2 font-normal text-stage-muted">영예의 대상은 어느 기업일까요?</p>
    </div>
  );
}

function SpotlightCard({ rank, team, shared }: { rank: number; team: TeamResultItem; shared: boolean }) {
  const tone = RANK_TONE[rank];
  const winner = rank === 1;
  return (
    <motion.section
      // 1위는 크게 다가왔다가 제자리에 내려앉고, 2·3위는 살짝 부풀었다가 자리 잡는다.
      initial={winner ? { opacity: 0, scale: 1.25 } : { opacity: 0, y: 40, scale: 0.85 }}
      animate={winner ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0, scale: [0.85, 1.05, 1] }}
      transition={
        winner
          ? { type: "spring", stiffness: 140, damping: 16 }
          : { duration: 0.7, ease: "easeOut", times: [0, 0.7, 1] }
      }
      className={`relative flex min-w-0 flex-1 flex-col items-center rounded-2xl border-4 bg-stage-surface px-12 py-12 text-center ${tone.border} ${winner ? "shadow-winner" : ""}`}
    >
      {winner ? (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, rotate: -180, scale: 0 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.25 }}
          className="absolute -top-16 flex h-28 w-28 items-center justify-center rounded-full border-4 border-accent bg-stage-body text-medal-gold"
        >
          <Award size={72} strokeWidth={2} />
        </motion.div>
      ) : null}
      <p className={`inline-flex items-center gap-3 rounded-xl px-8 py-3 text-display-2 ${winner ? "mt-8" : ""} ${tone.badge}`}>
        <Trophy aria-hidden="true" size={48} strokeWidth={2} />
        {rankLabel(rank, shared)} · {AWARD_NAMES[rank]}
      </p>
      <h1 className={`mt-8 max-w-full break-words ${shared ? "text-display-2" : "text-display-1"}`}>
        {team.company_name}
      </h1>
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

function EarlierCard({ rank, team, shared }: { rank: number; team: TeamResultItem; shared: boolean }) {
  return (
    <li className={`flex items-center gap-4 rounded-xl border-2 bg-stage-surface px-6 py-4 ${RANK_TONE[rank].border}`}>
      <span className={`rounded-md px-3 py-1 text-h1 ${RANK_TONE[rank].badge}`}>{rankLabel(rank, shared)}</span>
      <span className="text-h1">{team.company_name}</span>
      <span className="text-h1 text-stage-muted">{team.total_raised_units}억 원</span>
    </li>
  );
}

/** 수상권 밖 기업 한 줄. 1단계 목록과 6단계 포디엄 아래에 쓴다. */
function LowerRankRow({ team, index }: { team: TeamResultItem; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="flex min-w-0 items-center gap-4 rounded-xl border-2 border-stage-border bg-stage-surface px-5 py-3"
    >
      <span className="inline-flex min-w-20 justify-center rounded-md bg-stage-body px-3 py-2 text-h1 font-bold">
        {team.final_rank}위
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-h1">{team.company_name}</span>
        <span className="block truncate text-h2 text-stage-muted">
          {team.team_no}번 · {team.leader_name} 대표
        </span>
      </span>
      <span className="text-h1 font-bold">{team.total_raised_units}억 원</span>
    </motion.li>
  );
}

function LowerRanks({ teams }: { teams: TeamResultItem[] }) {
  if (teams.length === 0) return <Message title="곧 수상 기업을 발표합니다" body="3위부터 차례로 공개됩니다." />;
  return (
    <div className="flex h-full flex-col">
      <h1 className="text-display-2">{FIRST_NON_AWARD_RANK}위 이하 순위</h1>
      <ol className="mt-8 grid grid-cols-2 content-start gap-x-8 gap-y-4">
        {teams.map((team, index) => (
          <LowerRankRow key={team.team_id} team={team} index={index} />
        ))}
      </ol>
    </div>
  );
}

function PodiumColumn({ rank, teams }: { rank: 1 | 2 | 3; teams: TeamResultItem[] }) {
  // 공동 순위로 자리가 비면(예: 공동 2위 둘이면 3위 없음) 그 칸은 그리지 않는다.
  if (teams.length === 0) return null;
  const tone = RANK_TONE[rank];
  const first = rank === 1;
  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: first ? 0.3 : 0, ease: "easeOut" }}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl bg-stage-surface px-8 text-center ${tone.border} ${first ? "h-[380px] border-4" : "h-[310px] border-2"}`}
    >
      <p className={`inline-flex items-center gap-2 rounded-xl px-6 py-2 text-h1 font-bold ${tone.badge}`}>
        <Trophy aria-hidden="true" size={32} strokeWidth={2} />
        {rankLabel(rank, teams.length > 1)} · {AWARD_NAMES[rank]}
      </p>
      {teams.map((team) => (
        <div key={team.team_id} className="mt-5 w-full min-w-0">
          <h2 className={`truncate ${first && teams.length === 1 ? "text-display-1" : "text-display-2"}`}>
            {team.company_name}
          </h2>
          <p className="mt-1 truncate text-h1 font-normal text-stage-muted">
            {team.leader_name} 대표 · <strong className="text-accent">{team.total_raised_units}억 원</strong>
          </p>
        </div>
      ))}
    </motion.section>
  );
}

/** 6단계: 가운데 1위, 왼쪽 2위, 오른쪽 3위와 나머지 전체 순위. */
function Podium({ results }: { results: TeamResultItem[] }) {
  const at = (rank: number) => results.filter((team) => team.final_rank === rank);
  const others = results.filter((team) => team.final_rank >= FIRST_NON_AWARD_RANK);
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">최종 순위</h1>
      <div className="flex items-end gap-6">
        <PodiumColumn rank={2} teams={at(2)} />
        <PodiumColumn rank={1} teams={at(1)} />
        <PodiumColumn rank={3} teams={at(3)} />
      </div>
      {others.length > 0 ? (
        <ol aria-label={`${FIRST_NON_AWARD_RANK}위 이하 순위`} className="mt-8 grid grid-cols-3 content-start gap-x-6 gap-y-3">
          {others.map((team, index) => (
            <LowerRankRow key={team.team_id} team={team} index={index} />
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function RevealedView({
  step,
  results,
  changedAt,
}: {
  step: number;
  results: TeamResultItem[];
  /** 설정이 마지막으로 바뀐 시각. 1위 공개 단계에서 값이 바뀌면 축하 효과를 다시 쏜다(관리자의 재격발). */
  changedAt: string;
}) {
  const celebrating = step === WINNER_STEP;
  useEffect(() => {
    if (!celebrating) return;
    return fireWinnerConfetti();
  }, [celebrating, changedAt]);

  if (step >= PODIUM_STEP) return <Podium results={results} />;
  if (step === WINNER_TEASER_STEP) return <WinnerTeaser />;
  if (step === LOWER_RANKS_STEP) {
    return <LowerRanks teams={results.filter((team) => team.final_rank >= FIRST_NON_AWARD_RANK)} />;
  }

  const at = (rank: number) => results.filter((team) => team.final_rank === rank);
  const spotlight = spotlightRank(step);
  const spotlightTeams = spotlight ? at(spotlight) : [];
  const earlier = revealedRanks(step).filter((rank) => rank !== spotlight);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {spotlight === null ? (
          <Waiting />
        ) : spotlightTeams.length === 0 ? (
          <Message title={`${spotlight}위에 해당하는 기업이 없습니다`} />
        ) : (
          <div className="mx-auto flex w-full max-w-[1500px] items-stretch gap-8">
            {spotlightTeams.map((team) => (
              <SpotlightCard key={team.team_id} rank={spotlight} team={team} shared={spotlightTeams.length > 1} />
            ))}
          </div>
        )}
      </div>

      {earlier.length > 0 ? (
        <ul aria-label="앞서 발표된 수상 기업" className="mt-8 flex flex-wrap justify-center gap-6">
          {earlier.flatMap((rank) => {
            const teams = at(rank);
            return teams.map((team) => (
              <EarlierCard key={team.team_id} rank={rank} team={team} shared={teams.length > 1} />
            ));
          })}
        </ul>
      ) : null}
    </div>
  );
}
