import { useSyncExternalStore } from 'react';
import type { LibraryEntry } from '@/types/book';
import { supabase } from '@/lib/supabase';
import { useLibraryStore, type LibraryState } from '@/store/libraryStore';
import { useSocialStore } from '@/store/socialStore';
import { isDemoUser } from '@/config/demoAccounts';
import { downloadLibrary, toBookRow, toEntryRow } from './cloudSync';

/**
 * 로그인한 동안 서재를 계정(Supabase)에 자동 저장합니다.
 *
 * - 로그인 직후: 계정 서재를 내려받아 이 기기 기록과 합칩니다(책마다 더 최근에 고친 쪽).
 *   · 이 기기 기록이 같은 계정 것이거나 로그인 전에 쓴 기록이면 합쳐서 올립니다.
 *   · 샘플 서재이거나 다른 계정이 쓰던 기기면 계정 서재로 바꿉니다(섞이지 않게).
 * - 그 뒤로는 기록이 바뀔 때마다 0.8초 모아서 바뀐 책만 올리고, 지운 책은 계정에서도 지웁니다.
 * - 문장 사진은 용량 때문에 이 기기에만 남습니다(텍스트 문장만 저장).
 */
export type SyncStatus = 'off' | 'loading' | 'saving' | 'saved' | 'error';

type Listener = (status: SyncStatus, error?: string) => void;
const listeners = new Set<Listener>();
let status: SyncStatus = 'off';
let lastError: string | undefined;

function setStatus(next: SyncStatus, error?: string) {
  status = next;
  lastError = error;
  listeners.forEach((l) => l(next, error));
}

export function getSyncStatus() {
  return { status, error: lastError };
}

export function onSyncStatus(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

let snapshot: { status: SyncStatus; error?: string } = { status, error: lastError };
/** 화면용: 자동 저장 상태 */
export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => onSyncStatus(cb),
    () => (snapshot.status === status && snapshot.error === lastError ? snapshot : (snapshot = { status, error: lastError })),
  );
}

const OWNER_KEY = 'booklog:library-owner';
const readOwner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};
const writeOwner = (id: string) => {
  try {
    localStorage.setItem(OWNER_KEY, id);
  } catch {
    /* ignore */
  }
};

/** 같은 책이면 더 최근에 고친 기록을 쓰고, 기기에만 있는 문장 사진은 살립니다 */
function mergeEntry(local: LibraryEntry | undefined, server: LibraryEntry | undefined): LibraryEntry {
  if (!local) return server!;
  if (!server) return local;
  if (local.updatedAt >= server.updatedAt) return local;
  const photos = new Map((local.quotes ?? []).filter((q) => q.image).map((q) => [q.id, q.image]));
  if (!photos.size) return server;
  const quotes = (server.quotes ?? []).map((q) => (photos.has(q.id) ? { ...q, image: photos.get(q.id) } : q));
  const serverIds = new Set(quotes.map((q) => q.id));
  const photoOnly = (local.quotes ?? []).filter((q) => q.image && !q.text && !serverIds.has(q.id));
  return { ...server, quotes: [...quotes, ...photoOnly] };
}

let stop: (() => void) | null = null;
let flushNow: (() => Promise<void>) | null = null;
let activeUser: string | null = null;

export async function startLibrarySync(userId: string) {
  if (!supabase || activeUser === userId) return;
  stopLibrarySync();
  activeUser = userId;
  setStatus('loading');

  let baseline: LibraryState['entries'];
  try {
    const server = await downloadLibrary(userId);
    if (activeUser !== userId) return;
    const local = useLibraryStore.getState();
    const owner = readOwner();
    // 테스트 계정에는 이 기기의 게스트 기록을 섞지 않음
    const adoptLocal = local.dataSource === 'local' && (!owner || owner === userId) && !isDemoUser(userId);

    if (adoptLocal) {
      const ids = new Set([...Object.keys(local.entries), ...Object.keys(server.entries)]);
      const entries: LibraryState['entries'] = {};
      for (const id of ids) entries[id] = mergeEntry(local.entries[id], server.entries[id]);
      const books = { ...server.books, ...local.books };
      useLibraryStore.getState().replaceAll({ books, entries });
      // 서버보다 새로운(또는 서버에 없는) 기록만 올림
      const changed = Object.values(entries).filter((e) => e !== server.entries[e.bookId] && books[e.bookId]);
      await push(userId, changed, []);
    } else {
      useLibraryStore.getState().replaceAll(server);
    }
    // 이 기기에서 이 계정으로 처음 로그인: 샘플 친구·샘플 모임 참여가 내 것처럼 보이지 않게 비움
    if (owner !== userId) useSocialStore.getState().clearSampleRelations();
    writeOwner(userId);
    baseline = useLibraryStore.getState().entries;
    setStatus('saved');
  } catch (e) {
    activeUser = null;
    setStatus('error', e instanceof Error ? e.message : String(e));
    return;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> = Promise.resolve();

  const flush = () => {
    clearTimeout(timer);
    running = running.then(async () => {
      const state = useLibraryStore.getState();
      if (state.dataSource === 'sample' || activeUser !== userId) return;
      const current = state.entries;
      const changed = Object.values(current).filter((e) => baseline[e.bookId] !== e && state.books[e.bookId]);
      const removed = Object.keys(baseline).filter((id) => !current[id]);
      if (!changed.length && !removed.length) return;
      setStatus('saving');
      try {
        await push(userId, changed, removed);
        baseline = current;
        setStatus('saved');
      } catch (e) {
        setStatus('error', e instanceof Error ? e.message : String(e));
      }
    });
    return running;
  };
  flushNow = flush;

  const unsub = useLibraryStore.subscribe((s, prev) => {
    if (s.entries === prev.entries) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 800);
  });
  const onOnline = () => flush();
  window.addEventListener('online', onOnline);

  stop = () => {
    clearTimeout(timer);
    unsub();
    window.removeEventListener('online', onOnline);
  };
}

/** 로그아웃 직전: 아직 올리지 않은 변경을 바로 저장 */
export async function flushLibrarySync() {
  await flushNow?.();
}

export function stopLibrarySync() {
  stop?.();
  stop = null;
  flushNow = null;
  activeUser = null;
  setStatus('off');
}

async function push(userId: string, changed: LibraryEntry[], removed: string[]) {
  const db = supabase!;
  const books = useLibraryStore.getState().books;
  if (changed.length) {
    const bookRows = changed.map((e) => books[e.bookId]).filter(Boolean).map((b) => toBookRow(b!));
    const r1 = await db.from('books').upsert(bookRows);
    if (r1.error) throw new Error(r1.error.message);
    const r2 = await db.from('library_entries').upsert(changed.map((e) => toEntryRow(userId, e)));
    if (r2.error) throw new Error(r2.error.message);
  }
  if (removed.length) {
    const r3 = await db.from('library_entries').delete().eq('user_id', userId).in('book_id', removed);
    if (r3.error) throw new Error(r3.error.message);
  }
}

/**
 * 로그아웃 상태가 되면(직접 로그아웃 · 자동 로그인 없이 새로고침하거나 다시 연 경우 모두)
 * 이 기기에 남아 있던 계정 기록을 화면에서 내리고 샘플 데이터로 되돌립니다.
 * 계정 기록은 서버에 저장돼 있어 다시 로그인하면 그대로 불러옵니다.
 */
export function resetAfterSignOut() {
  if (!readOwner()) return;
  useLibraryStore.getState().loadSample();
  useSocialStore.getState().reset();
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
}
