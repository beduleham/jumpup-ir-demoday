import { STATUS_LABELS, type CompetitionStatus } from "@/types/competition";

// 대회 라이프사이클: 준비 ↔ 발표 중 ↔ 투자 오픈 → 투자 마감 → 결과 공개
export const STAGE_ORDER: readonly CompetitionStatus[] = ["ready", "pitching", "open", "closed", "revealed"];

const OPEN_INDEX = STAGE_ORDER.indexOf("open");

/** 투자가 열린 뒤(오픈·마감·공개)에 그 이전 단계로 돌아가는 전환인지. 명시적 확인이 필요하다. */
export function isRevert(from: CompetitionStatus, to: CompetitionStatus): boolean {
  const fromIndex = STAGE_ORDER.indexOf(from);
  return STAGE_ORDER.indexOf(to) < fromIndex && fromIndex >= OPEN_INDEX;
}

/** 앞으로는 바로 다음 단계로만 갈 수 있다(예: 투자 오픈에서 마감을 건너뛰고 결과 공개로 갈 수 없다). */
export function isSkip(from: CompetitionStatus, to: CompetitionStatus): boolean {
  return STAGE_ORDER.indexOf(to) > STAGE_ORDER.indexOf(from) + 1;
}

/**
 * 단계 전환이 허용되는지 검사한다. 허용되면 null, 아니면 관리자에게 보여 줄 사유를 돌려준다.
 * confirmedRevert: 관리자가 되돌리기 확인 창에서 확인한 요청인지.
 */
export function transitionProblem(
  from: CompetitionStatus,
  to: CompetitionStatus,
  confirmedRevert: boolean,
): string | null {
  if (from === to) return null;
  if (isSkip(from, to)) {
    const next = STAGE_ORDER[STAGE_ORDER.indexOf(from) + 1];
    return `'${STATUS_LABELS[from]}'에서 '${STATUS_LABELS[to]}'(으)로 건너뛸 수 없습니다. 먼저 '${STATUS_LABELS[next]}' 단계로 전환해 주세요.`;
  }
  if (isRevert(from, to) && !confirmedRevert) {
    return `'${STATUS_LABELS[from]}'에서 이전 단계로 되돌리려면 확인이 필요합니다.`;
  }
  return null;
}
