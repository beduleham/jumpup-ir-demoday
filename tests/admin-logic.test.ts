import { describe, expect, it } from "vitest";
import { createAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { parseBulkText, toRegisterRows } from "@/lib/bulk-parse";
import { rankTeams, tiedTeamNumbers, type RankableTeam } from "@/lib/ranking";
import { buildResultsCsv, resultsCsvFilename } from "@/lib/results-csv";
import { createSessionToken } from "@/lib/session";

const SECRET = "test-only-session-secret-0123456789abcdef";

describe("관리자 세션 토큰", () => {
  const issued = new Date("2026-11-11T00:00:00Z");
  const hours = (n: number) => new Date(issued.getTime() + n * 3_600_000);

  it("발급 후 12시간 동안만 유효하다", () => {
    const token = createAdminToken(SECRET, issued);
    expect(verifyAdminToken(token, SECRET, hours(11.9))).toBe(true);
    expect(verifyAdminToken(token, SECRET, hours(12))).toBe(false);
  });

  it("다른 키, 변조, 형식 오류를 거부한다", () => {
    const token = createAdminToken(SECRET, issued);
    expect(verifyAdminToken(token, "another-secret-0123456789abcdef-xyz", issued)).toBe(false);
    expect(verifyAdminToken(`${token}x`, SECRET, issued)).toBe(false);
    expect(verifyAdminToken("", SECRET, issued)).toBe(false);
  });

  it("참가자 세션 토큰은 관리자 토큰으로 통하지 않는다", () => {
    const participant = createSessionToken(
      { investor_id: "i", investor_no: 1, investor_name: "홍길동", investor_type: "founder", team_id: "t", company_name: "큐네스티" },
      SECRET,
      issued,
    );
    expect(verifyAdminToken(participant, SECRET, issued)).toBe(false);
  });
});

describe("일괄 등록 텍스트 해석", () => {
  it("머리글을 건너뛰고 기업과 외부 심사위원을 구분하며 전화번호를 정규화한다", () => {
    const text = [
      "순번\t기업명\t대표자명\t전화번호\t아이템 소개\t비고",
      "1\t큐네스티\t홍길동\t010-1234-5678\t행사 운영 솔루션\t",
      "",
      "101\t\t김심사\t010 9999 0101\t\t멘토",
    ].join("\r\n");
    const { rows, hasErrors } = parseBulkText(text);
    expect(hasErrors).toBe(false);
    expect(rows).toMatchObject([
      { line: 2, no: 1, kind: "founder", company_name: "큐네스티", leader_name: "홍길동", phone: "01012345678", description: "행사 운영 솔루션" },
      { line: 4, no: 101, kind: "external", company_name: "", leader_name: "김심사", phone: "01099990101", note: "멘토" },
    ]);
    expect(toRegisterRows(rows)).toEqual([
      { no: 1, company_name: "큐네스티", leader_name: "홍길동", phone: "010-1234-5678", description: "행사 운영 솔루션", note: "" },
      { no: 101, company_name: "", leader_name: "김심사", phone: "010 9999 0101", description: "", note: "멘토" },
    ]);
  });

  it("머리글이 없어도 첫 행을 데이터로 읽는다", () => {
    const { rows } = parseBulkText("1\t큐네스티\t홍길동\t01012345678");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ line: 1, no: 1, errors: [] });
  });

  it("행별 오류와 중복을 표시한다", () => {
    const text = [
      "1\t큐네스티\t홍길동\t01012345678",
      "1\t그린루프\t김하늘\t01022223333",
      "3\t메디브릿지\t박서준\t010-1234-5678",
      "4\t\t이수민\t010-12",
      "100\t로컬\t최지우\t01055556666",
      "x\t로컬\t\t01077778888",
      "0\t로컬\t정하나\t0212345678",
    ].join("\n");
    const { rows, hasErrors } = parseBulkText(text);
    expect(hasErrors).toBe(true);
    expect(rows[0].errors).toEqual(["순번 1 중복 감지 (행 1, 2)", "전화번호 01012345678 중복 감지 (행 1, 3)"]);
    expect(rows[1].errors).toEqual(["순번 1 중복 감지 (행 1, 2)"]);
    expect(rows[2].errors).toEqual(["전화번호 01012345678 중복 감지 (행 1, 3)"]);
    expect(rows[3].errors).toEqual([
      "1~99번 기업은 기업명이 필수입니다.",
      "유효하지 않은 전화번호입니다 (숫자 10~11자리 필요).",
    ]);
    expect(rows[4].errors).toEqual(["순번 100번은 예약 번호로 사용할 수 없습니다."]);
    expect(rows[5].errors).toEqual(["순번은 1 이상의 정수여야 합니다.", "대표자/심사자 성명은 필수입니다."]);
    expect(rows[6].errors).toEqual([
      "순번은 1 이상의 정수여야 합니다.",
      "유효하지 않은 전화번호입니다 (숫자 10~11자리 필요).",
    ]);
  });

  it("열이 부족한 행과 100행 초과를 알린다", () => {
    expect(parseBulkText("1\t큐네스티").rows[0].errors[0]).toBe("열이 부족합니다. 6열을 탭으로 구분해 붙여넣어 주세요.");
    const many = Array.from({ length: 101 }, (_, i) => `${101 + i}\t\t심사\t0104444${String(i).padStart(4, "0")}`).join("\n");
    const result = parseBulkText(many);
    expect(result.hasErrors).toBe(true);
    expect(result.rows[100].errors).toEqual(["한 번에 100행까지만 등록할 수 있습니다."]);
  });
});

