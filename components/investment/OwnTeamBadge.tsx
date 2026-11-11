import { ShieldAlert } from "lucide-react";

/** 자기 소속 기업 카드 위에 붙는 표시. */
export function OwnTeamBadge() {
  return (
    <p className="mb-2 inline-flex items-center gap-1 rounded-sm bg-danger-surface px-2 py-1 text-caption font-semibold text-danger">
      <ShieldAlert aria-hidden="true" size={14} strokeWidth={2} />
      소속 기업 (투자 불가)
    </p>
  );
}

/** 자기 소속 기업 카드에서 증감 버튼 자리에 들어가는 안내. */
export function OwnTeamNotice({ units }: { units: number }) {
  return (
    <p className="mt-3 rounded-md bg-danger-surface px-3 py-3 text-danger">
      본인 기업에는 투자할 수 없습니다.{units > 0 ? ` (현재 배분 ${units}억 원)` : ""}
    </p>
  );
}
