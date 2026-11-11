const BLOCK = "animate-pulse rounded-xl bg-border motion-reduce:animate-none";

export default function AdminLoading() {
  return (
    <div role="status" aria-label="관리자 콘솔을 불러오는 중입니다" className="flex flex-col gap-4">
      <div className={`h-24 ${BLOCK}`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={`h-24 ${BLOCK}`} />
        <div className={`h-24 ${BLOCK}`} />
        <div className={`h-24 ${BLOCK}`} />
      </div>
      <div className={`h-64 ${BLOCK}`} />
    </div>
  );
}
