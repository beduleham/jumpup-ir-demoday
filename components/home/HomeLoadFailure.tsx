"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { HomeErrorView } from "@/components/home/HomeErrorView";

/** 서버에서 대회 상태를 읽지 못했을 때: 다시 시도하면 서버 렌더링을 새로 요청한다. */
export function HomeLoadFailure() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return <HomeErrorView pending={pending} onRetry={() => startTransition(() => router.refresh())} />;
}
