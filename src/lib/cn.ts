/** 조건부 className 결합 (외부 라이브러리 없이) */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
