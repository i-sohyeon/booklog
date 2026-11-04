# BookLog · 북로그

나의 독서 생활을 기록하고, 함께 나누는 공간.

## 실행

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # 타입체크 + 프로덕션 빌드
npm run typecheck
```

## 기술 스택
React 19 · TypeScript · Vite 6 · SCSS Modules · React Router 7 · Zustand 5 (persist) · Supabase JS v2 · lucide-react(아이콘)

## Supabase 연결 (선택)
설정이 없으면 앱은 로컬 전용으로 동작하고, 로그인 화면은 "연결되지 않음" 안내와 함께 비활성화됩니다.

1. Supabase 프로젝트 생성
2. SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql) 실행 (테이블 + RLS + 가입 시 프로필 생성 트리거)
3. Authentication › URL Configuration에 `http://localhost:5180` 추가 (메일 인증·비밀번호 재설정 리다이렉트용)
4. `.env.example`을 `.env.local`로 복사해 URL과 anon key 입력 후 `npm run dev` 재시작

## 구조
```
src/
  components/
    ui/        공통 UI (Button, BookCover, Sheet, Tabs …)
    layout/    AppLayout(사이드바·하단 탭·앱바), Page, Logo
    book/      도서 도메인 컴포넌트 (목록/격자 아이템, 서재 담기, 진도 기록)
    stats/     목표 설정, 월간 캘린더
  pages/       화면 단위 (home, library, search, book, me, misc)
  routes/      경로 상수, 내비게이션 설정, 라우터
  store/       Zustand 서재 스토어 + 파생 셀렉터
  services/    도서 검색 서비스 인터페이스 (현재 샘플 구현)
  mocks/       ⚠️ 샘플 데이터 (실제 데이터 아님)
  styles/      디자인 토큰, 전역 스타일, SCSS 믹스인
  types/ hooks/ lib/
docs/          IA.md, DESIGN_SYSTEM.md
```

## 샘플 데이터
- 첫 실행 시 `src/mocks`의 샘플 서재가 로드되며, 화면 상단 **"샘플 데이터"** 배지로 표시됩니다.
- 마이페이지 › 데이터 관리에서 비우기 / 다시 불러오기가 가능합니다 (빈 상태 확인용).
- 서재 데이터는 현재 브라우저 localStorage(`booklog:library`)에 저장됩니다.

## 외부 연동 지점
- 도서 검색 API: `src/services/bookSearch.ts`의 `BookSearchService` 구현 교체
- 인증: `src/services/auth.ts`, 세션 상태: `src/store/authStore.ts`
- 기기 ↔ 계정 데이터 이관: `src/services/cloudSync.ts` (마이페이지 › 기록 옮기기, 수동 실행)
