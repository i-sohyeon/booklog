# BookLog 디자인 시스템

키워드: Editorial · Minimal · Warm & Calm · Reading-focused · Premium

## 컬러
레거시 메인 `#7833BA`를 기준으로 **Plum 스케일**을 만들고, 차가운 회색 대신 **종이 톤(Paper/Ink)** 뉴트럴을 사용했습니다.

| 역할 | 토큰 | 값 | 비고 |
|------|------|----|------|
| Primary (버튼·링크) | `--color-primary` = plum-700 | `#5B2590` | 흰 텍스트 대비 약 9.9:1 (AAA) |
| Brand reference | plum-500 | `#7833BA` | 레거시 메인, 포커스 링 |
| Background | paper-50 | `#FBF8F3` | 따뜻한 종이 |
| Surface | paper-0 | `#FFFFFF` | 카드 |
| Text | ink-900 | `#1F1B17` | |
| Text secondary / tertiary | ink-600 / ink-500 | `#5A5249` / `#736A5F` | tertiary도 배경 대비 4.5:1 이상 |
| Accent | ochre-400 | `#E3A94B` | 별점, 연속 독서 등 "따뜻한 하이라이트"에만 사용 |
| 상태 | reading / want / done / paused | plum / ochre / sage / ink | 배경 + 진한 텍스트 조합 |

`#7833BA`는 흰 텍스트와 7:1 대비라 충분하지만, 넓은 면적의 버튼에서 채도가 강해 차분한 톤과 어긋나 **한 단계 깊은 plum-700**을 기본 액션 색으로 정했습니다.

## 타이포그래피
- **세리프(Noto Serif KR)**: 페이지 제목, 섹션 제목, 책 제목, 큰 숫자 — 책의 질감과 에디토리얼 위계
- **산세리프(Pretendard)**: 본문, UI, 레이블
- 반응형 스케일(`clamp`): display 28→40, title-1 24→30, title-2 20→23, body 15, caption 13
- 숫자는 `tabular-nums`로 정렬

## 간격 & 레이아웃
- 4px 기반: `--space-1`(4) … `--space-20`(80), SCSS `sp(n)` 헬퍼
- 모바일 좌우 여백 `--page-gutter: 24px` (태블릿 이상 40px)
- 브레이크포인트: sm 480 / md 768 / lg 1024(사이드바 전환) / xl 1280
- 375px · 393px에서 가로 스크롤 없이 동작하도록 검증

## 컴포넌트 (src/components/ui)
Button / ButtonLink / IconButton · BookCover(생성형 표지) · ProgressBar / ProgressRing · StarRating(표시/입력) · StatusBadge / Badge · Skeleton / LoadingRegion · EmptyState / ErrorState · Tabs(WAI-ARIA) · Sheet(모바일 바텀시트/데스크톱 다이얼로그) · SearchField · SectionHeader · Avatar · Toast

### 상태 정의
- 버튼: default / hover(포인터 기기만) / active(scale .98) / focus-visible(plum 링) / disabled(45%) / loading(스피너 + aria-busy)
- 입력: default / focus(primary 테두리 + 4px 헤일로) / invalid(clay 테두리 + 안내 문구)
- 터치 타깃: 주요 버튼·아이콘 버튼 44px 이상

## 접근성
- 본문 바로가기 링크, 랜드마크(nav/main/aside), 섹션 `aria-labelledby`
- 진행률은 `role="progressbar"` + 값, 별점은 라디오 그룹(0.5 단위)
- 시트는 네이티브 `<dialog>`(포커스 트랩, ESC)
- `prefers-reduced-motion`이면 모션 시간 0

## 책 표지
도서 API 연결 전까지 **제목·저자로 만든 타이포그래피 표지**를 사용합니다 (톤 8종 × 레이아웃 3종, 책 id로 결정). `coverUrl`이 생기면 이미지가 우선이며, 로드 실패 시 다시 생성형 표지로 대체됩니다.
