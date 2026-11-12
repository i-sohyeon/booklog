import type { Book, Genre, LibraryEntry, Quote, RecordVisibility } from '@/types/book';
import { supabase } from '@/lib/supabase';
import { AuthNotConfiguredError } from './auth';
import type { LibraryState } from '@/store/libraryStore';

/**
 * 로컬(브라우저) 서재 ↔ Supabase 계정 데이터 이관.
 * 테이블 정의: supabase/schema.sql
 *
 * 서재 기록만 옮깁니다. 문장 사진은 아직 기기에만 남고(텍스트만 이관),
 * 커뮤니티·모임은 서버 테이블이 생긴 뒤 연결합니다.
 */
type Snapshot = Omit<LibraryState, 'dataSource'>;

interface BookRow {
  id: string;
  isbn: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  translators: string[] | null;
  publisher: string;
  published_at: string;
  page_count: number;
  genre: string;
  description: string;
  cover_url: string | null;
  cover_tone: string | null;
}

interface EntryRow {
  user_id: string;
  book_id: string;
  status: LibraryEntry['status'];
  added_at: string;
  updated_at: string;
  finished_at: string | null;
  rating: number | null;
  one_liner: string | null;
  review: string | null;
  spoiler: boolean;
  quotes: Quote[];
  place: string | null;
  occasion: string | null;
  tags: string[];
  read_count: number;
  visibility: RecordVisibility;
}


export const toEntryRow = (userId: string, e: LibraryEntry): EntryRow => ({
  user_id: userId,
  book_id: e.bookId,
  status: e.status,
  added_at: e.addedAt,
  updated_at: e.updatedAt,
  finished_at: e.finishedAt ?? null,
  rating: e.rating ?? null,
  one_liner: e.oneLiner ?? null,
  review: e.review ?? null,
  spoiler: Boolean(e.spoiler),
  // 사진은 용량 문제로 아직 올리지 않음 — 텍스트 문장만
  quotes: (e.quotes ?? []).filter((q) => q.text).map(({ id, text, createdAt }) => ({ id, text, createdAt })),
  place: e.place ?? null,
  occasion: e.occasion ?? null,
  tags: e.tags ?? [],
  read_count: e.readCount ?? 1,
  visibility: e.visibility ?? {},
});

export const fromEntryRow = (r: EntryRow): LibraryEntry => ({
  bookId: r.book_id,
  status: r.status,
  addedAt: r.added_at,
  updatedAt: r.updated_at,
  finishedAt: r.finished_at ?? undefined,
  rating: r.rating !== null ? Number(r.rating) : undefined,
  oneLiner: r.one_liner ?? undefined,
  review: r.review ?? undefined,
  spoiler: r.spoiler || undefined,
  quotes: r.quotes?.length ? r.quotes : undefined,
  place: r.place ?? undefined,
  occasion: r.occasion ?? undefined,
  tags: r.tags?.length ? r.tags : undefined,
  readCount: r.read_count > 1 ? r.read_count : undefined,
  visibility: r.visibility ?? undefined,
});

export const toBookRow = (b: Book): BookRow => ({
  id: b.id,
  isbn: b.isbn ?? null,
  title: b.title,
  subtitle: b.subtitle ?? null,
  authors: b.authors,
  translators: b.translators ?? null,
  publisher: b.publisher,
  published_at: b.publishedAt,
  page_count: b.pageCount,
  genre: b.genre,
  description: b.description,
  cover_url: b.coverUrl ?? null,
  cover_tone: b.coverTone ?? null,
});

export const fromBookRow = (r: BookRow): Book => ({
  id: r.id,
  isbn: r.isbn ?? undefined,
  title: r.title,
  subtitle: r.subtitle ?? undefined,
  authors: r.authors,
  translators: r.translators ?? undefined,
  publisher: r.publisher,
  publishedAt: r.published_at,
  pageCount: r.page_count,
  genre: r.genre as Genre,
  description: r.description,
  coverUrl: r.cover_url ?? undefined,
  coverTone: (r.cover_tone ?? undefined) as Book['coverTone'],
});

function client() {
  if (!supabase) throw new AuthNotConfiguredError();
  return supabase;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const inList = (ids: string[]) => `(${ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',')})`;

/** 이 기기의 서재로 계정 데이터를 덮어씁니다 (기기에 없는 책은 계정에서 삭제) */
export async function uploadLibrary(userId: string, s: Snapshot): Promise<{ books: number }> {
  const db = client();
  const entries = Object.values(s.entries).filter((e) => s.books[e.bookId]);
  const books = entries.map((e) => s.books[e.bookId]!);

  if (books.length) check(await db.from('books').upsert(books.map(toBookRow)));
  if (entries.length) {
    const rows = entries.map((e) => toEntryRow(userId, e));
    check(await db.from('library_entries').upsert(rows));
    check(await db.from('library_entries').delete().eq('user_id', userId).not('book_id', 'in', inList(entries.map((e) => e.bookId))));
  } else {
    check(await db.from('library_entries').delete().eq('user_id', userId));
  }
  return { books: entries.length };
}

/** 계정에 저장된 서재를 내려받습니다 */
export async function downloadLibrary(userId: string): Promise<Snapshot> {
  const db = client();
  const entryRows = check(await db.from('library_entries').select('*').eq('user_id', userId)) as EntryRow[];
  const bookIds = entryRows.map((e) => e.book_id);
  const bookRows = bookIds.length ? (check(await db.from('books').select('*').in('id', bookIds)) as BookRow[]) : [];
  return {
    books: Object.fromEntries(bookRows.map((r) => [r.id, fromBookRow(r)])),
    entries: Object.fromEntries(
      entryRows.map((r) => [
        r.book_id,
        fromEntryRow(r),
      ]),
    ),
  };
}

const LAST_SYNC_KEY = 'booklog:last-sync';

export function readLastSync(): { at: string; direction: 'up' | 'down' } | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? (JSON.parse(raw) as { at: string; direction: 'up' | 'down' }) : null;
  } catch {
    return null;
  }
}

export function writeLastSync(direction: 'up' | 'down') {
  try {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ at: new Date().toISOString(), direction }));
  } catch {
    /* ignore */
  }
}
