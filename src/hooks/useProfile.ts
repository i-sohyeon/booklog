import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { SAMPLE_USER } from '@/mocks/user';
import { useCloudStore } from '@/store/cloudStore';

export interface DisplayProfile {
  nickname: string;
  handle?: string;
  bio?: string;
  /** 어디서 온 프로필인지 — UI에서 임시 사용자 구분 */
  source: 'account' | 'sample' | 'guest';
}

/** 화면에 표시할 사용자: 로그인 계정 → 샘플 사용자 → 게스트 */
export function useProfile(): DisplayProfile {
  const user = useAuthStore((s) => s.user);
  const isSample = useLibraryStore((s) => s.dataSource === 'sample');
  // 소개는 서버 프로필(profiles.bio)에서
  const bio = useCloudStore((s) => (user ? s.profiles[user.id]?.bio : undefined));
  if (user) return { nickname: user.nickname, handle: user.email, bio, source: 'account' };
  if (isSample) return { nickname: SAMPLE_USER.nickname, handle: `@${SAMPLE_USER.handle}`, bio: SAMPLE_USER.bio, source: 'sample' };
  return { nickname: '독자', source: 'guest' };
}
