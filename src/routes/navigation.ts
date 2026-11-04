import { BarChart3, Compass, Home, Library, Search, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { paths } from './paths';

export interface NavItem {
  to: string;
  label: string;
  /** 하단 내비게이션용 짧은 라벨 */
  shortLabel?: string;
  icon: LucideIcon;
  /** 1차 개발 범위 밖 — "준비 중" 표시 */
  upcoming?: boolean;
}

/** 데스크톱 사이드바: 전체 메뉴 */
export const primaryNav: NavItem[] = [
  { to: paths.home, label: '홈', icon: Home },
  { to: paths.library, label: '내 서재', shortLabel: '서재', icon: Library },
  { to: paths.search, label: '도서 검색', shortLabel: '검색', icon: Search },
  { to: paths.stats, label: '독서 통계', shortLabel: '통계', icon: BarChart3 },
];

export const socialNav: NavItem[] = [
  { to: paths.feed, label: '친구 피드', shortLabel: '피드', icon: Compass, upcoming: true },
  { to: paths.clubs, label: '독서 모임', shortLabel: '모임', icon: UsersRound, upcoming: true },
];

/** 모바일 하단 내비게이션: 핵심 5개 */
export const bottomNav: NavItem[] = [
  { to: paths.home, label: '홈', icon: Home },
  { to: paths.library, label: '서재', icon: Library },
  { to: paths.search, label: '검색', icon: Search },
  { to: paths.feed, label: '피드', icon: Compass, upcoming: true },
  { to: paths.me, label: '마이', icon: UserRound },
];
