/** 하이픈·공백 등을 뺀 숫자만 남긴다. 01로 시작하는 10~11자리 휴대폰 번호가 아니면 null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  return /^01\d{8,9}$/.test(digits) ? digits : null;
}
