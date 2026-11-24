// Verified phone numbers registry (normalized Egyptian mobile format)

export const VERIFIED_PHONE_NUMBERS = new Set<string>(['01094482324']);

function toAsciiDigits(input: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)))
    .trim();
}

export function normalizePhoneForVerification(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const ascii = toAsciiDigits(rawPhone);
  const digits = ascii.replace(/\D/g, '');
  if (digits.startsWith('0020') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('20') && digits.length === 12 && digits[2] === '1') {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return digits;
}

export function isVerifiedPhone(phone?: string | null): boolean {
  const normalized = normalizePhoneForVerification(phone);
  return Boolean(normalized && VERIFIED_PHONE_NUMBERS.has(normalized));
}
