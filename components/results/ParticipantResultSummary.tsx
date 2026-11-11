"use client";

import { PartyPopper, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { FounderResultCard } from "@/components/results/FounderResultCard";
import { OverallRankingList } from "@/components/results/OverallRankingList";
import type { SessionInvestor } from "@/types/competition";
import { publicResultsSchema, type TeamResultItem } from "@/types/results";

const REQUEST_TIMEOUT_MS = 5000;
const responseSchema = z.object({ success: z.literal(true), data: publicResultsSchema });

type Load = { kind: "loading" } | { kind: "error" } | { kind: "ready"; results: TeamResultItem[] };

/** 결과가 공개된 뒤의 순위만 돌려준다. 아직 공개 전이면(서버가 집계를 가린 응답) 빈 목록이다. */
async function fetchRevealedResults(): Promise<TeamResultItem[]> {
  const response = await fetch("/api/public/results", {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const { data } = responseSchema.parse(await response.json());
  return data.status === "revealed" ? data.results : [];
}

/**
 * 시상이 끝난 뒤 참가자에게 보여 주는 최종 결과.
 * 기업 대표에게는 자기 기업의 결과 카드를, 외부 투자자에게는 시상 완료 안내를 먼저 보여 주고,
 * 이어서 전체 순위를 보여 준다. 본인의 투자 내역은 아래 투자 화면에 그대로 남아 있다.
 */
export function ParticipantResultSummary({
  investor,
  version,
}: {
  investor: SessionInvestor;
  /** 대회 설정이 바뀐 시각. 바뀌면(순위 보정 등) 결과를 다시 읽는다. */
  version: string;
}) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  const read = useCallback(async () => {
    try {
      setLoad({ kind: "ready", results: await fetchRevealedResults() });
    } catch (error) {
      console.error("[results] 결과 조회 실패", error);
      setLoad({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void read();
  }, [read, version]);

  if (load.kind === "loading") {
    return (
      <div role="status" className="h-[180px] animate-pulse rounded-xl bg-border motion-reduce:animate-none">
        <span className="sr-only">최종 결과를 불러오는 중입니다.</span>
      </div>
    );
  }

  if (load.kind === "error") {
    return (
      <section role="alert" className="rounded-xl border border-danger bg-danger-surface p-4">
        <p className="font-semibold text-danger">결과 데이터를 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => {
            setLoad({ kind: "loading" });
            void read();
          }}
          className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-md border border-danger bg-surface px-4 font-semibold text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RefreshCw aria-hidden="true" size={20} strokeWidth={2} />
          다시 시도
        </button>
      </section>
    );
  }

  const { results } = load;
  const founder = investor.investor_type === "founder" && investor.team_id !== null;
  const mine = founder ? results.find((team) => team.team_id === investor.team_id) : undefined;

  if (results.length === 0 || (founder && !mine)) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-text">
        참여 기업 결과 정보를 찾을 수 없습니다. 운영본부에 문의해주세요.
      </p>
    );
  }

  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-3">
      <h2 id="results-title" className="text-h2 text-text">
        모의 IR 데모데이 최종 결과
      </h2>
      {mine ? (
        <FounderResultCard
          myTeamResult={mine}
          shared={results.filter((team) => team.final_rank === mine.final_rank).length > 1}
        />
      ) : (
        <p className="flex items-start gap-2 rounded-xl border border-success bg-success-surface p-4 font-semibold text-success">
          <PartyPopper aria-hidden="true" size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
          2026 광명 스타트업 점프업 시상식이 완료되었습니다. 참여해 주셔서 감사합니다.
        </p>
      )}
      <OverallRankingList results={results} myTeamId={mine?.team_id ?? null} />
    </section>
  );
}
