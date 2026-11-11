/** 하이픈·공백 등을 뺀 숫자만 남긴다. 10~11자리 휴대폰 번호가 아니면 null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  return /^\d{10,11}$/.test(digits) ? digits : null;
}
