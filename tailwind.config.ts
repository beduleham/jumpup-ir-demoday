import type { Config } from "tailwindcss";

// 마스터 스펙 "공유 시각 디자인 기초"의 토큰. 기능 코드는 역할 이름으로만 사용한다.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#005BAC",
          hover: "#004582",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#FF6B00",
          foreground: "#1E293B",
        },
        // 모바일·관리자 라이트 화면
        body: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        text: {
          DEFAULT: "#0F172A",
          muted: "#475569",
        },
        // /result 대형 스크린 다크 화면
        stage: {
          body: "#0F172A",
          surface: "#1E293B",
          border: "#334155",
          text: "#F8FAFC",
          muted: "#94A3B8",
        },
        // 시상 화면의 2·3위 포인트 색(1위는 accent). 다크 표면(#1E293B) 위 대비 7:1 이상.
        medal: {
          silver: "#CBD5E1",
          bronze: "#E0A878",
        },
        success: {
          DEFAULT: "#15803D",
          surface: "#DCFCE7",
          icon: "#16A34A",
        },
        warning: {
          DEFAULT: "#B45309",
          surface: "#FEF3C7",
          icon: "#D97706",
        },
        danger: {
          DEFAULT: "#B91C1C",
          surface: "#FEE2E2",
          icon: "#DC2626",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "display-1": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-2": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["1rem", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "500" }],
        body: ["0.875rem", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0em", fontWeight: "400" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
