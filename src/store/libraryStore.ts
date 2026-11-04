import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Book, LibraryEntry, NoteKind, ReadingGoal, ReadingNote, ReadingSession, ReadingStatus, Visibility } from '@/types/book';
import { createSampleLibrary } from '@/mocks/library';
import { toDateKey } from '@/lib/date';

/**
 * 내 서재 상태 (클라이언트 로컬 저장).
 * Supabase 연결 시 이 스토어의 액션 내부에서 원격 저장을 호출하거나,
 * 서버 상태 라이브러리로 이관할 수 있도록 액션 단위를 작게 유지합니다.
 */
export type DataSource = 'sample' | 'local';

export interface NoteInput {
  kind: NoteKind;
  content: string;
  page?: number;
  visibility: Visibility;
}

export interface ReviewInput {
  rating?: number;
  review?: string;
  visibility: Visibility;
}

export interface LibraryState {
  dataSource: DataSource;
  books: Record<string, Book>;
  entries: Record<string, LibraryEntry>;
  notes: ReadingNote[];
  sessions: ReadingSession[];
  goal: ReadingGoal;
}

interface LibraryActions {
  addBook: (book: Book, status: ReadingStatus) => void;
  removeBook: (bookId: string) => void;
  setStatus: (bookId: string, status: ReadingStatus) => void;
  updateProgress: (bookId: string, page: number) => void;
  setRating: (bookId: string, rating: number | undefined) => void;
  setGoal: (targetBooks: number) => void;
  /** 메모/문장 추가 → 생성된 id 반환 */
  addNote: (bookId: string, input: NoteInput) => string;
  updateNote: (noteId: string, input: NoteInput) => void;
  deleteNote: (noteId: string) => void;
  saveReview: (bookId: string, input: ReviewInput) => void;
  setDates: (bookId: string, dates: { startedAt?: string; finishedAt?: string }) => void;
  /** 클라우드에서 내려받은 상태로 교체 */
  replaceAll: (state: Omit<LibraryState, 'dataSource'>) => void;
  loadSample: () => void;
  clearAll: () => void;
}

export type LibraryStore = LibraryState & LibraryActions;

