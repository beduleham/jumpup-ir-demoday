import { Clock, Coins, Lock, Mic, Monitor, Trophy, type LucideIcon } from "lucide-react";
import { STATUS_LABELS, type CompetitionStatus } from "@/types/competition";

const BANNERS: Record<
  CompetitionStatus,
  { icon: LucideIcon; title: string; message: string; tone: string }
> = {
  ready: {
    icon: Clock,
    title: "대회가 곧 시작됩니다",
    message: "입장을 마치고 잠시 기다려 주세요. 발표가 시작되면 이 화면이 자동으로 바뀝니다.",
    tone: "border-border bg-surface",
  },
  pitching: {
    icon: Mic,
    title: "발표가 진행 중입니다",
    message: "발표를 듣고 투자할 기업을 살펴봐 주세요. 투자는 발표가 끝난 뒤 열립니다.",
    tone: "border-border bg-surface",
  },
  open: {
    icon: Coins,
    title: "가상 투자가 열렸습니다",
    message: "아래 기업 목록을 확인하고 투자해 주세요.",
    tone: "border-primary bg-surface",
  },
  closed: {
    icon: Lock,
    title: "투자가 마감되었습니다",
    message: "집계 중입니다. 잠시 후 결과가 공개됩니다.",
    tone: "border-warning bg-warning-surface",
  },
  revealed: {
    icon: Trophy,
    title: "시상이 진행 중입니다",
    message: "수상 기업이 차례로 발표됩니다.",
    tone: "border-success bg-success-surface",
  },
};

export function StateHeroBanner({ status }: { status: CompetitionStatus }) {
  const banner = BANNERS[status];
  const Icon = banner.icon;

  return (
    <section aria-labelledby="state-title" className={`rounded-xl border p-4 ${banner.tone}`}>
      <p className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-caption font-semibold text-primary-foreground">
        <Icon aria-hidden="true" size={14} strokeWidth={2} />
        현재 단계 · {STATUS_LABELS[status]}
      </p>
      <h2 id="state-title" className="mt-3 text-h2 text-text">
        {banner.title}
      </h2>
      <p className="mt-1 text-text">{banner.message}</p>

      {status === "open" ? (
        <a
          href="#teams"
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          투자 대상 목록으로 이동
        </a>
      ) : null}

      {status === "revealed" ? (
        <p className="mt-3 inline-flex items-center gap-1 rounded-sm bg-surface px-2 py-1 text-caption font-semibold text-text">
          <Monitor aria-hidden="true" size={14} strokeWidth={2} />
          행사장 메인 스크린(/result)을 확인하세요
        </p>
      ) : null}
    </section>
  );
}
