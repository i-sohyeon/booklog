/**
 * 테스트(체험) 계정 — 로그인 화면의 "테스트 계정으로 둘러보기" 버튼이 사용합니다.
 *
 * ⚠️ 누구나 쓸 수 있는 공개 체험 계정이에요. 이 비밀번호는 앱 코드(브라우저)에 그대로 들어가므로
 *    실제 개인 정보나 다른 서비스 비밀번호를 여기에 쓰지 마세요.
 * 계정과 샘플 데이터는 supabase/demo_seed.sql 로 만들고, 다시 실행하면 처음 상태로 되돌아갑니다.
 * (SQL은 `npm run demo:seed` 로 이 파일 기준으로 다시 생성)
 */
export interface DemoAccount {
  key: 'a' | 'b';
  /** 고정 UUID — 시드 SQL과 동일 */
  id: string;
  nickname: string;
  email: string;
  password: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: 'a',
    id: 'd0d0a000-0000-4000-8000-00000000000a',
    nickname: '테스트독자A',
    email: 'demo-a@booklog.test',
    password: 'HRUuAq5lZSLhDzUu',
    description: '다 읽은 책 20권 · 문장·태그가 채워진 서재',
  },
  {
    key: 'b',
    id: 'd0d0b000-0000-4000-8000-00000000000b',
    nickname: '테스트독자B',
    email: 'demo-b@booklog.test',
    password: '7-EOViQ3pq8zHDRm',
    description: 'A와 서로 팔로우 · 후기와 게시글이 있는 친구',
  },
];

export const isDemoUser = (id: string | null | undefined) => DEMO_ACCOUNTS.some((a) => a.id === id);
