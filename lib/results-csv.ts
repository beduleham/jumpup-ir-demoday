import type { AdminDashboard } from "@/types/admin";

// 엑셀이 UTF-8로 인식하도록 파일 맨 앞에 붙이는 BOM
const BOM = "﻿";

function cell(value: string | number): string {
  let text = String(value);
  // 엑셀이 수식으로 실행하지 않도록, 수식 기호로 시작하는 문자열 앞에 작은따옴표를 붙인다.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function line(values: Array<string | number>): string {
  return values.map(cell).join(",");
}

/**
 * 최종 순위표와 투자자×기업 상세 매트릭스를 한 CSV로 만든다(금액 단위: 억 원).
 * CSV에는 시트가 없으므로 두 표를 빈 줄로 구분한다.
 */
export function buildResultsCsv(
  dashboard: Pick<AdminDashboard, "teams" | "investors">,
  investments: Array<{ investor_id: string; team_id: string; amount_units: number }>,
): string {
  const lines: string[] = [];

  lines.push(line(["최종 순위표"]));
  lines.push(
    line(["최종순위", "기업번호", "기업명", "대표자", "총유치액(억원)", "투자자수", "외부투자유치액(억원)", "수동조정여부"]),
  );
  for (const team of dashboard.teams) {
    lines.push(
      line([
        team.final_rank,
        team.team_no,
        team.company_name,
        team.leader_name,
        team.total_raised_units,
        team.investor_count,
        team.external_raised_units,
        team.manual_rank_override === null ? "N" : "Y",
      ]),
    );
  }

  const columns = [...dashboard.teams].sort((a, b) => a.team_no - b.team_no);
  const companyById = new Map(columns.map((team) => [team.id, team.company_name]));
  const amounts = new Map(investments.map((row) => [`${row.investor_id}|${row.team_id}`, row.amount_units]));

  lines.push("");
  lines.push(line(["상세 투자 매트릭스 (억원)"]));
  lines.push(
    line([
      "투자자번호",
      "투자자명",
      "소속",
      ...columns.map((team) => `${team.team_no}번 ${team.company_name}`),
      "합계",
    ]),
  );
  for (const investor of dashboard.investors) {
    const affiliation = investor.team_id ? (companyById.get(investor.team_id) ?? "") : "외부 투자자";
    lines.push(
      line([
        investor.investor_no,
        investor.investor_name,
        affiliation,
        ...columns.map((team) => amounts.get(`${investor.id}|${team.id}`) ?? 0),
        investor.allocated_units,
      ]),
    );
  }

  // 엑셀 호환을 위해 줄바꿈은 CRLF로 쓴다.
  return BOM + lines.join("\r\n") + "\r\n";
}

/** jumpup_ir_results_YYYYMMDD_HHMM.csv (대한민국 표준시 기준) */
export function resultsCsvFilename(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `jumpup_ir_results_${get("year")}${get("month")}${get("day")}_${get("hour")}${get("minute")}.csv`;
}
