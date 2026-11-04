import type { Book, Genre, LibraryEntry, ReadingGoal, ReadingNote, ReadingSession } from '@/types/book';
import { supabase } from '@/lib/supabase';
import { AuthNotConfiguredError } from './auth';
import type { LibraryState } from '@/store/libraryStore';

/**
 * 로컬(브라우저) 서재 ↔ Supabase 계정 데이터 이관.
 * 테이블 정의: supabase/schema.sql
 *
 * 현재는 사용자가 직접 실행하는 "올리기 / 불러오기" 방식입니다.
 * 실시간 자동 동기화는 다음 단계에서 스토어 액션 단위로 확장합니다.
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
  started_at: string | null;
  finished_at: string | null;
  current_page: number;
  rating: number | null;
  review: string | null;
  review_visibility: LibraryEntry['reviewVisibility'] | null;
}

interface NoteRow {
  id: string;
  user_id: string;
  book_id: string;
  kind: ReadingNote['kind'];
  content: string;
  page: number | null;
  visibility: ReadingNote['visibility'];
  created_at: string;
  updated_at: string | null;
}

interface SessionRow {
  user_id: string;
  date: string;
  book_id: string;
  pages: number;
}

interface GoalRow {
  user_id: string;
  year: number;
  target_books: number;
}

const toBookRow = (b: Book): BookRow => ({
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

const fromBookRow = (r: BookRow): Book => ({
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

/** 이 기기의 서재로 계정 데이터를 덮어씁니다 (서재/메모 기준 — 기기에 없는 항목은 계정에서 삭제) */
export async function uploadLibrary(userId: string, s: Snapshot): Promise<{ books: number; notes: number }> {
  const db = client();
  const books = Object.values(s.books).filter((b) => s.entries[b.id]);
  const entries = Object.values(s.entries).filter((e) => s.books[e.bookId]);

  if (books.length) check(await db.from('books').upsert(books.map(toBookRow)));

  if (entries.length) {
    const rows: EntryRow[] = entries.map((e) => ({
      user_id: userId,
      book_id: e.bookId,
      status: e.status,
      added_at: e.addedAt,
      updated_at: e.updatedAt,
      started_at: e.startedAt ?? null,
      finished_at: e.finishedAt ?? null,
      current_page: e.currentPage,
      rating: e.rating ?? null,
      review: e.review ?? null,
      review_visibility: e.reviewVisibility ?? null,
    }));
    check(await db.from('library_entries').upsert(rows));
    check(await db.from('library_entries').delete().eq('user_id', userId).not('book_id', 'in', inList(entries.map((e) => e.bookId))));
  } else {
    check(await db.from('library_entries').delete().eq('user_id', userId));
  }

  const notes = s.notes.filter((n) => s.entries[n.bookId]);
  if (notes.length) {
    const rows: NoteRow[] = notes.map((n) => ({
      id: n.id,
      user_id: userId,
      book_id: n.bookId,
      kind: n.kind,
      content: n.content,
      page: n.page ?? null,
      visibility: n.visibility,
      created_at: n.createdAt,
      updated_at: n.updatedAt ?? null,
    }));
    check(await db.from('reading_notes').upsert(rows));
    check(await db.from('reading_notes').delete().eq('user_id', userId).not('id', 'in', inList(notes.map((n) => n.id))));
  } else {
    check(await db.from('reading_notes').delete().eq('user_id', userId));
  }

  const sessions = s.sessions.filter((x) => s.entries[x.bookId] && x.pages > 0);
  if (sessions.length) {
    const rows: SessionRow[] = sessions.map((x) => ({ user_id: userId, date: x.date, book_id: x.bookId, pages: x.pages }));
    check(await db.from('reading_sessions').upsert(rows));
  }

  const goal: GoalRow = { user_id: userId, year: s.goal.year, target_books: s.goal.targetBooks };
  check(await db.from('reading_goals').upsert(goal));

  return { books: entries.length, notes: notes.length };
}

/** 계정에 저장된 서재를 내려받습니다 */
export async function downloadLibrary(userId: string): Promise<Snapshot> {
  const db = client();
  const [entries, notes, sessions, goals] = await Promise.all([
    db.from('library_entries').select('*').eq('user_id', userId),
    db.from('reading_notes').select('*').eq('user_id', userId),
    db.from('reading_sessions').select('*').eq('user_id', userId),
    db.from('reading_goals').select('*').eq('user_id', userId),
  ]);
  const entryRows = check(entries) as EntryRow[];
  const noteRows = check(notes) as NoteRow[];
  const sessionRows = check(sessions) as SessionRow[];
  const goalRows = check(goals) as GoalRow[];

  const bookIds = entryRows.map((e) => e.book_id);
  const bookRows = bookIds.length ? (check(await db.from('books').select('*').in('id', bookIds)) as BookRow[]) : [];

  const year = new Date().getFullYear();
  const goalRow = goalRows.find((g) => g.year === year);
  const goal: ReadingGoal = { year, targetBooks: goalRow?.target_books ?? 12 };

  return {
    books: Object.fromEntries(bookRows.map((r) => [r.id, fromBookRow(r)])),
    entries: Object.fromEntries(
      entryRows.map((r) => [
        r.book_id,
        {
          bookId: r.book_id,
          status: r.status,
          addedAt: r.added_at,
          updatedAt: r.updated_at,
          startedAt: r.started_at ?? undefined,
          finishedAt: r.finished_at ?? undefined,
          currentPage: r.current_page,
          rating: r.rating !== null ? Number(r.rating) : undefined,
          review: r.review ?? undefined,
          reviewVisibility: r.review_visibility ?? undefined,
        } satisfies LibraryEntry,
      ]),
    ),
    notes: noteRows.map(
      (r): ReadingNote => ({
        id: r.id,
        bookId: r.book_id,
        kind: r.kind,
        content: r.content,
        page: r.page ?? undefined,
        visibility: r.visibility,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? undefined,
      }),
    ),
    sessions: sessionRows.map((r): ReadingSession => ({ date: r.date, bookId: r.book_id, pages: r.pages })),
    goal,
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
