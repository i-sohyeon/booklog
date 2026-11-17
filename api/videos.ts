/**
 * GET /api/videos?q=검색어 — 유튜브 영상 검색 프록시 (Vercel 서버 함수)
 * - 키: 서버 환경변수 YOUTUBE_API_KEY (Google Cloud › YouTube Data API v3)
 * - 무료 할당량이 하루 1만 단위, 검색 1번에 100단위라 결과를 하루 동안 캐시해 아껴 씁니다.
 * - 키가 없으면 503 { error: 'not_configured' } — 앱은 '유튜브에서 찾아보기' 링크로 대신합니다.
 */
interface YtItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string; width?: number; height?: number } | undefined>;
  };
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
}

const json = (body: unknown, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(maxAge ? { 'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` } : {}),
    },
  });

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length > 100) return json({ error: 'bad_request' }, 400);
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return json({ error: 'not_configured' }, 503);

  const params = new URLSearchParams({
    key,
    q,
    part: 'snippet',
    type: 'video',
    maxResults: String(Math.min(12, Math.max(1, Number(url.searchParams.get('limit')) || 8))),
    regionCode: 'KR',
    relevanceLanguage: 'ko',
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
  });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!res.ok) {
      const body = await res.text();
      console.error('YouTube', res.status, body);
      // 하루 할당량 초과
      if (res.status === 403 && body.includes('quota')) return json({ error: 'quota' }, 429);
      return json({ error: 'upstream' }, 502);
    }
    const data = (await res.json()) as { items?: YtItem[] };
    const items: Video[] = (data.items ?? [])
      .filter((it) => it.id.videoId)
      .map((it) => ({
        id: it.id.videoId!,
        title: decode(it.snippet.title),
        channel: decode(it.snippet.channelTitle),
        publishedAt: it.snippet.publishedAt,
        thumbnail: (it.snippet.thumbnails.high ?? it.snippet.thumbnails.medium ?? it.snippet.thumbnails.default)?.url ?? '',
      }));
    return json({ items }, 200, 86400);
  } catch (e) {
    console.error(e);
    return json({ error: 'upstream' }, 502);
  }
}
