import type { Genre, ReadingNote, ReadingSession } from '@/types/book';
import { parseDateKey, toDateKey } from '@/lib/date';
import type { ShelfItem } from './selectors';

/** 기록이 있는 연도 (+ 올해), 내림차순 */
export function availableYears(items: ShelfItem[], sessions: ReadingSession[], now = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const s of sessions) years.add(Number(s.date.slice(0, 4)));
  for (const i of items) {
    if (i.entry.finishedAt) years.add(Number(i.entry.finishedAt.slice(0, 4)));
    if (i.entry.startedAt) years.add(Number(i.entry.startedAt.slice(0, 4)));
  }
  return [...years].filter((y) => y <= now.getFullYear()).sort((a, b) => b - a);
}

export interface PeriodStats {
  finished: ShelfItem[];
  pages: number;
  readingDays: number;
  avgRating: number | null;
  /** dateKey → pages */
  daily: Map<string, number>;
}

function periodStats(items: ShelfItem[], sessions: ReadingSession[], prefix: string): PeriodStats {
  const daily = new Map<string, number>();
  for (const s of sessions) {
    if (!s.date.startsWith(prefix) || s.pages <= 0) continue;
    daily.set(s.date, (daily.get(s.date) ?? 0) + s.pages);
  }
  const finished = items
    .filter((i) => i.entry.status === 'done' && i.entry.finishedAt?.startsWith(prefix))
    .sort((a, b) => (a.entry.finishedAt ?? '').localeCompare(b.entry.finishedAt ?? ''));
  const rated = finished.filter((i) => i.entry.rating !== undefined);
  return {
    finished,
    pages: [...daily.values()].reduce((a, b) => a + b, 0),
    readingDays: daily.size,
    avgRating: rated.length ? rated.reduce((a, i) => a + (i.entry.rating ?? 0), 0) / rated.length : null,
    daily,
  };
}

export interface YearStats extends PeriodStats {
  year: number;
  monthlyPages: number[];
  monthlyFinished: number[];
  genres: Array<{ genre: Genre; count: number }>;
  longestStreak: number;
}

export function yearStats(items: ShelfItem[], sessions: ReadingSession[], year: number): YearStats {
  const base = periodStats(items, sessions, `${year}-`);
  const monthlyPages = Array<number>(12).fill(0);
  for (const [date, pages] of base.daily) monthlyPages[Number(date.slice(5, 7)) - 1]! += pages;
  const monthlyFinished = Array<number>(12).fill(0);
  for (const i of base.finished) monthlyFinished[Number(i.entry.finishedAt!.slice(5, 7)) - 1]! += 1;

  const genreMap = new Map<Genre, number>();
  for (const i of base.finished) genreMap.set(i.book.genre, (genreMap.get(i.book.genre) ?? 0) + 1);
  const genres = [...genreMap.entries()].map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count);

  // 최장 연속 독서일
  const days = [...base.daily.keys()].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const d = parseDateKey(key);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { ...base, year, monthlyPages, monthlyFinished, genres, longestStreak: longest };
}

export interface MonthStats extends PeriodStats {
  year: number;
  month: number; // 0-11
  daysInMonth: number;
  dailyPages: number[]; // index 0 = 1일
}

export function monthStats(items: ShelfItem[], sessions: ReadingSession[], year: number, month: number): MonthStats {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const base = periodStats(items, sessions, prefix);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyPages = Array.from({ length: daysInMonth }, (_, i) => base.daily.get(`${prefix}${String(i + 1).padStart(2, '0')}`) ?? 0);
  return { ...base, year, month, daysInMonth, dailyPages };
}

/** 그 달에 한 번이라도 읽은 책 (세션 기준) */
export function booksReadInMonth(items: ShelfItem[], sessions: ReadingSession[], year: number, month: number): Array<{ item: ShelfItem; pages: number }> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const pagesByBook = new Map<string, number>();
  for (const s of sessions) if (s.date.startsWith(prefix)) pagesByBook.set(s.bookId, (pagesByBook.get(s.bookId) ?? 0) + s.pages);
  const byId = new Map(items.map((i) => [i.book.id, i]));
  return [...pagesByBook.entries()]
    .map(([id, pages]) => ({ item: byId.get(id), pages }))
    .filter((x): x is { item: ShelfItem; pages: number } => x.item !== undefined)
    .sort((a, b) => b.pages - a.pages);
}

export type ActivityKind = 'added' | 'started' | 'finished' | 'memo' | 'quote';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  /** 정렬용 ISO 또는 dateKey */
  at: string;
  item: ShelfItem;
  detail?: string;
}

/** 서재·기록에서 파생한 독서 활동 히스토리 (최신순) */
export function activityHistory(items: ShelfItem[], notes: ReadingNote[]): ActivityEvent[] {
  const byId = new Map(items.map((i) => [i.book.id, i]));
  const events: ActivityEvent[] = [];
  for (const item of items) {
    const { entry, book } = item;
    events.push({ id: `${book.id}-added`, kind: 'added', at: entry.addedAt, item });
    if (entry.startedAt) events.push({ id: `${book.id}-started`, kind: 'started', at: `${entry.startedAt}T09:00:00`, item });
    if (entry.finishedAt && entry.status === 'done')
      events.push({ id: `${book.id}-finished`, kind: 'finished', at: `${entry.finishedAt}T21:00:00`, item, detail: entry.rating ? `★ ${entry.rating}` : undefined });
  }
  for (const n of notes) {
    const item = byId.get(n.bookId);
    if (item) events.push({ id: n.id, kind: n.kind, at: n.createdAt, item, detail: n.content });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

/** 히트맵용: 연도의 모든 날짜를 주(일~토) 단위 열로 */
export function yearWeeks(year: number): Array<Array<string | null>> {
  const first = new Date(year, 0, 1);
  const last = new Date(year, 11, 31);
  const weeks: Array<Array<string | null>> = [];
  let week: Array<string | null> = Array<string | null>(first.getDay()).fill(null);
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    week.push(toDateKey(d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array<null>(7 - week.length).fill(null)]);
  return weeks;
}
