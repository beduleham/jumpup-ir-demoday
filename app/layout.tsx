import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "모의 IR 데모데이 가상 투자",
  description: "모의 IR 데모데이 현장에서 쓰는 실시간 가상 투자·집계 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
