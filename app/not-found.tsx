import { Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-4">
      <h1 className="text-h1 text-text">페이지를 찾을 수 없습니다</h1>
      <p className="text-text-muted">
        요청하신 페이지를 찾을 수 없습니다. 주소가 바뀌었거나 잘못 입력되었을 수 있습니다.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Home aria-hidden="true" size={20} strokeWidth={2} />
        홈으로 돌아가기
      </Link>
    </main>
  );
}
