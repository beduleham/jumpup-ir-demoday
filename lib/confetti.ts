import confetti from "canvas-confetti";

// 축하 효과 색. tailwind 토큰(primary, accent, stage.text)과 같은 값이다.
const COLORS = ["#005BAC", "#FF6B00", "#F8FAFC"];
const DURATION_MS = 3000;
const INTERVAL_MS = 250;
// 왼쪽·가운데·오른쪽에서 4개씩, 12회 = 총 144개(저사양 PC를 고려해 150개 이하)
const PER_BURST = 4;
const BURSTS = [
  { x: 0, angle: 60 },
  { x: 0.5, angle: 90 },
  { x: 1, angle: 120 },
];

/**
 * 1위 공개 축하 효과를 3초 동안 쏜다. 브라우저에서만 부른다.
 * 움직임 줄이기 설정이면 쏘지 않는다. 돌려주는 함수를 부르면 즉시 멈추고 화면을 비운다.
 */
export function fireWinnerConfetti(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const until = Date.now() + DURATION_MS;
  const timer = setInterval(() => {
    if (Date.now() >= until) {
      clearInterval(timer);
      return;
    }
    for (const burst of BURSTS) {
      void confetti({
        particleCount: PER_BURST,
        angle: burst.angle,
        spread: 60,
        origin: { x: burst.x, y: 0.7 },
        colors: COLORS,
      });
    }
  }, INTERVAL_MS);

  return () => {
    clearInterval(timer);
    confetti.reset();
  };
}
