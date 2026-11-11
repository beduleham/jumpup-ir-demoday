"use client";

import { useEffect, useState } from "react";
import { HelpTriggerButton } from "@/components/common/HelpTriggerButton";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { getStorageItem, setStorageItem } from "@/lib/storage";

// ‘다시 보지 않기’를 고른 브라우저는 다시 띄우지 않는다(계속 유지).
const DISMISSED_KEY = "jumpup_onboarding_dismissed";
// 그냥 닫은 경우에는 이 탭을 쓰는 동안만 다시 띄우지 않는다(새로고침할 때마다 뜨면 투자에 방해가 된다).
const SEEN_KEY = "jumpup_onboarding_seen";

type OpenMode = "auto" | "manual" | null;

/** 헤더의 이용 안내 버튼과, 첫 접속 때 스스로 뜨는 투자 규칙 안내. */
export function OnboardingEntry({ investorType }: { investorType?: "founder" | "external" }) {
  // 저장소는 브라우저에서만 읽을 수 있으므로, 처음에는 닫힌 상태로 그리고 마운트된 뒤에 결정한다.
  const [mode, setMode] = useState<OpenMode>(null);

  useEffect(() => {
    const dismissed = getStorageItem("local", DISMISSED_KEY) === "true";
    const seen = getStorageItem("session", SEEN_KEY) === "true";
    if (!dismissed && !seen) setMode("auto");
  }, []);

  function close(dontShowAgain: boolean) {
    if (mode === "auto") {
      // 저장소가 막혀 있어도 닫히기는 한다(그 경우 다음 접속 때 다시 뜬다).
      setStorageItem("session", SEEN_KEY, "true");
      if (dontShowAgain) setStorageItem("local", DISMISSED_KEY, "true");
    }
    setMode(null);
  }

  return (
    <>
      <HelpTriggerButton onClick={() => setMode("manual")} />
      {mode ? <OnboardingModal auto={mode === "auto"} investorType={investorType} onClose={close} /> : null}
    </>
  );
}
