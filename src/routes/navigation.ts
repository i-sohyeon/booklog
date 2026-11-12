import { Compass, Home, Library, MessagesSquare, UserRound, type LucideIcon } from 'lucide-react';
import { paths } from './paths';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** 이 경로들로 시작하면 활성 탭으로 표시 (상세 화면 포함) */
  match: string[];
}

/** 하단 탭 / 사이드바 공통: 홈 · 발견 · 커뮤니티 · 서재 · 마이 */
export const mainNav: NavItem[] = [
  { to: paths.home, label: '홈', icon: Home, match: [] },
  { to: paths.discover, label: '발견', icon: Compass, match: ['/discover', '/books', '/lists'] },
  { to: paths.community, label: '커뮤니티', icon: MessagesSquare, match: ['/community', '/clubs'] },
  { to: paths.library, label: '서재', icon: Library, match: ['/library'] },
  { to: paths.me, label: '마이', icon: UserRound, match: ['/me', '/u'] },
];

export function isNavActive(item: NavItem, pathname: string) {
  if (item.to === paths.home) return pathname === '/';
  return item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** 플로팅 버튼 종류 — 탭 첫 화면에서만 노출 */
export type FabKind = 'record' | 'write' | 'none';

export function fabFor(pathname: string): FabKind {
  if (pathname === '/' || pathname === paths.discover || pathname === paths.library) return 'record';
  if (pathname === paths.community) return 'write';
  return 'none';
}
