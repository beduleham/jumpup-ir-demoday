import { CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { PANEL, TABLE_CELL, TABLE_HEAD } from "@/components/admin/styles";
import type { AdminInvestor } from "@/types/admin";

function Progress({ investor }: { investor: AdminInvestor }) {
  if (investor.is_submitted) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CircleCheck aria-hidden="true" size={20} strokeWidth={2} />
        완료
      </span>
    );
  }
  if (investor.allocated_units > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <CircleDot aria-hidden="true" size={20} strokeWidth={2} />
        진행 중
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-danger">
      <CircleDashed aria-hidden="true" size={20} strokeWidth={2} />
      미투자
    </span>
  );
}

/** 투자자별 진행 상황. 아직 덜 쓴 사람이 위에 오도록 잔여 예산이 많은 순으로 보여 준다. */
export function InvestorStatusList({ investors }: { investors: AdminInvestor[] }) {
  const ordered = [...investors].sort(
    (a, b) => b.remaining_units - a.remaining_units || a.investor_no - b.investor_no,
  );

  return (
    <section aria-labelledby="investors-title" className={PANEL}>
      <h2 id="investors-title" className="text-h2 text-text">
        투자자 현황
      </h2>
      <div
        className="mt-3 max-h-[28rem] overflow-auto"
        tabIndex={0}
        role="region"
        aria-labelledby="investors-title"
      >
        <table className="w-full min-w-[340px] whitespace-nowrap border-collapse text-body text-text">
          <thead>
            <tr>
              <th scope="col" className={TABLE_HEAD}>번호</th>
              <th scope="col" className={TABLE_HEAD}>이름</th>
              <th scope="col" className={TABLE_HEAD}>구분</th>
              <th scope="col" className={`${TABLE_HEAD} text-right`}>배분</th>
              <th scope="col" className={`${TABLE_HEAD} text-right`}>잔여</th>
              <th scope="col" className={TABLE_HEAD}>상태</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((investor) => (
              <tr key={investor.id}>
                <td className={TABLE_CELL}>{investor.investor_no}</td>
                <td className={TABLE_CELL}>{investor.investor_name}</td>
                <td className={TABLE_CELL}>{investor.investor_type === "founder" ? "대표" : "외부"}</td>
                <td className={`${TABLE_CELL} text-right`}>{investor.allocated_units}억</td>
                <td className={`${TABLE_CELL} text-right font-semibold`}>{investor.remaining_units}억</td>
                <td className={TABLE_CELL}>
                  <Progress investor={investor} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
