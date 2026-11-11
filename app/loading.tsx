// 영역별 로딩 화면이 없는 경로에서 쓰이는 공통 표시.
export default function Loading() {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <span
        aria-hidden="true"
        className="block h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary motion-reduce:animate-none"
      />
      <p className="text-text-muted">화면을 불러오는 중입니다…</p>
    </div>
  );
}
