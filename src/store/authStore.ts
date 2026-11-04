import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { toAuthUser, type AuthUser } from '@/services/auth';

export type AuthStatus = 'unconfigured' | 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** 비밀번호 재설정 메일 링크로 들어온 상태 */
  recovery: boolean;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: isSupabaseConfigured ? 'loading' : 'unconfigured',
  user: null,
  recovery: false,
  init: () => {
    if (!supabase) return () => {};
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      set({ status: u ? 'signedIn' : 'signedOut', user: u ? toAuthUser(u) : null });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      set({
        status: u ? 'signedIn' : 'signedOut',
        user: u ? toAuthUser(u) : null,
        ...(event === 'PASSWORD_RECOVERY' ? { recovery: true } : {}),
      });
    });
    return () => data.subscription.unsubscribe();
  },
}));
