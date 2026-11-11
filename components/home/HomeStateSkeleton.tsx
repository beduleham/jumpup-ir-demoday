const BLOCK = "animate-pulse rounded-md bg-border motion-reduce:animate-none";

export function HomeStateSkeleton() {
  return (
    <div role="status" aria-label="대회 정보를 불러오는 중입니다">
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className={`h-5 w-28 ${BLOCK}`} />
          <div className={`mt-3 h-6 w-full ${BLOCK}`} />
          <div className={`mt-2 h-4 w-3/4 ${BLOCK}`} />
        </div>
        <div className={`h-6 w-32 ${BLOCK}`} />
        <div className={`h-24 w-full rounded-xl ${BLOCK}`} />
        <div className={`h-24 w-full rounded-xl ${BLOCK}`} />
      </div>
    </div>
  );
}
