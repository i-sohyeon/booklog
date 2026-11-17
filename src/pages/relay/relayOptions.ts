/** 릴레이 만들기·설정 바꾸기에서 함께 쓰는 선택지 */
export type Rounds = '2' | '3' | '4' | '5';
export type Hours = '12' | '24' | '72';

export const ROUND_OPTIONS: { value: Rounds; label: string }[] = [
  { value: '2', label: '2바퀴' },
  { value: '3', label: '3바퀴' },
  { value: '4', label: '4바퀴' },
  { value: '5', label: '5바퀴' },
];

export const HOUR_OPTIONS: { value: Hours; label: string }[] = [
  { value: '12', label: '12시간' },
  { value: '24', label: '하루' },
  { value: '72', label: '3일' },
];

/** 서버 값 → 선택지 (예전 1바퀴는 2바퀴로, 목록에 없는 시간은 하루로 표시) */
export const toRounds = (n: number): Rounds => (String(Math.min(5, Math.max(2, n))) as Rounds);
export const toHours = (n: number): Hours => (HOUR_OPTIONS.some((o) => o.value === String(n)) ? (String(n) as Hours) : '24');
