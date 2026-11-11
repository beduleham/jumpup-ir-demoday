import { NextResponse } from "next/server";
import { healthCheckResponseSchema } from "@/lib/health";

// 요청 시각을 돌려주므로 빌드 시점에 정적으로 굳히지 않는다.
export const dynamic = "force-dynamic";

export function GET() {
  const parsed = healthCheckResponseSchema.safeParse({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    console.error("[health] 응답 생성 실패", parsed.error.issues);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(parsed.data);
}
