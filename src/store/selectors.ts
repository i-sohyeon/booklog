import type { Book, Genre, LibraryEntry, ReadingStatus } from '@/types/book';
import type { RatingSummary } from '@/types/social';
import { SAMPLE_RATING_BASE } from '@/mocks/social';

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

/** 다 읽은 책 — 완독일 최신순 */
export function finishedBooks(items: ShelfItem[], year?: number): ShelfItem[] {
  return items
    .filter((i) => i.entry.status === 'done' && i.entry.finishedAt && (!year || i.entry.finishedAt.startsWith(`${year}-`)))
    .sort((a, b) => (b.entry.finishedAt ?? '').localeCompare(a.entry.finishedAt ?? ''));
}

export interface ReadingProfile {
  count: number;
  averageRating: number | null;
  genres: Array<{ name: Genre; count: number }>;
  authors: Array<{ name: string; count: number }>;
}

/** 마이 페이지 통계 — 권수, 평균 별점, 많이 읽은 장르·작가 */
export function readingProfile(done: ShelfItem[]): ReadingProfile {
  const rated = done.filter((i) => i.entry.rating);
  const genreMap = new Map<Genre, number>();
  const authorMap = new Map<string, number>();
  for (const { book } of done) {
    genreMap.set(book.genre, (genreMap.get(book.genre) ?? 0) + 1);
    for (const a of book.authors) authorMap.set(a, (authorMap.get(a) ?? 0) + 1);
  }
  const sorted = <T,>(m: Map<T, number>) => [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return {
    count: done.length,
    averageRating: rated.length ? rated.reduce((a, i) => a + (i.entry.rating ?? 0), 0) / rated.length : null,
    genres: sorted(genreMap),
    authors: sorted(authorMap).filter((a) => a.count > 0),
  };
}

/**
 * [SAMPLE] 책별 평점 분포.
 * 샘플 기준값(평균·인원)으로 분포를 만들고, 내 별점이 있으면 한 표를 더합니다.
 */
export function ratingSummary(bookId: string, myRating?: number): RatingSummary {
  const [avg, count] = SAMPLE_RATING_BASE[bookId] ?? [0, 0];
  const distribution = Array<number>(10).fill(0);
  if (count > 0) {
    const weights = distribution.map((_, i) => {
      const score = (i + 1) / 2;
      return Math.exp(-((score - avg) ** 2) / (2 * 0.6 ** 2));
    });
    const total = weights.reduce((a, b) => a + b, 0);
    weights.forEach((w, i) => (distribution[i] = Math.round((w / total) * count)));
  }
  if (myRating) distribution[Math.round(myRating * 2) - 1]! += 1;
  const n = distribution.reduce((a, b) => a + b, 0);
  const sum = distribution.reduce((a, c, i) => a + c * ((i + 1) / 2), 0);
  return { average: n ? sum / n : 0, count: n, distribution };
}
