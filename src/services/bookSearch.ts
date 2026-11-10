import type { Book } from '@/types/book';
import { SAMPLE_CATALOG, SAMPLE_POPULAR_KEYWORDS } from '@/mocks/catalog';

export interface BookSearchResult {
  items: Book[];
  total: number;
  /** 결과가 샘플 데이터인지 여부 — UI에서 구분 표시 */
  isSample: boolean;
}

/**
 * 도서 검색 서비스 인터페이스.
 * 실제 API(카카오/알라딘/네이버 등) 연결 시 이 인터페이스를 구현한 클래스로 교체합니다.
 */
export interface BookSearchService {
  search(query: string, options?: { signal?: AbortSignal }): Promise<BookSearchResult>;
  getById(id: string, options?: { signal?: AbortSignal }): Promise<Book | null>;
  popularKeywords(): Promise<string[]>;
  recommendations(excludeIds: string[], limit?: number): Promise<Book[]>;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** [SAMPLE] 즉시 결과가 필요한 곳(기록 시트·책 태그)용 동기 검색 */
export function searchCatalogSync(query: string, limit = 20): Book[] {
  const q = normalize(query);
  if (!q) return [];
  return SAMPLE_CATALOG.filter((b) =>
    [b.title, b.publisher, ...b.authors].map(normalize).some((f) => f.includes(q)),
  ).slice(0, limit);
}

/** [SAMPLE] 네트워크 지연을 흉내내는 로컬 샘플 검색 */
class SampleBookSearchService implements BookSearchService {
  async search(query: string, options?: { signal?: AbortSignal }): Promise<BookSearchResult> {
    await wait(450, options?.signal);
    const q = normalize(query);
    if (!q) return { items: [], total: 0, isSample: true };
    const items = SAMPLE_CATALOG.filter((b) =>
      [b.title, b.subtitle ?? '', b.publisher, b.genre, ...b.authors, ...(b.translators ?? [])]
        .map(normalize)
        .some((field) => field.includes(q)),
    );
    return { items, total: items.length, isSample: true };
  }

  async getById(id: string, options?: { signal?: AbortSignal }): Promise<Book | null> {
    await wait(250, options?.signal);
    return SAMPLE_CATALOG.find((b) => b.id === id) ?? null;
  }

  async popularKeywords(): Promise<string[]> {
    return SAMPLE_POPULAR_KEYWORDS;
  }

  async recommendations(excludeIds: string[], limit = 8): Promise<Book[]> {
    await wait(300);
    const exclude = new Set(excludeIds);
    return SAMPLE_CATALOG.filter((b) => !exclude.has(b.id)).slice(0, limit);
  }
}

export const bookSearchService: BookSearchService = new SampleBookSearchService();
