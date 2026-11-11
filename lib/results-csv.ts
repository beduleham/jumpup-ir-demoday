import type { AdminDashboard } from "@/types/admin";

// 엑셀이 UTF-8로 인식하도록 파일 맨 앞에 붙이는 BOM
const BOM = "﻿";

const SEOUL = "Asia/Seoul";

/** 글자 칸은 항상 큰따옴표로 감싸고(RFC 4180) 안의 큰따옴표는 두 번 쓴다. 숫자는 그대로 쓴다. */
function cell(value: string | number): string {
  if (typeof value === "number") return String(value);
  // 엑셀이 수식으로 실행하지 않도록, 수식 기호로 시작하는 글자 앞에 작은따옴표를 붙인다.
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

function line(values: Array<string | number>): string {
  return values.map(cell).join(",");
}

function seoulParts(now: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/**
 * 최종 순위 요약과 투자자×기업 상세 매트릭스를 한 CSV로 만든다(금액 단위: 억 원).
 * CSV에는 시트가 없으므로 두 표를 제목 줄과 빈 줄로 구분한다. 투자가 한 건도 없어도 명단과 0으로 채운 표가 나온다.
 */
export function buildResultsCsv(
  dashboard: Pick<AdminDashboard, "teams" | "investors">,
  investments: Array<{ investor_id: string; team_id: string; amount_units: number }>,
  now: Date = new Date(),
): string {
  const t = seoulParts(now);
  const lines: string[] = [];

  lines.push(line(["[광명 스타트업 점프업 모의 IR 데모데이 최종 집계 결과]"]));
  lines.push(line(["생성일시", `${t.year}-${t.month}-${t.day} ${t.hour}:${t.minute}:${t.second}`]));
  lines.push("");

  lines.push(line(["[1. 최종 순위 요약]"]));
  lines.push(
    line(["최종순위", "기업번호", "기업명", "대표자명", "총유치액(억원)", "유치건수", "외부투자유치액(억원)", "순위보정여부"]),
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
        team.manual_rank_override === null ? "자동정렬" : "수동보정",
      ]),
    );
  }

  const columns = [...dashboard.teams].sort((a, b) => a.team_no - b.team_no);
  const companyById = new Map(columns.map((team) => [team.id, team.company_name]));
  const amounts = new Map(investments.map((row) => [`${row.investor_id}|${row.team_id}`, row.amount_units]));

  lines.push("");
  lines.push(line(["[2. 상세 투자 배분 매트릭스 (단위: 억원)]"]));
  lines.push(
    line([
      "투자자번호",
      "투자자명",
      "투자자구분",
      "소속기업/기관",
      ...columns.map((team) => `${team.team_no}번(${team.company_name})`),
      "개인투자총액(억원)",
      "잔여예산(억원)",
    ]),
  );
  for (const investor of dashboard.investors) {
    const founder = investor.investor_type === "founder";
    lines.push(
      line([
        investor.investor_no,
        investor.investor_name,
        founder ? "참여기업(대표)" : "외부심사위원",
        // 외부 심사위원의 소속 기관은 저장하지 않으므로 비워 둔다.
        founder && investor.team_id ? (companyById.get(investor.team_id) ?? "") : "",
        ...columns.map((team) => amounts.get(`${investor.id}|${team.id}`) ?? 0),
        investor.allocated_units,
        investor.remaining_units,
      ]),
    );
  }

  // 엑셀 호환을 위해 줄바꿈은 CRLF로 쓴다.
  return BOM + lines.join("\r\n") + "\r\n";
}

/** jumpup_ir_results_YYYYMMDD_HHMM.csv (대한민국 표준시 기준) */
export function resultsCsvFilename(now: Date = new Date()): string {
  const t = seoulParts(now);
  return `jumpup_ir_results_${t.year}${t.month}${t.day}_${t.hour}${t.minute}.csv`;
}
