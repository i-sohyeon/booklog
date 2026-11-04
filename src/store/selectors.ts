import type { Book, LibraryEntry, ReadingNote, ReadingSession, ReadingStatus } from '@/types/book';
import { parseDateKey, toDateKey, daysAgo } from '@/lib/date';

export interface ShelfItem {
  book: Book;
  entry: LibraryEntry;
}

export function toShelfItems(books: Record<string, Book>, entries: Record<string, LibraryEntry>): ShelfItem[] {
  return Object.values(entries)
    .map((entry) => {
      const book = books[entry.bookId];
      return book ? { book, entry } : null;
    })
    .filter((x): x is ShelfItem => x !== null);
}

export function byStatus(items: ShelfItem[], status: ReadingStatus): ShelfItem[] {
  return items.filter((i) => i.entry.status === status);
}

export function sortByRecent(items: ShelfItem[]): ShelfItem[] {
  return [...items].sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));
}

export function progressOf(item: ShelfItem): number {
  if (item.book.pageCount <= 0) return 0;
  return Math.min(1, item.entry.currentPage / item.book.pageCount);
}

export function countByStatus(items: ShelfItem[]): Record<ReadingStatus | 'all', number> {
  const counts = { all: items.length, want: 0, reading: 0, done: 0, paused: 0 };
  for (const i of items) counts[i.entry.status] += 1;
  return counts;
}

/** 올해 완독한 책 */
export function finishedInYear(items: ShelfItem[], year: number): ShelfItem[] {
  return items.filter((i) => i.entry.status === 'done' && i.entry.finishedAt?.startsWith(`${year}-`));
}

export interface MonthSummary {
  year: number;
  month: number; // 0-11
  pages: number;
  readingDays: number;
  finished: number;
  /** 날짜(1~말일) → 읽은 쪽수 */
  daily: Map<number, number>;
}

export function monthSummary(items: ShelfItem[], sessions: ReadingSession[], ref = new Date()): MonthSummary {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const daily = new Map<number, number>();
  for (const s of sessions) {
    if (!s.date.startsWith(prefix)) continue;
    const day = Number(s.date.slice(8, 10));
    daily.set(day, (daily.get(day) ?? 0) + s.pages);
  }
  const pages = [...daily.values()].reduce((a, b) => a + b, 0);
  const finished = items.filter((i) => i.entry.status === 'done' && i.entry.finishedAt?.startsWith(prefix)).length;
  return { year, month, pages, readingDays: daily.size, finished, daily };
}

/** 오늘(또는 어제)부터 거꾸로 이어지는 연속 독서일 */
export function readingStreak(sessions: ReadingSession[], ref = new Date()): number {
  const days = new Set(sessions.filter((s) => s.pages > 0).map((s) => s.date));
  let offset = days.has(toDateKey(ref)) ? 0 : 1;
  let streak = 0;
  while (days.has(toDateKey(daysAgo(offset, ref)))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

export function recentNotes(notes: ReadingNote[], limit = 3): ReadingNote[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export function lastSessionDate(sessions: ReadingSession[], bookId: string): Date | null {
  const latest = sessions.filter((s) => s.bookId === bookId).sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? parseDateKey(latest.date) : null;
}
