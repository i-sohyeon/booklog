/** 로컬 타임존 기준 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function daysAgoKey(n: number): string {
  return toDateKey(daysAgo(n));
}

export function daysAgoIso(n: number): string {
  return daysAgo(n).toISOString();
}

const DAY = 86_400_000;

export function diffInDays(a: Date, b: Date): number {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((a0 - b0) / DAY);
}

/** "방금 전 / 3시간 전 / 어제 / 5일 전 / 2026.10.12" */
export function formatRelative(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const days = diffInDays(now, d);
  if (days === 0) return `${Math.floor(mins / 60)}시간 전`;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return formatDate(d);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? (d.length === 10 ? parseDateKey(d) : new Date(d)) : d;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatToday(d = new Date()): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

export function getGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return '고요한 밤이에요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '여유로운 오후예요';
  return '편안한 저녁이에요';
}
