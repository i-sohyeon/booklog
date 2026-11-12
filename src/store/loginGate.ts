import { create } from 'zustand';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from './authStore';

/**
 * 로그인 상태 구분.
 * - member: 로그인함 (Supabase 미설정 개발 환경은 기기 저장 모드라 member로 취급)
 * - guest: 로그인 안 함 — 둘러보기만 가능, 기록·좋아요·글쓰기는 로그인 안내
 * - loading: 세션 확인 중 (잠깐)
 */
export type AuthGate = 'member' | 'guest' | 'loading';

const gateOf = (status: ReturnType<typeof useAuthStore.getState>['status']): AuthGate =>
  !isSupabaseConfigured || status === 'unconfigured' || status === 'signedIn' ? 'member' : status === 'loading' ? 'loading' : 'guest';

export const useAuthGate = () => useAuthStore((s) => gateOf(s.status));
export const isGuestNow = () => gateOf(useAuthStore.getState().status) !== 'member';

interface LoginPromptState {
  reason: string | null;
  open: (reason: string) => void;
  close: () => void;
}

/** "로그인이 필요해요" 시트 */
export const useLoginPrompt = create<LoginPromptState>((set) => ({
  reason: null,
  open: (reason) => set({ reason }),
  close: () => set({ reason: null }),
}));

/** 로그인했으면 true, 아니면 로그인 안내 시트를 열고 false */
export function requireLogin(reason = '이 기능은 로그인 후에 쓸 수 있어요.'): boolean {
  if (!isGuestNow()) return true;
  useLoginPrompt.getState().open(reason);
  return false;
}
