export default function ResultLoading() {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-6">
      <span
        aria-hidden="true"
        className="block h-16 w-16 animate-spin rounded-full border-8 border-stage-border border-t-primary motion-reduce:animate-none"
      />
      <p className="text-h1 text-stage-muted">대회 화면을 준비 중입니다…</p>
    </div>
  );
}
