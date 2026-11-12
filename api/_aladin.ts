/**
 * 알라딘 Open API → BookLog 책 형식 변환 (서버 전용).
 * TTB 키는 서버 환경변수 ALADIN_TTB_KEY 에만 두고 브라우저로 보내지 않습니다.
 * 이용 조건: 화면에 "도서 DB 제공: 알라딘" 출처 표기 (앱의 AladinCredit 컴포넌트)
 */
import type { Book, CoverTone, Genre } from '../src/types/book';

const BASE = 'https://www.aladin.co.kr/ttb/api';
const VERSION = '20131101';

interface AladinItem {
  itemId: number;
  title: string;
  author: string;
  pubDate: string;
  description: string;
  isbn: string;
  isbn13: string;
  cover: string;
  categoryName: string;
  publisher: string;
  link: string;
  subInfo?: { subTitle?: string; itemPage?: number };
}

interface AladinResponse {
  totalResults?: number;
  item?: AladinItem[];
  errorCode?: number;
  errorMessage?: string;
}

export class NotConfiguredError extends Error {}

/** 앱의 베스트셀러 카테고리 → 알라딘 CategoryId (국내도서) */
export const BESTSELLER_CATEGORY: Record<string, number> = {
  종합: 0,
  소설: 1,
  에세이: 55889,
  인문: 656,
  자기계발: 336,
};

const TONES: CoverTone[] = ['plum', 'forest', 'navy', 'clay', 'mustard', 'charcoal', 'rose', 'sea'];
const toneFor = (s: string) => TONES[[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length]!;

/** "국내도서>소설/시/희곡>한국소설>..." → 앱 장르 */
export function toGenre(categoryName: string): Genre {
  const [, top = '', sub = ''] = categoryName.split('>');
  if (top.startsWith('소설/시/희곡')) return sub.startsWith('시') ? '시' : '소설';
  if (top.startsWith('에세이')) return '에세이';
  if (top.startsWith('인문학') || top.startsWith('사회과학') || top.startsWith('종교')) return '인문';
  if (top.startsWith('역사')) return '역사';
  if (top.startsWith('과학') || top.startsWith('컴퓨터')) return '과학';
  if (top.startsWith('경제경영')) return '경제경영';
  if (top.startsWith('자기계발')) return '자기계발';
  if (top.startsWith('예술') || top.startsWith('만화')) return '예술';
  return '기타';
}

/** "한강 (지은이), 홍길동 (옮긴이)" → 저자 / 옮긴이 */
function parsePeople(author: string) {
  const authors: string[] = [];
  const translators: string[] = [];
  for (const part of author.split(/,\s*/)) {
    const m = part.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const name = (m ? m[1] : part)!.trim();
    if (!name) continue;
    if (m && /옮긴이|번역|역/.test(m[2]!)) translators.push(name);
    else authors.push(name);
  }
  return { authors: authors.length ? authors : [author.trim() || '작자 미상'], translators };
}

/** HTML 엔티티 몇 가지만 정리 (알라딘 설명문에 섞여 옴) */
const clean = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

export function toBook(it: AladinItem): Book & { sourceUrl: string } {
  const isbn = it.isbn13 || it.isbn || String(it.itemId);
  const [title, ...rest] = clean(it.title).split(' - ');
  const { authors, translators } = parsePeople(clean(it.author));
  return {
    id: `al-${isbn}`,
    isbn: it.isbn13 || it.isbn || undefined,
    title: title!.trim(),
    subtitle: clean(it.subInfo?.subTitle || rest.join(' - ')) || undefined,
    authors,
    translators: translators.length ? translators : undefined,
    publisher: clean(it.publisher),
    publishedAt: it.pubDate?.slice(0, 7) ?? '',
    // 진도 기록을 하지 않아 화면에 쓰이지 않음 — DB 제약(> 0) 때문에 모르면 1
    pageCount: it.subInfo?.itemPage && it.subInfo.itemPage > 0 ? it.subInfo.itemPage : 1,
    genre: toGenre(it.categoryName ?? ''),
    description: clean(it.description ?? ''),
    coverUrl: it.cover || undefined,
    coverTone: toneFor(isbn),
    sourceUrl: it.link,
  };
}

async function call(endpoint: string, params: Record<string, string | number>): Promise<AladinResponse> {
  const key = process.env.ALADIN_TTB_KEY;
  if (!key) throw new NotConfiguredError('ALADIN_TTB_KEY is not set');
  const qs = new URLSearchParams({ ttbkey: key, output: 'js', Version: VERSION, Cover: 'Big', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Aladin ${res.status}`);
  // 알라딘 js 출력은 끝에 세미콜론이 붙는 경우가 있음
  const text = (await res.text()).trim().replace(/;\s*$/, '');
  const data = JSON.parse(text) as AladinResponse;
  if (data.errorCode) throw new Error(`Aladin error ${data.errorCode}: ${data.errorMessage}`);
  return data;
}

export async function searchBooks(query: string, page = 1) {
  const data = await call('ItemSearch.aspx', { Query: query, QueryType: 'Keyword', SearchTarget: 'Book', MaxResults: 20, start: page });
  return { items: (data.item ?? []).map(toBook), total: data.totalResults ?? 0 };
}

export async function lookupBook(isbn: string) {
  const data = await call('ItemLookUp.aspx', { ItemId: isbn, ItemIdType: isbn.length === 13 ? 'ISBN13' : 'ISBN', OptResult: 'subTitle' });
  const it = data.item?.[0];
  return it ? toBook(it) : null;
}

export async function bestsellers(category: string) {
  const id = BESTSELLER_CATEGORY[category] ?? 0;
  const data = await call('ItemList.aspx', { QueryType: 'Bestseller', SearchTarget: 'Book', MaxResults: 10, start: 1, CategoryId: id });
  return { items: (data.item ?? []).map(toBook), total: data.totalResults ?? 0 };
}
