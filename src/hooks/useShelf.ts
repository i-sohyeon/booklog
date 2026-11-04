import { useMemo } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { toShelfItems } from '@/store/selectors';

/** 내 서재 전체 목록 (books + entries 결합, 메모이즈) */
export function useShelf() {
  const books = useLibraryStore((s) => s.books);
  const entries = useLibraryStore((s) => s.entries);
  return useMemo(() => toShelfItems(books, entries), [books, entries]);
}
