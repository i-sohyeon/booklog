import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** .env.local 에 Supabase 값이 있을 때만 true */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'));

/**
 * Supabase 클라이언트. 설정이 없으면 null —
 * 호출부는 반드시 isSupabaseConfigured / null 체크 후 사용합니다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
