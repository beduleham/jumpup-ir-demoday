import { CircleHelp } from "lucide-react";

/** 이용 안내를 다시 여는 물음표 버튼(터치 영역 44×44px). */
export function HelpTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="이용 안내 보기"
      aria-haspopup="dialog"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <CircleHelp aria-hidden="true" size={24} strokeWidth={2} />
    </button>
  );
}
