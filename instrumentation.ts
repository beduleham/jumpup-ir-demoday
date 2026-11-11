// 서버가 시작될 때 한 번 실행된다.
// 프로덕션에서 필수 환경 변수가 없거나 형식이 틀리면, 요청마다 500을 내며 떠 있지 않도록 시작 단계에서 멈춘다.
// (빌드는 비밀값 없이도 통과해야 하므로 빌드 단계에서는 검사하지 않는다.)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;

  const { getServerEnv, getSessionSecret } = await import("@/lib/env");
  const problems: string[] = [];
  for (const check of [getServerEnv, getSessionSecret]) {
    try {
      check();
    } catch (error) {
      // 메시지에는 변수 이름만 들어 있고 값은 없다.
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (problems.length === 0) return;

  console.error(`[startup] 서버를 시작할 수 없습니다.\n- ${problems.join("\n- ")}`);
  // 여기서 예외만 던지면 Next.js가 서버를 띄운 채 모든 요청에 500을 돌려준다. 확실히 멈춘다.
  process.exit(1);
}
