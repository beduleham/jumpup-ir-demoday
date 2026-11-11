import Image from "next/image";
import { OnboardingEntry } from "@/components/onboarding/OnboardingEntry";
import logoCenter from "@/public/logo_center.png";
import logoGwangmyeong from "@/public/logo_gwangmyeong.png";

export function HomeHeader({ investorType }: { investorType?: "founder" | "external" }) {
  return (
    <header className="border-b border-border bg-surface px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src={logoGwangmyeong} alt="광명시" priority className="h-12 w-auto" />
          <Image src={logoCenter} alt="광명시청년창업지원센터" priority className="h-12 w-auto" />
        </div>
        <OnboardingEntry investorType={investorType} />
      </div>
      <h1 className="mt-3 text-h2 text-text">2026 광명 스타트업 점프업 모의 IR 데모데이</h1>
    </header>
  );
}
