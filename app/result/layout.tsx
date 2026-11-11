import type { ReactNode } from "react";
import { DisplayShell } from "@/components/shell/DisplayShell";

export default function ResultLayout({ children }: { children: ReactNode }) {
  return <DisplayShell>{children}</DisplayShell>;
}