const today = () => toDateKey(new Date());
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `nt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function cleanNote(input: NoteInput): NoteInput {
  const page = input.page !== undefined && Number.isFinite(input.page) && input.page > 0 ? Math.round(input.page) : undefined;
  return { kind: input.kind, content: input.content.trim(), page, visibility: input.visibility };
}
const nowIso = () => new Date().toISOString();

function emptyState(): LibraryState {
  return {
    dataSource: 'local',
    books: {},
    entries: {},
    notes: [],
    sessions: [],
    goal: { year: new Date().getFullYear(), targetBooks: 12 },
  };
}

function sampleState(): LibraryState {
  return { dataSource: 'sample', ...createSampleLibrary() };
}

function applyStatus(entry: LibraryEntry, book: Book, status: ReadingStatus): LibraryEntry {
  const next: LibraryEntry = { ...entry, status, updatedAt: nowIso() };
  if (status === 'reading' && !next.startedAt) next.startedAt = today();
  if (status === 'done') {
    next.startedAt ??= today();
    next.finishedAt = today();
    next.currentPage = book.pageCount;
  } else {
    next.finishedAt = undefined;
  }
  return next;
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set) => ({
      ...sampleState(),

      addBook: (book, status) =>
        set((s) => {
          if (s.entries[book.id]) return s;
          const base: LibraryEntry = {
            bookId: book.id,
            status: 'want',
            addedAt: nowIso(),
            updatedAt: nowIso(),
            currentPage: 0,
          };
          return {
            books: { ...s.books, [book.id]: book },
            entries: { ...s.entries, [book.id]: applyStatus(base, book, status) },
          };
        }),

      removeBook: (bookId) =>
        set((s) => {
          const entries = { ...s.entries };
          delete entries[bookId];
          return { entries, notes: s.notes.filter((n) => n.bookId !== bookId) };
        }),

      setStatus: (bookId, status) =>
        set((s) => {
          const entry = s.entries[bookId];
          const book = s.books[bookId];
          if (!entry || !book) return s;
          return { entries: { ...s.entries, [bookId]: applyStatus(entry, book, status) } };
        }),

      updateProgress: (bookId, page) =>
        set((s) => {
          const entry = s.entries[bookId];
          const book = s.books[bookId];
          if (!entry || !book) return s;
          const nextPage = Math.max(0, Math.min(book.pageCount, Math.round(page)));
          const delta = nextPage - entry.currentPage;
          let sessions = s.sessions;
          if (delta > 0) {
            const key = today();
            const idx = sessions.findIndex((x) => x.date === key && x.bookId === bookId);
            sessions =
              idx >= 0
                ? sessions.map((x, i) => (i === idx ? { ...x, pages: x.pages + delta } : x))
                : [{ date: key, bookId, pages: delta }, ...sessions];
          }
          return {
            sessions,
            entries: {
              ...s.entries,
              [bookId]: {
                ...entry,
                currentPage: nextPage,
                status: entry.status === 'want' || entry.status === 'paused' ? 'reading' : entry.status,
                startedAt: entry.startedAt ?? today(),
                updatedAt: nowIso(),
              },
            },
          };
        }),

      setRating: (bookId, rating) =>
        set((s) => {
          const entry = s.entries[bookId];
          if (!entry) return s;
          return { entries: { ...s.entries, [bookId]: { ...entry, rating, updatedAt: nowIso() } } };
        }),

      setGoal: (targetBooks) =>
        set((s) => ({ goal: { ...s.goal, targetBooks: Math.max(1, Math.min(365, Math.round(targetBooks))) } })),

      addNote: (bookId, input) => {
        const id = newId();
        const at = nowIso();
        set((s) => ({
          notes: [{ id, bookId, ...cleanNote(input), createdAt: at, updatedAt: at }, ...s.notes],
          entries: s.entries[bookId] ? { ...s.entries, [bookId]: { ...s.entries[bookId], updatedAt: at } } : s.entries,
        }));
        return id;
      },

      updateNote: (noteId, input) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === noteId ? { ...n, ...cleanNote(input), updatedAt: nowIso() } : n)),
        })),

      deleteNote: (noteId) => set((s) => ({ notes: s.notes.filter((n) => n.id !== noteId) })),

      saveReview: (bookId, { rating, review, visibility }) =>
        set((s) => {
          const entry = s.entries[bookId];
          if (!entry) return s;
          const text = review?.trim();
          return {
            entries: {
              ...s.entries,
              [bookId]: { ...entry, rating, review: text || undefined, reviewVisibility: visibility, updatedAt: nowIso() },
            },
          };
        }),

      setDates: (bookId, dates) =>
        set((s) => {
          const entry = s.entries[bookId];
          if (!entry) return s;
          return { entries: { ...s.entries, [bookId]: { ...entry, ...dates, updatedAt: nowIso() } } };
        }),

      replaceAll: (state) => set({ ...state, dataSource: 'local' }),

      loadSample: () => set(sampleState()),
      clearAll: () => set(emptyState()),
    }),
    {
      name: 'booklog:library',
      version: 2,
      // v1 → v2: 메모에 공개 범위 필드 추가
      migrate: (persisted, version) => {
        const state = persisted as LibraryState;
        if (version < 2 && Array.isArray(state.notes)) {
          state.notes = state.notes.map((n) => ({ ...n, visibility: n.visibility ?? 'private' }));
        }
        return state;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: ({ dataSource, books, entries, notes, sessions, goal }) => ({
        dataSource,
        books,
        entries,
        notes,
        sessions,
        goal,
      }),
    },
  ),
);
