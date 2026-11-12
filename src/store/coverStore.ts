import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Book } from '@/types/book';

/**
 * 샘플 도서(bk-…)의 실제 표지 주소를 카카오 책 검색에서 찾아 이 기기에 기억합니다.
 * - 못 찾았으면 null로 기억해 다시 묻지 않음 (7일 뒤 다시 시도)
 * - 서버(도서 API)가 설정되지 않았으면 기억하지 않고 생성 표지를 그대로 씀
 */
interface Entry {
  url: string | null;
  at: number;
}

interface CoverState {
  covers: Record<string, Entry>;
  set: (id: string, url: string | null) => void;
}

const RETRY_MS = 7 * 86_400_000;

export const useCoverStore = create<CoverState>()(
  persist(
    (set) => ({
      covers: {},
      set: (id, url) => set((s) => ({ covers: { ...s.covers, [id]: { url, at: Date.now() } } })),
    }),
    { name: 'booklog:covers', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

const inflight = new Set<string>();
const queue: Array<() => Promise<void>> = [];
let running = 0;
let apiDown = false;

function pump() {
  while (running < 4 && queue.length) {
    const job = queue.shift()!;
    running++;
    void job().finally(() => {
      running--;
      pump();
    });
  }
}

function request(book: Pick<Book, 'id' | 'title' | 'authors'>) {
  if (apiDown || inflight.has(book.id)) return;
  const known = useCoverStore.getState().covers[book.id];
  if (known && (known.url || Date.now() - known.at < RETRY_MS)) return;
  inflight.add(book.id);
  queue.push(async () => {
    try {
      const qs = new URLSearchParams({ cover: '1', title: book.title, author: book.authors[0] ?? '' });
      const res = await fetch(`/api/books?${qs}`);
      if (res.status === 503) {
        apiDown = true; // 키 미설정 — 이번 세션에서는 더 묻지 않음
        return;
      }
      if (!res.ok) return;
      const { coverUrl } = (await res.json()) as { coverUrl: string | null };
      useCoverStore.getState().set(book.id, coverUrl);
    } catch {
      /* 네트워크 오류 — 다음에 다시 */
    } finally {
      inflight.delete(book.id);
    }
  });
  pump();
}

/** 샘플 도서면 실제 표지 주소(찾았을 때), 아니면 undefined */
export function useSampleCover(book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl'>): string | undefined {
  const isSample = !book.coverUrl && book.id.startsWith('bk-');
  const url = useCoverStore((s) => (isSample ? s.covers[book.id]?.url : undefined));
  useEffect(() => {
    if (isSample) request(book);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSample, book.id]);
  return url ?? undefined;
}
