import { Medal, Trophy } from "lucide-react";
import type { TeamResultItem } from "@/types/results";

// 1~3위는 순위 색으로 테두리와 표시를 강조한다(1위 오렌지, 2위 실버, 3위 브론즈).
const AWARD_TONE: Record<number, { border: string; badge: string }> = {
  1: { border: "border-accent", badge: "bg-accent text-accent-foreground" },
  2: { border: "border-medal-silver", badge: "bg-medal-silver text-accent-foreground" },
  3: { border: "border-medal-bronze", badge: "bg-medal-bronze text-accent-foreground" },
};

/** 참여 기업 대표에게 보여 주는 자기 기업의 최종 결과. */
export function FounderResultCard({
  myTeamResult,
  shared,
}: {
  myTeamResult: TeamResultItem;
  /** 같은 순위의 기업이 또 있으면 공동 순위로 부른다. */
  shared: boolean;
}) {
  const tone = AWARD_TONE[myTeamResult.final_rank];
  const Icon = myTeamResult.final_rank === 1 ? Trophy : Medal;

  return (
    <section
      aria-labelledby="my-result-title"
      className={`rounded-xl bg-surface p-4 ${tone ? `border-2 ${tone.border}` : "border border-border"}`}
    >
      <p className="text-caption font-semibold text-text-muted">내 기업 유치 결과</p>
      <h3 id="my-result-title" className="mt-1 text-h2 text-text">
        {myTeamResult.team_no}번 {myTeamResult.company_name}
      </h3>

      <p
        className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-h1 font-bold ${tone ? tone.badge : "bg-body text-text"}`}
      >
        {tone ? <Icon aria-hidden="true" size={28} strokeWidth={2} /> : null}
        최종 {shared ? "공동 " : ""}
        {myTeamResult.final_rank}위
      </p>
      {myTeamResult.is_override ? (
        <p className="mt-2 inline-block rounded-sm bg-warning-surface px-2 py-1 text-caption font-semibold text-warning">
          운영진이 순위를 보정했습니다
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-body px-2 py-3">
          <dt className="text-caption text-text-muted">유치 총액</dt>
          <dd className="mt-1 text-h2 text-text">{myTeamResult.total_raised_units}억 원</dd>
        </div>
        <div className="rounded-md bg-body px-2 py-3">
          <dt className="text-caption text-text-muted">유치 건수</dt>
          <dd className="mt-1 text-h2 text-text">{myTeamResult.investor_count}건</dd>
        </div>
        <div className="rounded-md bg-body px-2 py-3">
          <dt className="text-caption text-text-muted">심사위원 유치</dt>
          <dd className="mt-1 text-h2 text-text">{myTeamResult.external_raised_units}억 원</dd>
        </div>
      </dl>
    </section>
  );
}
