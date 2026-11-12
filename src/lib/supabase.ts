import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** .env.local 에 Supabase 값이 있을 때만 true */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'));

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** 접근이 막혀 있으면(사파리 개인 정보 보호 모드 등) 메모리로 대신 */
function safe(get: () => Storage): KV {
  try {
    const st = get();
    const k = '__booklog_probe__';
    st.setItem(k, '1');
    st.removeItem(k);
    return st;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (key) => mem.get(key) ?? null, setItem: (key, value) => void mem.set(key, value), removeItem: (key) => void mem.delete(key) };
  }
}

const local = safe(() => window.localStorage);
/** 자동 로그인을 안 켰을 때: 메모리에만 — 새로고침하거나 다시 열면 로그아웃 상태로 시작 */
const memory: KV = (() => {
  const mem = new Map<string, string>();
  return { getItem: (key) => mem.get(key) ?? null, setItem: (key, value) => void mem.set(key, value), removeItem: (key) => void mem.delete(key) };
})();
const tab = memory;
const REMEMBER_KEY = 'booklog:remember-login';

/** 자동 로그인을 켰는지 */
export const isRememberLogin = () => local.getItem(REMEMBER_KEY) === '1';

/** 로그인 직전에 호출: 켜면 브라우저를 닫아도 로그인 유지, 끄면 이 탭에서만 */
export function setRememberLogin(on: boolean) {
  if (on) local.setItem(REMEMBER_KEY, '1');
  else local.removeItem(REMEMBER_KEY);
}

/**
 * 로그인 정보 저장소.
 * - 기본(자동 로그인 끔): 메모리 — 새로고침하거나 앱·탭을 다시 열면 로그아웃 상태로 시작
 * - 자동 로그인 켬: localStorage — 다시 열어도 로그인 유지
 */
const authStorage: KV = {
  getItem: (key) => (isRememberLogin() ? local : tab).getItem(key),
  setItem: (key, value) => {
    const [use, other] = isRememberLogin() ? [local, tab] : [tab, local];
    use.setItem(key, value);
    other.removeItem(key);
  },
  removeItem: (key) => {
    local.removeItem(key);
    tab.removeItem(key);
  },
};

// 자동 로그인을 켜지 않았는데 남아 있는 로그인 정보(예전 버전이 저장한 것)는 정리
if (typeof window !== 'undefined') {
  for (const get of [() => window.sessionStorage, ...(isRememberLogin() ? [] : [() => window.localStorage])]) {
    try {
      const st = get();
      for (const key of Object.keys(st)) if (/^sb-.*-auth-token/.test(key)) st.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Supabase 클라이언트. 설정이 없으면 null —
 * 호출부는 반드시 isSupabaseConfigured / null 체크 후 사용합니다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      // 기본은 로그아웃 상태로 시작, '자동 로그인'을 켜면 유지 (authStorage 참고)
      auth: { persistSession: true, storage: authStorage, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
