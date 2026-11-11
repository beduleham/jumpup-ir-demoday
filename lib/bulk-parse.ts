import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

// 스프레드시트에서 복사한 6열(순번, 기업명, 대표자명, 전화번호, 아이템 소개, 비고)의 해석과 검증.
// 화면의 미리보기와 서버(POST /api/admin/bulk-register)가 같은 검증 함수를 쓴다.

export const BULK_MAX_ROWS = 100;

/** 서버로 보내는 한 행. 전화번호는 입력한 그대로 보내고 서버가 정규화한다. */
export const bulkRegisterRowSchema = z.object({
  no: z.number(),
  company_name: z.string().max(200),
  leader_name: z.string().max(100),
  phone: z.string().max(40),
  description: z.string().max(2000),
  note: z.string().max(2000),
});
export type BulkRegisterRow = z.infer<typeof bulkRegisterRowSchema>;

export const bulkRegisterRequestSchema = z.object({
  rows: z.array(bulkRegisterRowSchema).min(1).max(BULK_MAX_ROWS),
});

/** 검증을 거친 한 행. errors가 비어 있어야 등록할 수 있다. */
export interface BulkRow {
  /** 화면·오류 문구에 쓰는 행 번호(붙여넣은 텍스트 기준 또는 요청 배열의 순서, 1부터) */
  line: number;
  /** 형식이 틀린 순번은 null */
  no: number | null;
  /** 1~99번은 기업과 그 대표, 101번 이상은 외부 심사위원 */
  kind: "founder" | "external" | null;
  company_name: string;
  leader_name: string;
  /** 숫자만 남긴 전화번호. 형식이 틀리면 null */
  phone: string | null;
  /** 입력된 전화번호 원문 */
  phone_input: string;
  description: string;
  note: string;
  errors: string[];
}

export interface BulkParseResult {
  rows: BulkRow[];
  hasErrors: boolean;
}

interface RawRow {
  line: number;
  /** 숫자가 아니면 null */
  no: number | null;
  company_name: string;
  leader_name: string;
  phone: string;
  description: string;
  note: string;
  /** 형태 자체의 문제(열 부족 등) */
  shapeErrors: string[];
}

function validate(raw: RawRow[]): BulkParseResult {
  const rows: BulkRow[] = raw.map((row) => {
    const errors = [...row.shapeErrors];
    const company = row.company_name.trim();
    const leader = row.leader_name.trim();

    let no: number | null = null;
    let kind: BulkRow["kind"] = null;
    if (row.no === null || !Number.isInteger(row.no) || row.no < 1) {
      errors.push("순번은 1 이상의 정수여야 합니다.");
    } else if (row.no === 100) {
      errors.push("순번 100번은 예약 번호로 사용할 수 없습니다.");
    } else {
      no = row.no;
      kind = no <= 99 ? "founder" : "external";
    }

    if (kind === "founder" && company === "") errors.push("1~99번 기업은 기업명이 필수입니다.");
    if (leader === "") errors.push("대표자/심사자 성명은 필수입니다.");

    const phone = normalizePhone(row.phone);
    if (!phone) errors.push("유효하지 않은 전화번호입니다 (숫자 10~11자리 필요).");

    return {
      line: row.line,
      no,
      kind,
      company_name: company,
      leader_name: leader,
      phone,
      phone_input: row.phone.trim(),
      description: row.description.trim(),
      note: row.note.trim(),
      errors,
    };
  });

  markDuplicates(rows, (row) => row.no, (value) => `순번 ${value} 중복 감지`);
  markDuplicates(rows, (row) => row.phone, (value) => `전화번호 ${value} 중복 감지`);

  if (rows.length > BULK_MAX_ROWS) {
    rows[BULK_MAX_ROWS].errors.push(`한 번에 ${BULK_MAX_ROWS}행까지만 등록할 수 있습니다.`);
  }

  return { rows, hasErrors: rows.some((row) => row.errors.length > 0) };
}

/** 같은 값이 여러 행에 있으면 그 행들 모두에 "… 중복 감지 (행 a, b)"를 붙인다. */
function markDuplicates(
  rows: BulkRow[],
  key: (row: BulkRow) => string | number | null,
  message: (value: string | number) => string,
) {
  const groups = new Map<string | number, BulkRow[]>();
  for (const row of rows) {
    const value = key(row);
    if (value === null) continue;
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  for (const [value, group] of groups) {
    if (group.length < 2) continue;
    const lines = group.map((row) => row.line).join(", ");
    for (const row of group) row.errors.push(`${message(value)} (행 ${lines})`);
  }
}

function isHeader(cells: string[]): boolean {
  const first = cells[0].replace(/\s/g, "").toLowerCase();
  return first === "순번" || first === "번호" || first === "no" || first === "no.";
}

/** 붙여넣은 탭 구분 텍스트를 해석하고 검증한다. 빈 줄과 첫 머리글 행은 건너뛴다. */
export function parseBulkText(text: string): BulkParseResult {
  const raw: RawRow[] = [];

  text.split(/\r?\n/).forEach((lineText, index) => {
    if (lineText.trim() === "") return;
    const cells = lineText.split("\t").map((cell) => cell.trim());
    if (raw.length === 0 && isHeader(cells)) return;

    const [noText = "", company = "", leader = "", phone = "", description = "", note = ""] = cells;
    raw.push({
      line: index + 1,
      no: /^\d+$/.test(noText) ? Number(noText) : null,
      company_name: company,
      leader_name: leader,
      phone,
      description,
      note,
      shapeErrors:
        cells.length < 4 ? ["열이 부족합니다. 6열을 탭으로 구분해 붙여넣어 주세요."] : [],
    });
  });

  return validate(raw);
}

/** 서버가 받은 행 배열을 같은 규칙으로 검증한다. 행 번호는 배열 순서(1부터)다. */
export function validateBulkRows(rows: BulkRegisterRow[]): BulkParseResult {
  return validate(rows.map((row, index) => ({ ...row, line: index + 1, shapeErrors: [] })));
}

/** 검증을 통과한 행을 서버로 보낼 형태로 바꾼다. */
export function toRegisterRows(rows: BulkRow[]): BulkRegisterRow[] {
  return rows.flatMap((row) =>
    row.no === null
      ? []
      : [
          {
            no: row.no,
            company_name: row.company_name,
            leader_name: row.leader_name,
            phone: row.phone_input,
            description: row.description,
            note: row.note,
          },
        ],
  );
}
