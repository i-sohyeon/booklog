/**
 * GET /api/books — 카카오 책 검색 프록시 (Vercel 서버 함수)
 *   ?q=검색어[&page=2]     책 검색
 *   ?isbn=9788954682152     책 한 권
 *   ?cover=1&title=..&author=..  제목·저자로 표지 주소 찾기 (샘플 도서용)
 *   ?image=<표지 주소>      카카오 표지 이미지를 같은 출처로 전달 (책등 색을 뽑으려고 캔버스에 그릴 때 필요)
 * 키가 없으면 503 { error: 'not_configured' } — 앱은 샘플 도서로 대신 보여줍니다.
 * (베스트셀러 순위는 카카오가 제공하지 않아 앱에서 샘플 차트를 씁니다)
 */
import { findCover, lookupBook, NotConfiguredError, searchBooks } from './_kakao.js';

const json = (body: unknown, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(maxAge ? { 'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` } : {}),
    },
  });

/** 표지 이미지 전달은 카카오 이미지 서버만 (아무 주소나 대신 받아 주는 통로가 되지 않게) */
const IMAGE_HOSTS = /(^|\.)(daumcdn\.net|kakaocdn\.net)$/;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

async function proxyImage(raw: string): Promise<Response> {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!/^https?:$/.test(target.protocol) || !IMAGE_HOSTS.test(target.hostname)) return json({ error: 'bad_request' }, 400);
  target.protocol = 'https:';
  const res = await fetch(target, { redirect: 'error' });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) return json({ error: 'upstream' }, 502);
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_IMAGE_BYTES) return json({ error: 'too_large' }, 502);
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=604800, s-maxage=2592000, immutable' } });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const image = url.searchParams.get('image');
  if (image) {
    try {
      return await proxyImage(image);
    } catch (e) {
      console.error(e);
      return json({ error: 'upstream' }, 502);
    }
  }
  const q = url.searchParams.get('q')?.trim();
  const isbn = url.searchParams.get('isbn')?.trim();
  try {
    if (q) {
      if (q.length > 100) return json({ error: 'bad_request' }, 400);
      const page = Math.min(50, Math.max(1, Number(url.searchParams.get('page')) || 1));
      return json(await searchBooks(q, page), 200, 3600);
    }
    if (url.searchParams.get('cover')) {
      const title = url.searchParams.get('title')?.trim() ?? '';
      const author = url.searchParams.get('author')?.trim() ?? '';
      if (!title || title.length > 100 || author.length > 60) return json({ error: 'bad_request' }, 400);
      return json({ coverUrl: await findCover(title, author) }, 200, 604800);
    }
    if (isbn) {
      if (!/^[0-9Xx-]{10,17}$/.test(isbn)) return json({ error: 'bad_request' }, 400);
      const book = await lookupBook(isbn.replace(/-/g, ''));
      return book ? json({ item: book }, 200, 86400) : json({ error: 'not_found' }, 404);
    }
    return json({ error: 'bad_request' }, 400);
  } catch (e) {
    if (e instanceof NotConfiguredError) return json({ error: 'not_configured' }, 503);
    console.error(e);
    return json({ error: 'upstream' }, 502);
  }
}
