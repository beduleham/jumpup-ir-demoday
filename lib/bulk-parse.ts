import { normalizePhone } from "@/lib/phone";

// 스프레드시트에서 복사한 6열(순번, 기업명, 대표자명, 전화번호, 아이템 소개, 비고)을 해석한다.
// 화면의 미리보기와 서버 검증이 같은 규칙을 쓰도록 양쪽에서 함께 사용한다.

export interface BulkRow {
  /** 붙여넣은 텍스트에서의 행 번호(1부터, 빈 줄·머리글 포함) */
  line: number;
  no: number | null;
  company_name: string;
  leader_name: string;
  /** 숫자만 남긴 전화번호. 형식이 틀리면 null */
  phone: string | null;
  /** 입력된 전화번호 원문(미리보기용) */
  phone_input: string;
  description: string;
  note: string;
  errors: string[];
}

export interface BulkParseResult {
  rows: BulkRow[];
  hasErrors: boolean;
}

function isHeader(cells: string[]): boolean {
  return cells[0] === "순번" || cells[0].toLowerCase() === "no";
}

export function parseBulkText(text: string): BulkParseResult {
  const rows: BulkRow[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === "") return;
    const cells = raw.split("\t").map((cell) => cell.trim());
    if (rows.length === 0 && isHeader(cells)) return;

    const [noText = "", company = "", leader = "", phoneInput = "", description = "", note = ""] = cells;
    const errors: string[] = [];

    if (cells.length < 4) errors.push("열이 부족합니다. 6열을 탭으로 구분해 붙여넣어 주세요.");

    const no = /^\d+$/.test(noText) ? Number(noText) : null;
    if (no === null) errors.push("순번은 숫자여야 합니다.");
    else if (no < 1 || no === 100) errors.push("순번은 기업 1~99, 외부 심사위원 101 이상입니다.");

    if (no !== null && no <= 99 && company === "") errors.push("기업명이 비어 있습니다.");
    if (leader === "") errors.push("대표자명(성명)이 비어 있습니다.");

    const phone = normalizePhone(phoneInput);
    if (!phone) errors.push("전화번호는 숫자 10~11자리여야 합니다.");

    rows.push({
      line: index + 1,
      no,
      company_name: company,
      leader_name: leader,
      phone,
      phone_input: phoneInput,
      description,
      note,
      errors,
    });
  });

  markDuplicates(rows, (row) => row.no, "순번이");
  markDuplicates(rows, (row) => row.phone, "전화번호가");

  return { rows, hasErrors: rows.some((row) => row.errors.length > 0) };
}

function markDuplicates(
  rows: BulkRow[],
  key: (row: BulkRow) => string | number | null,
  /** 조사까지 붙인 항목 이름 (예: "순번이") */
  label: string,
) {
  const firstLine = new Map<string | number, number>();
  for (const row of rows) {
    const value = key(row);
    if (value === null) continue;
    const seen = firstLine.get(value);
    if (seen === undefined) firstLine.set(value, row.line);
    else row.errors.push(`${label} ${seen}행과 중복됩니다.`);
  }
}
