export const MAX_U64 = (1n << 64n) - 1n;
export const TITLE_MAX_BYTES = 96;
export const DESCRIPTION_MAX_BYTES = 512;
export const CORRECTIVE_ACTION_MAX_BYTES = 512;
export const CORRECTIVE_ACTION_MIN_CHARS = 10;

// Rust str::trim usa Unicode White_Space; JS trim difiere para U+0085 y BOM.
export function rustTrim(value: string): string {
  return value.replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
}
