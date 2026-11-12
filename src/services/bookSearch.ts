import { useEffect, useState } from 'react';
import type { Book } from '@/types/book';
import type { BestsellerCategory } from '@/types/social';
import { SAMPLE_CATALOG, SAMPLE_POPULAR_KEYWORDS } from '@/mocks/catalog';
import { SAMPLE_BESTSELLERS } from '@/mocks/social';
import { cacheBooks, useBookCache } from '@/store/bookCache';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * 도서 검색.
 * 실제 책은 카카오 책 검색(/api/books 서버 함수)에서 가져오고,
 * 키가 설정되지 않았거나 연결이 안 되면 샘플 도서(33권)로 대신 보여줍니다(isSample: true).
 */
export interface BookSearchResult {
  items: Book[];
  total: number;
  /** 결과가 샘플 데이터인지 여부 — UI에서 구분 표시 */
  isSample: boolean;
}

export interface BookSearchService {
  search(query: string, options?: { signal?: AbortSignal }): Promise<BookSearchResult>;
  getById(id: string, options?: { signal?: AbortSignal }): Promise<Book | null>;
  popularKeywords(): Promise<string[]>;
  recommendations(excludeIds: string[], limit?: number): Promise<Book[]>;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
const catalogById = new Map(SAMPLE_CATALOG.map((b) => [b.id, b]));

/** [SAMPLE] 샘플 도서 안에서 찾기 */
export function searchCatalogSync(query: string, limit = 20): Book[] {
  const q = normalize(query);
  if (!q) return [];
  return SAMPLE_CATALOG.filter((b) =>
    [b.title, b.subtitle ?? '', b.publisher, b.genre, ...b.authors, ...(b.translators ?? [])].map(normalize).some((f) => f.includes(q)),
  ).slice(0, limit);
}

/** 서버 함수 호출. 키 미설정(503)·네트워크 오류면 null → 샘플로 대체 */
async function api<T>(params: Record<string, string>, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(`/api/books?${new URLSearchParams(params)}`, { signal });
    if (res.status === 404) return { item: null } as T;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return null;
  }
}

const isbnOf = (id: string) => (id.startsWith('isbn-') && /^isbn-[0-9Xx]{10,13}$/.test(id) ? id.slice(5) : null);

class ApiBookSearchService implements BookSearchService {
  async search(query: string, options?: { signal?: AbortSignal }): Promise<BookSearchResult> {
    const q = query.trim();
    if (!q) return { items: [], total: 0, isSample: false };
    const data = await api<{ items: Book[]; total: number }>({ q }, options?.signal);
    if (data) {
      cacheBooks(data.items);
      return { items: data.items, total: data.total, isSample: false };
    }
    const items = searchCatalogSync(q);
    return { items, total: items.length, isSample: true };
  }

  async getById(id: string, options?: { signal?: AbortSignal }): Promise<Book | null> {
    const known = catalogById.get(id) ?? useBookCache.getState().books[id];
    if (known) return known;
    const isbn = isbnOf(id);
    if (!isbn) return null;
    const data = await api<{ item: Book | null }>({ isbn }, options?.signal);
    if (data === null) throw new Error('책 정보를 불러오지 못했어요');
    if (data.item) cacheBooks([data.item]);
    return data.item;
  }

  async popularKeywords(): Promise<string[]> {
    return SAMPLE_POPULAR_KEYWORDS;
  }

  async recommendations(excludeIds: string[], limit = 8): Promise<Book[]> {
    const exclude = new Set(excludeIds);
    return SAMPLE_CATALOG.filter((b) => !exclude.has(b.id)).slice(0, limit);
  }
}

export const bookSearchService: BookSearchService = new ApiBookSearchService();

/** 입력하면서 찾기 (0.3초 디바운스) — 기록 시트·책 태그·리스트 담기 */
export function useBookSearch(query: string, limit = 20) {
  const q = useDebouncedValue(query.trim(), 300);
  const [state, setState] = useState<{ q: string; items: Book[]; isSample: boolean }>({ q: '', items: [], isSample: false });
  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    bookSearchService
      .search(q, { signal: ctrl.signal })
      .then((r) => setState({ q, items: r.items.slice(0, limit), isSample: r.isSample }))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [q, limit]);
  const current = query.trim();
  return {
    // 입력 중에는 직전 결과를 유지해 깜빡임을 줄임
    items: current ? state.items : [],
    loading: Boolean(current) && state.q !== current,
    isSample: state.isSample,
  };
}

export interface ChartRow {
  rank: number;
  book: Book;
  /** 지난주 대비 순위 변화 — 샘플 차트에만 있음 */
  change?: number | null;
}

/** 베스트셀러: 카카오는 순위를 주지 않아 샘플 차트 (isSample: true) */
export async function fetchBestsellers(cat: BestsellerCategory): Promise<{ rows: ChartRow[]; isSample: boolean }> {
  const rows: ChartRow[] = [];
  for (const it of SAMPLE_BESTSELLERS[cat]) {
    const book = catalogById.get(it.bookId);
    if (book) rows.push({ rank: it.rank, change: it.change, book });
  }
  return { rows, isSample: true };
}
