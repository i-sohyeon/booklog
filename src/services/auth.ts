import type { AuthError, User } from '@supabase/supabase-js';
import { setRememberLogin, supabase } from '@/lib/supabase';
import { flushLibrarySync } from './librarySync';

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Supabase가 설정되지 않았어요. .env.local 을 확인해 주세요.');
    this.name = 'AuthNotConfiguredError';
  }
}

export function toAuthUser(user: User): AuthUser {
  const email = user.email ?? '';
  const meta = user.user_metadata as { nickname?: unknown } | undefined;
  const nickname = typeof meta?.nickname === 'string' && meta.nickname.trim() ? meta.nickname.trim() : email.split('@')[0] || '독자';
  return { id: user.id, email, nickname };
}

/** Supabase 오류 → 사용자용 한국어 메시지 */
export function authErrorMessage(err: unknown): string {
  if (err instanceof AuthNotConfiguredError) return err.message;
  const e = err as Partial<AuthError> | undefined;
  const code = e?.code ?? '';
  const msg = (e?.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않아요.';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return '메일 인증이 아직 완료되지 않았어요. 받은 편지함을 확인해 주세요.';
  if (code === 'user_already_exists' || msg.includes('already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (code === 'weak_password' || msg.includes('password should be')) return '비밀번호가 너무 약해요. 8자 이상으로 영문과 숫자를 섞어주세요.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit'))
    return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  if (code === 'same_password') return '이전과 다른 비밀번호를 입력해 주세요.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return '네트워크 연결을 확인해 주세요.';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

function client() {
  if (!supabase) throw new AuthNotConfiguredError();
  return supabase;
}

export const authService = {
  /** remember: 자동 로그인 (브라우저를 닫아도 로그인 유지) */
  async signIn(email: string, password: string, remember = false): Promise<AuthUser> {
    setRememberLogin(remember);
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return toAuthUser(data.user);
  },

  /** needsConfirmation: 이메일 인증이 켜져 있으면 세션 없이 가입만 완료됨 */
  async signUp(email: string, password: string, nickname: string): Promise<{ needsConfirmation: boolean }> {
    // 가입 직후 로그인도 기본값(자동 로그인 끔 — 새로고침하면 로그아웃)
    setRememberLogin(false);
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: { data: { nickname }, emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    // 이미 가입된 이메일은 identities가 비어 있는 형태로 응답될 수 있음
    if (data.user && data.user.identities?.length === 0) throw { code: 'user_already_exists', message: 'already registered' };
    return { needsConfirmation: !data.session };
  },

  async signOut(): Promise<void> {
    // 0.8초 모아 두던 서재 변경이 있으면 먼저 저장
    await flushLibrarySync().catch(() => undefined);
    const { error } = await client().auth.signOut();
    // 다음 로그인은 다시 기본값(자동 로그인 끔)으로
    setRememberLogin(false);
    if (error) throw error;
  },

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await client().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/password`,
    });
    if (error) throw error;
  },

  /** 닉네임 바꾸기: 계정 정보(로그인 표시용)와 프로필(친구에게 보이는 이름)을 함께 */
  async updateNickname(nickname: string): Promise<void> {
    const n = nickname.trim();
    const db = client();
    const { data, error } = await db.auth.updateUser({ data: { nickname: n } });
    if (error) throw error;
    const { error: profileError } = await db.from('profiles').update({ nickname: n }).eq('id', data.user.id);
    if (profileError) throw profileError;
  },

  async updatePassword(password: string): Promise<void> {
    const { error } = await client().auth.updateUser({ password });
    if (error) throw error;
  },
};