describe("순위 계산", () => {
  const team = (team_no: number, total: number, count: number, external: number, override: number | null = null) =>
    ({ team_no, total_raised_units: total, investor_count: count, external_raised_units: external, manual_rank_override: override }) satisfies RankableTeam;

  it("유치액 → 투자자 수 → 외부 유치액 → 기업 번호 순으로 정렬한다", () => {
    const ranked = rankTeams([team(1, 5, 2, 0), team(2, 8, 1, 0), team(3, 5, 3, 0), team(4, 5, 3, 2), team(5, 5, 3, 2)]);
    expect(ranked.map((t) => t.team_no)).toEqual([2, 4, 5, 3, 1]);
    expect(ranked.map((t) => t.calculated_rank)).toEqual([1, 2, 3, 4, 5]);
    expect(ranked.map((t) => t.final_rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("수동 순위를 지정한 기업은 그 순위를 갖고 나머지가 빈 순위를 채운다", () => {
    const ranked = rankTeams([team(1, 9, 3, 0), team(2, 7, 2, 0), team(3, 7, 2, 0, 2), team(4, 1, 1, 0)]);
    expect(ranked.map((t) => [t.team_no, t.final_rank])).toEqual([[1, 1], [3, 2], [2, 3], [4, 4]]);
    expect(ranked.find((t) => t.team_no === 3)?.calculated_rank).toBe(3);
  });

  it("같은 수동 순위를 여러 기업에 주면 공동 순위가 되고, 다음 순위는 그만큼 건너뛴다", () => {
    const ranked = rankTeams([team(1, 9, 3, 0, 1), team(2, 7, 2, 0, 1), team(3, 5, 1, 0), team(4, 1, 1, 0)]);
    expect(ranked.map((t) => [t.team_no, t.final_rank])).toEqual([[1, 1], [2, 1], [3, 3], [4, 4]]);
  });

  it("수동 순위를 해제하면 자동 정렬 순위로 돌아간다", () => {
    const ranked = rankTeams([team(1, 9, 3, 0), team(2, 7, 2, 0), team(3, 7, 2, 0), team(4, 1, 1, 0)]);
    expect(ranked.map((t) => [t.team_no, t.final_rank])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4]]);
  });

  it("유치액·투자자 수·외부 유치액이 모두 같은 기업만 동점으로 잡는다", () => {
    const tied = tiedTeamNumbers([team(1, 7, 2, 3), team(2, 7, 2, 3), team(3, 7, 2, 0), team(4, 7, 3, 3), team(5, 1, 1, 0)]);
    expect([...tied].sort()).toEqual([1, 2]);
    expect(tiedTeamNumbers([team(1, 5, 1, 0), team(2, 4, 1, 0)]).size).toBe(0);
  });
});

describe("결과 CSV", () => {
  const teams = rankTeams([
    { id: "t1", team_no: 1, company_name: "큐네스티", leader_name: "홍길동", phone: "", description: "", note: "", total_raised_units: 3, investor_count: 1, external_raised_units: 3, manual_rank_override: null },
    { id: "t2", team_no: 2, company_name: '=SUM(A1), "그린"', leader_name: "김하늘", phone: "", description: "", note: "", total_raised_units: 5, investor_count: 2, external_raised_units: 0, manual_rank_override: 1 },
  ]);
  const investors = [
    { id: "i1", investor_no: 1, investor_name: "홍길동", phone: "", investor_type: "founder" as const, team_id: "t1", allocated_units: 5, remaining_units: 5, is_submitted: false },
    { id: "i101", investor_no: 101, investor_name: "김심사", phone: "", investor_type: "external" as const, team_id: null, allocated_units: 3, remaining_units: 7, is_submitted: false },
  ];
  const generatedAt = new Date("2026-11-13T08:30:05Z"); // 한국 시간 17:30:05
  const csv = buildResultsCsv(
    { teams, investors },
    [
      { investor_id: "i1", team_id: "t2", amount_units: 5 },
      { investor_id: "i101", team_id: "t1", amount_units: 3 },
    ],
    generatedAt,
  );
  const lines = csv.slice(1).split("\r\n");

  it("UTF-8 BOM으로 시작하고 CRLF로 줄을 나눈다", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(Buffer.from(csv, "utf8").subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1)).not.toMatch(/[^\r]\n/);
  });

  it("제목과 한국 시간 기준 생성일시로 시작한다", () => {
    expect(lines[0]).toBe('"[광명 스타트업 점프업 모의 IR 데모데이 최종 집계 결과]"');
    expect(lines[1]).toBe('"생성일시","2026-11-13 17:30:05"');
    expect(lines[2]).toBe("");
  });

  it("1번 표: 최종 순위 요약. 글자 칸은 따옴표로 감싸고 쉼표·따옴표·수식을 안전하게 처리한다", () => {
    expect(lines[3]).toBe('"[1. 최종 순위 요약]"');
    expect(lines[4]).toBe(
      '"최종순위","기업번호","기업명","대표자명","총유치액(억원)","유치건수","외부투자유치액(억원)","순위보정여부"',
    );
    expect(lines[5]).toBe(`1,2,"'=SUM(A1), ""그린""","김하늘",5,2,0,"수동보정"`);
    expect(lines[6]).toBe('2,1,"큐네스티","홍길동",3,1,3,"자동정렬"');
    expect(lines[7]).toBe("");
  });

  it("2번 표: 투자자별 상세 배분, 개인 합계와 잔여 예산", () => {
    expect(lines[8]).toBe('"[2. 상세 투자 배분 매트릭스 (단위: 억원)]"');
    expect(lines[9]).toBe(
      // 열 제목은 "2번("으로 시작하므로 수식으로 읽히지 않아 작은따옴표를 붙이지 않는다.
      `"투자자번호","투자자명","투자자구분","소속기업/기관","1번(큐네스티)","2번(=SUM(A1), ""그린"")","개인투자총액(억원)","잔여예산(억원)"`,
    );
    expect(lines[10]).toBe('1,"홍길동","참여기업(대표)","큐네스티",0,5,5,5');
    expect(lines[11]).toBe('101,"김심사","외부심사위원","",3,0,3,7');
  });

  it("칸 안의 줄바꿈은 따옴표 안에 그대로 두어 한 칸으로 읽히게 한다", () => {
    const first = teams.find((team) => team.team_no === 1);
    if (!first) throw new Error("1번 기업이 없습니다.");
    const multiline = buildResultsCsv(
      { teams: rankTeams([{ ...first, company_name: "첫 줄\n둘째 줄, 쉼표" }]), investors: [] },
      [],
      generatedAt,
    );
    expect(multiline).toContain('1,1,"첫 줄\n둘째 줄, 쉼표","홍길동"');
  });

  it("투자가 한 건도 없어도 명단과 0으로 채운 표가 나온다", () => {
    const empty = buildResultsCsv(
      {
        teams: rankTeams(teams.map((team) => ({ ...team, total_raised_units: 0, investor_count: 0, external_raised_units: 0, manual_rank_override: null }))),
        investors: investors.map((investor) => ({ ...investor, allocated_units: 0, remaining_units: 10 })),
      },
      [],
      generatedAt,
    )
      .slice(1)
      .split("\r\n");
    expect(empty[5]).toBe('1,1,"큐네스티","홍길동",0,0,0,"자동정렬"');
    expect(empty[10]).toBe('1,"홍길동","참여기업(대표)","큐네스티",0,0,0,10');
    expect(empty[11]).toBe('101,"김심사","외부심사위원","",0,0,0,10');
  });

  it("파일 이름은 한국 시간 기준이다", () => {
    expect(resultsCsvFilename(new Date("2026-11-11T16:05:00Z"))).toBe("jumpup_ir_results_20261112_0105.csv");
  });
});
