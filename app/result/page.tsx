import type { Metadata } from "next";
import { ResultDisplay } from "@/components/display/ResultDisplay";

export const metadata: Metadata = {
  title: "대형 스크린 | 모의 IR 데모데이",
};

// 로그인 없이 누구나 여는 보기 전용 화면. 순위는 서버 API가 결과 공개 전까지 가린다.
export default function ResultPage() {
  return <ResultDisplay />;
}
