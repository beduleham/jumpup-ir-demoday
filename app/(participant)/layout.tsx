import type { ReactNode } from "react";
import { MobileShell } from "@/components/shell/MobileShell";

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
