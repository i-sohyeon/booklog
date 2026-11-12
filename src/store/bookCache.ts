import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Book } from '@/types/book';

/**
 * 도서 API에서 받아온 책 정보 캐시 (이 기기).
 * 검색·베스트셀러·친구 기록에서 본 책을 기억해 두어, 리스트·게시글·피드에서 다시 찾을 수 있게 합니다.
 * 최근 400권까지만 보관합니다.
 */
const MAX = 400;

interface BookCacheState {
  books: Record<string, Book>;
  add: (books: Book[]) => void;
}

export const useBookCache = create<BookCacheState>()(
  persist(
    (set) => ({
      books: {},
      add: (list) =>
        set((s) => {
          const fresh = list.filter((b) => b && b.id && s.books[b.id] !== b);
          if (!fresh.length) return s;
          const next: Record<string, Book> = { ...s.books };
          for (const b of fresh) {
            delete next[b.id]; // 최근 본 책이 뒤로 가도록
            next[b.id] = b;
          }
          const ids = Object.keys(next);
          if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete next[id];
          return { books: next };
        }),
    }),
    { name: 'booklog:book-cache', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const cacheBooks = (books: Book[]) => useBookCache.getState().add(books);
