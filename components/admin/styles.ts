// 관리자 콘솔 공용 버튼·입력 모양(디자인 토큰 조합). 최소 높이 44px.
const BASE =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-3 text-body font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_PRIMARY = `${BASE} bg-primary text-primary-foreground hover:bg-primary-hover`;
export const BUTTON_SECONDARY = `${BASE} border border-text-muted bg-surface text-text hover:bg-body`;
export const BUTTON_DANGER = `${BASE} bg-danger text-primary-foreground`;

export const INPUT =
  "min-h-11 rounded-md border border-text-muted bg-surface px-3 text-body text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const PANEL = "rounded-xl border border-border bg-surface p-4";
export const TABLE_HEAD = "border-b border-border px-2 py-2 text-left text-caption font-semibold text-text-muted";
export const TABLE_CELL = "border-b border-border px-2 py-2 align-middle";
