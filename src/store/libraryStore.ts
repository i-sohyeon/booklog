import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Book, LibraryEntry, ReadingStatus } from '@/types/book';

export type RecordInput = Omit<LibraryEntry, 'bookId' | 'addedAt' | 'updatedAt'>;
import { createSampleLibrary } from '@/mocks/library';
import { toDateKey } from '@/lib/date';

/**
 * 내 서재 (브라우저 로컬 저장).
 * 진도·쪽수는 기록하지 않습니다. 다 읽은 책은 별점(필수)과 선택 기록을 남깁니다.
 */
export type DataSource = 'sample' | 'local';

export interface LibraryState {
  dataSource: DataSource;
  books: Record<string, Book>;
  entries: Record<string, LibraryEntry>;
}

export interface FinishInput {
  rating: number;
  oneLiner?: string;
  /** YYYY-MM-DD */
  finishedAt: string;
  review?: string;
  spoiler?: boolean;
  /** 생략하면 기존 공개 설정 유지 */
  visibility?: LibraryEntry['visibility'];
}

interface LibraryActions {
  /** 상태만 바꾸기 (서재에 없으면 추가). 'done'은 saveFinished로 기록합니다 */
  setStatus: (book: Book, status: Exclude<ReadingStatus, 'done'>) => void;
  /** 다 읽은 책 빠른 기록 (기록 시트) — 다른 상세 기록은 유지 */
  saveFinished: (book: Book, input: FinishInput) => void;
  /** 기록 편집 화면에서 전체 저장 */
  saveRecord: (book: Book, record: RecordInput) => void;
  removeBook: (bookId: string) => void;
  replaceAll: (state: Omit<LibraryState, 'dataSource'>) => void;
  loadSample: () => void;
  clearAll: () => void;
}

export type LibraryStore = LibraryState & LibraryActions;

const nowIso = () => new Date().toISOString();
const clampRating = (r: number) => Math.max(0.5, Math.min(5, Math.round(r * 2) / 2));

const emptyState = (): LibraryState => ({ dataSource: 'local', books: {}, entries: {} });
const sampleState = (): LibraryState => ({ dataSource: 'sample', ...createSampleLibrary() });

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set) => ({
      ...sampleState(),

      setStatus: (book, status) =>
        set((s) => {
          const prev = s.entries[book.id];
          const entry: LibraryEntry = prev
            ? { ...prev, status, updatedAt: nowIso() }
            : { bookId: book.id, status, addedAt: nowIso(), updatedAt: nowIso() };
          // 다 읽은 책을 다른 상태로 되돌리면 기록은 유지하되 완독 정보만 내림
          if (prev?.status === 'done') entry.finishedAt = undefined;
          return { books: { ...s.books, [book.id]: book }, entries: { ...s.entries, [book.id]: entry } };
        }),

      saveFinished: (book, input) =>
        set((s) => {
          const prev = s.entries[book.id];
          const entry: LibraryEntry = {
            ...prev,
            bookId: book.id,
            addedAt: prev?.addedAt ?? nowIso(),
            updatedAt: nowIso(),
            status: 'done',
            rating: clampRating(input.rating),
            oneLiner: input.oneLiner?.trim() || undefined,
            finishedAt: input.finishedAt || toDateKey(new Date()),
            review: input.review !== undefined ? input.review.trim() || undefined : prev?.review,
            spoiler: input.spoiler || undefined,
            visibility: input.visibility ?? prev?.visibility,
          };
          return { books: { ...s.books, [book.id]: book }, entries: { ...s.entries, [book.id]: entry } };
        }),

      saveRecord: (book, r) =>
        set((s) => {
          const prev = s.entries[book.id];
          const done = r.status === 'done';
          const clean = (v?: string) => v?.trim() || undefined;
          const entry: LibraryEntry = {
            bookId: book.id,
            addedAt: prev?.addedAt ?? nowIso(),
            updatedAt: nowIso(),
            status: r.status,
            rating: done && r.rating ? clampRating(r.rating) : undefined,
            finishedAt: done ? r.finishedAt || toDateKey(new Date()) : undefined,
            oneLiner: clean(r.oneLiner),
            review: clean(r.review),
            spoiler: r.spoiler || undefined,
            quotes: r.quotes?.filter((q) => q.text?.trim() || q.image).map((q) => ({ ...q, text: clean(q.text) })),
            place: clean(r.place),
            occasion: clean(r.occasion),
            tags: r.tags?.length ? [...new Set(r.tags.map((t) => t.trim().replace(/^#/, '')).filter(Boolean))] : undefined,
            readCount: r.readCount && r.readCount > 1 ? r.readCount : undefined,
            visibility: r.visibility,
          };
          if (entry.quotes?.length === 0) entry.quotes = undefined;
          return { books: { ...s.books, [book.id]: book }, entries: { ...s.entries, [book.id]: entry } };
        }),

      removeBook: (bookId) =>
        set((s) => {
          const entries = { ...s.entries };
          delete entries[bookId];
          return { entries };
        }),

      replaceAll: (state) => set({ ...state, dataSource: 'local' }),
      loadSample: () => set(sampleState()),
      clearAll: () => set(emptyState()),
    }),
    {
      name: 'booklog:library',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ dataSource, books, entries }) => ({ dataSource, books, entries }),
      /**
       * v1·v2 → v3: 진도 기록 제거
       * - '중단' → '읽고 싶어요', 쪽수·세션·메모·목표 폐기
       * - 기존 리뷰는 80자 이하면 한 줄 평, 길면 긴 리뷰로 이동
       * v3 → v4: 기록 항목 확장(문장·태그 등, 모두 선택) — 샘플 서재는 새 샘플로 교체
       */
      migrate: (persisted, version) => {
        const old = persisted as { dataSource?: DataSource; books?: Record<string, Book>; entries?: Record<string, Record<string, unknown>> };
        if (version >= 3) return old.dataSource === 'sample' ? sampleState() : (persisted as LibraryState);
        const entries: Record<string, LibraryEntry> = {};
        for (const [id, e] of Object.entries(old.entries ?? {})) {
          const status = e.status === 'done' ? 'done' : e.status === 'reading' ? 'reading' : 'want';
          const review = typeof e.review === 'string' ? e.review : undefined;
          const short = review && review.length <= 80;
          entries[id] = {
            bookId: id,
            status,
            addedAt: String(e.addedAt ?? nowIso()),
            updatedAt: String(e.updatedAt ?? nowIso()),
            finishedAt: status === 'done' && typeof e.finishedAt === 'string' ? e.finishedAt : undefined,
            rating: status === 'done' && typeof e.rating === 'number' ? e.rating : undefined,
            oneLiner: short ? review : undefined,
            review: short ? undefined : review,
          };
        }
        return { dataSource: old.dataSource ?? 'local', books: old.books ?? {}, entries } satisfies LibraryState;
      },
    },
  ),
);
