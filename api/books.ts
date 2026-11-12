/**
 * GET /api/books — 알라딘 도서 API 프록시 (Vercel 서버 함수)
 *   ?q=검색어[&page=2]        책 검색
 *   ?isbn=9788954682152        책 한 권
 *   ?list=bestseller&category=소설   주간 베스트셀러 (종합·소설·에세이·인문·자기계발)
 * 키가 없으면 503 { error: 'not_configured' } — 앱은 샘플 도서로 대신 보여줍니다.
 */
import { bestsellers, lookupBook, NotConfiguredError, searchBooks } from './_aladin.js';

const json = (body: unknown, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(maxAge ? { 'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` } : {}),
    },
  });

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const isbn = url.searchParams.get('isbn')?.trim();
  const list = url.searchParams.get('list');
  try {
    if (q) {
      if (q.length > 100) return json({ error: 'bad_request' }, 400);
      const page = Math.min(10, Math.max(1, Number(url.searchParams.get('page')) || 1));
      return json(await searchBooks(q, page), 200, 3600);
    }
    if (isbn) {
      if (!/^[0-9Xx-]{10,17}$/.test(isbn)) return json({ error: 'bad_request' }, 400);
      const book = await lookupBook(isbn.replace(/-/g, ''));
      return book ? json({ item: book }, 200, 86400) : json({ error: 'not_found' }, 404);
    }
    if (list === 'bestseller') {
      return json(await bestsellers(url.searchParams.get('category') ?? '종합'), 200, 21600);
    }
    return json({ error: 'bad_request' }, 400);
  } catch (e) {
    if (e instanceof NotConfiguredError) return json({ error: 'not_configured' }, 503);
    console.error(e);
    return json({ error: 'upstream' }, 502);
  }
}
