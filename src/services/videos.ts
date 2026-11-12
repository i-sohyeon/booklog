import { useEffect, useState } from 'react';

/** 유튜브 영상 (/api/videos 서버 함수) */
export interface Video {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
}

export type VideoState =
  | { status: 'loading' }
  | { status: 'ready'; items: Video[] }
  /** 키 미설정·할당량 초과 등 — '유튜브에서 찾아보기' 링크로 대신 */
  | { status: 'unavailable' };

const cache = new Map<string, Video[] | 'unavailable'>();

export const youtubeSearchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

/** 검색어로 영상 찾기 (같은 검색어는 이 화면을 쓰는 동안 다시 묻지 않음) */
export function useVideos(query: string, limit = 8): VideoState {
  const key = `${query}|${limit}`;
  const cached = cache.get(key);
  const [state, setState] = useState<VideoState>(
    cached === undefined ? { status: 'loading' } : cached === 'unavailable' ? { status: 'unavailable' } : { status: 'ready', items: cached },
  );

  useEffect(() => {
    const hit = cache.get(key);
    if (hit !== undefined) {
      setState(hit === 'unavailable' ? { status: 'unavailable' } : { status: 'ready', items: hit });
      return;
    }
    setState({ status: 'loading' });
    const ctrl = new AbortController();
    fetch(`/api/videos?${new URLSearchParams({ q: query, limit: String(limit) })}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const { items } = (await res.json()) as { items: Video[] };
        cache.set(key, items);
        setState({ status: 'ready', items });
      })
      .catch((e: unknown) => {
        if ((e as Error).name === 'AbortError') return;
        cache.set(key, 'unavailable');
        setState({ status: 'unavailable' });
      });
    return () => ctrl.abort();
  }, [key, query, limit]);

  return state;
}
