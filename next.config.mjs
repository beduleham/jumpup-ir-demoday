// 브라우저가 접속해도 되는 Supabase 주소(HTTP와 실시간 웹소켓). 값이 없으면 자기 출처만 허용한다.
function supabaseConnectSources() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { protocol, host } = new URL(url);
    return [`${protocol}//${host}`, `${protocol === "https:" ? "wss:" : "ws:"}//${host}`];
  } catch {
    // 형식이 잘못된 값은 서버 시작 시 환경 변수 검사(instrumentation.ts)가 알린다. 여기서는 허용 목록에 넣지 않는다.
    return [];
  }
}

const isDevelopment = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js가 페이지 데이터를 인라인 스크립트로 넣는다. 개발 서버는 eval도 쓴다.
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${["'self'", ...supabaseConnectSources()].join(" ")}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // 서버 시작 시 필수 환경 변수를 검사하는 instrumentation.ts를 켠다(Next.js 14에서는 실험 기능).
    instrumentationHook: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // 대회 상태·집계·관리자 응답이 브라우저나 CDN에 캐시되어 화면이 옛 상태로 남는 일을 막는 안전망.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
