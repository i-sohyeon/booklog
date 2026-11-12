/**
 * 새 버전이 배포되면 예전 화면이 가리키던 파일(assets/*-해시.js·css)이 사라집니다.
 * 앱을 열어 둔 채로 배포가 끝난 뒤 다른 화면으로 이동하면 그 파일을 못 불러와 오류가 나므로,
 * 그런 경우엔 한 번만 새로고침해 새 버전을 받습니다(같은 오류로 계속 새로고침하지 않게 10초 안에는 다시 안 함).
 */
const KEY = 'booklog:stale-reload-at';

export function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Failed to fetch|ChunkLoadError/i.test(msg);
}

/** 새로고침을 시작했으면 true, 방금 새로고침했는데 또 실패한 거면 false */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* 저장소를 못 쓰면 그냥 새로고침 */
  }
  window.location.reload();
  return true;
}
