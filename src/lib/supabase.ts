import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** .env.local 에 Supabase 값이 있을 때만 true */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'));

/** sessionStorage (막혀 있으면 메모리) */
function tabStorage() {
  try {
    // 예전 버전이 localStorage에 남긴 로그인 정보 정리 (이제는 탭에만 저장)
    for (const key of Object.keys(window.localStorage)) if (/^sb-.*-auth-token/.test(key)) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    const k = '__booklog_probe__';
    window.sessionStorage.setItem(k, '1');
    window.sessionStorage.removeItem(k);
    return window.sessionStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => void mem.set(key, value),
      removeItem: (key: string) => void mem.delete(key),
    };
  }
}

/**
 * Supabase 클라이언트. 설정이 없으면 null —
 * 호출부는 반드시 isSupabaseConfigured / null 체크 후 사용합니다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      // 기본은 로그아웃 상태: 로그인은 이 탭(브라우저 창)이 열려 있는 동안만 유지되고,
      // 탭을 닫았다 다시 열면 로그아웃된 상태로 시작합니다. (새로고침은 유지)
      auth: { persistSession: true, storage: tabStorage(), autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
