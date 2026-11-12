/**
 * 카카오(Daum) 책 검색 API → BookLog 책 형식 변환 (서버 전용).
 * REST API 키는 서버 환경변수 KAKAO_REST_KEY 에만 두고 브라우저로 보내지 않습니다.
 * 카카오는 장르(분류)와 베스트셀러 순위를 주지 않습니다 → 장르는 '기타'(화면에서 숨김, 기록할 때 직접 선택).
 */
import type { Book, CoverTone } from '../src/types/book';

const ENDPOINT = 'https://dapi.kakao.com/v3/search/book';

interface KakaoDoc {
  title: string;
  contents: string;
  url: string;
  /** "ISBN10 ISBN13" (둘 중 하나만 있을 수 있음) */
  isbn: string;
  datetime: string;
  authors: string[];
  publisher: string;
  translators: string[];
  thumbnail: string;
}

interface KakaoResponse {
  meta: { total_count: number; pageable_count: number; is_end: boolean };
  documents: KakaoDoc[];
}

export class NotConfiguredError extends Error {}

const TONES: CoverTone[] = ['plum', 'forest', 'navy', 'clay', 'mustard', 'charcoal', 'rose', 'sea'];
const toneFor = (s: string) => TONES[[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length]!;

/** 검색 썸네일(120px)의 원본 이미지 주소를 꺼내 더 선명하게 */
function largerCover(thumb: string): string | undefined {
  if (!thumb) return undefined;
  try {
    const fname = new URL(thumb).searchParams.get('fname');
    if (fname) return fname.replace(/^http:/, 'https:');
  } catch {
    /* 그대로 사용 */
  }
  return thumb.replace(/^http:/, 'https:');
}

export function toBook(d: KakaoDoc): Book {
  const isbns = d.isbn.split(/\s+/).filter(Boolean);
  const isbn = isbns.find((x) => x.length === 13) ?? isbns[0];
  const key = isbn ?? d.url;
  return {
    id: `isbn-${isbn ?? encodeURIComponent(d.url).slice(-40)}`,
    isbn,
    title: d.title.trim(),
    authors: d.authors.length ? d.authors : ['작자 미상'],
    translators: d.translators.length ? d.translators : undefined,
    publisher: d.publisher,
    publishedAt: d.datetime ? d.datetime.slice(0, 7) : '',
    // 진도 기록을 하지 않아 화면에 쓰이지 않음 — DB 제약(> 0) 때문에 1
    pageCount: 1,
    genre: '기타',
    description: d.contents.trim(),
    coverUrl: largerCover(d.thumbnail),
    coverTone: toneFor(key),
    sourceUrl: d.url,
  };
}

async function call(params: Record<string, string | number>): Promise<KakaoResponse> {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) throw new NotConfiguredError('KAKAO_REST_KEY is not set');
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const res = await fetch(`${ENDPOINT}?${qs}`, { headers: { Authorization: `KakaoAK ${key}` } });
  if (!res.ok) throw new Error(`Kakao ${res.status}: ${await res.text()}`);
  return (await res.json()) as KakaoResponse;
}

export async function searchBooks(query: string, page = 1) {
  const data = await call({ query, size: 20, page });
  return { items: data.documents.map(toBook), total: data.meta.pageable_count };
}

export async function lookupBook(isbn: string) {
  const data = await call({ query: isbn, target: 'isbn', size: 1 });
  const d = data.documents[0];
  return d ? toBook(d) : null;
}
