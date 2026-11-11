import type { ReactNode } from "react";
import { MobileShell } from "@/components/shell/MobileShell";
import { readSessionInvestor } from "@/lib/session";

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  // 표시 문구를 고르는 데만 쓴다. 권한 판단은 각 페이지와 API가 따로 한다.
  const session = readSessionInvestor();
  return <MobileShell investorType={session?.investor_type}>{children}</MobileShell>;
}
