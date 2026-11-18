/*
 * 북로그 서비스 워커 (PWA)
 * - 화면(HTML)은 항상 서버에서 최신을 먼저 받아요 → 배포하면 바로 새 버전. 인터넷이 끊기면 저장해 둔 화면 → 그것도 없으면 오프라인 안내.
 * - /assets/* (이름에 해시가 붙어 내용이 바뀌지 않는 JS·CSS)는 한 번 받으면 휴대폰에 저장해 두고 바로 씀 → 두 번째부터 빠르게 열림.
 * - 아이콘·폰트·표지 같은 이미지는 저장본을 먼저 보여 주고 뒤에서 새로 받아 둠.
 * - /api/*, Supabase(로그인·서재 데이터) 같은 다른 주소의 요청은 건드리지 않아요.
 * 캐시 구조를 바꾸면 VERSION 을 올려 주세요 (예전 저장본은 자동으로 지워짐).
 */
const VERSION = 'v1';
const PAGES = `booklog-pages-${VERSION}`;
const ASSETS = `booklog-assets-${VERSION}`;
const MEDIA = `booklog-media-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('booklog-') && ![PAGES, ASSETS, MEDIA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** 화면: 서버 먼저 → 실패하면 저장본 → 오프라인 안내 */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') cache.put('/', res.clone()); // SPA라 화면 뼈대는 하나만 저장
    return res;
  } catch {
    return (await cache.match('/')) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

/** 해시 붙은 파일: 저장본 먼저 */
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    // 배포가 쌓이면 예전 파일이 남으니 최근 것만 남김
    const keys = await cache.keys();
    if (keys.length > 150) await Promise.all(keys.slice(0, keys.length - 150).map((k) => cache.delete(k)));
  }
  return res;
}

/** 이미지·폰트: 저장본을 바로 보여 주고 뒤에서 새로 받기 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase·카카오 등은 그대로
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // 랜딩·디자인 안내 같은 별도 HTML 은 그대로 서버에서
    if (url.pathname.startsWith('/landing')) return;
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (/\.(png|jpe?g|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
