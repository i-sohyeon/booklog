import { ComingSoonPage } from './ComingSoonPage';

/** 정보 구조(docs/IA.md)에 정의된 화면별 기능 — 2차 이후 구현 */
export const StatsPage = () => (
  <ComingSoonPage
    eyebrow="Statistics"
    title="독서 통계"
    phase="2차"
    summary="나의 독서 흐름을 한눈에 돌아보는 공간"
    features={['일간 · 월간 · 연간 독서량', '연간 독서 캘린더', '장르별 독서 비율', '독서 목표 달성 추이', '완독 도서 아카이브', '독서 활동 히스토리']}
  />
);

export const FeedPage = () => (
  <ComingSoonPage
    eyebrow="Friends"
    title="친구 피드"
    phase="3차"
    summary="친구들의 독서 활동을 함께 보는 피드"
    features={['친구의 완독 · 리뷰 · 문장 소식', '좋아요와 댓글', '친구 검색 및 초대', '공개 / 비공개 설정에 따른 노출']}
  />
);

export const FriendProfilePage = () => (
  <ComingSoonPage
    back
    eyebrow="Profile"
    title="친구 프로필"
    phase="3차"
    summary="친구의 서재를 방문하는 공간"
    features={['친구의 공개 서재', '친구의 독서 통계 요약', '친구의 리뷰 · 문장 모아보기', '팔로우 / 친구 관리']}
  />
);

export const ClubsPage = () => (
  <ComingSoonPage
    eyebrow="Book Club"
    title="독서 모임"
    phase="4차"
    summary="함께 읽고 이야기하는 독서 모임"
    features={['모임 생성 및 참여', '함께 읽을 책 선정 투표', '독서 토론 게시판', '공동 독서 목표', '모임별 독서 기록']}
  />
);
