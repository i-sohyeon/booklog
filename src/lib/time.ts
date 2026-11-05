const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "11월 7일 (토) 오후 9:00" */
export function formatSchedule(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) ${ampm} ${hh}:${mm}`;
}

export type SessionPhase = 'upcoming' | 'open' | 'live' | 'ended';

/** 입장 가능 시간: 시작 10분 전 ~ 종료 */
export function sessionPhase(startsAt: string, durationMin: number, now = Date.now()): SessionPhase {
  const start = new Date(startsAt).getTime();
  const end = start + durationMin * 60_000;
  if (now >= end) return 'ended';
  if (now >= start) return 'live';
  if (now >= start - 10 * 60_000) return 'open';
  return 'upcoming';
}

/** "3일 후", "2시간 후", "곧 시작" */
export function untilLabel(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return '진행 중';
  const min = Math.round(diff / 60_000);
  if (min < 60) return `${min}분 후`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 후`;
  return `${Math.round(hr / 24)}일 후`;
}
