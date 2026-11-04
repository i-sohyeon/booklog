import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useMatches } from 'react-router';
import { cn } from '@/lib/cn';
import { bottomNav, primaryNav, socialNav, type NavItem } from '@/routes/navigation';
import { paths } from '@/routes/paths';
import { useLibraryStore } from '@/store/libraryStore';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, ToastViewport } from '@/components/ui';
import { Logo } from './Logo';
import { SampleDataBadge } from './SampleDataBadge';
import styles from './AppLayout.module.scss';

export interface RouteHandle {
  /** 모바일 상단 앱 헤더 숨김 (자체 뒤로가기 헤더를 쓰는 화면) */
  hideMobileHeader?: boolean;
  /** 전체 화면 작성 모드 — 하단 탭 숨김 */
  hideBottomNav?: boolean;
}

export function AppLayout() {
  const matches = useMatches();
  const handles = matches.map((m) => m.handle as RouteHandle | undefined);
  const hideMobileHeader = handles.some((h) => h?.hideMobileHeader);
  const hideBottomNav = handles.some((h) => h?.hideBottomNav);
  const { pathname } = useLocation();
  const profile = useProfile();

  // 화면 전환 시 스크롤 최상단
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        본문으로 바로가기
      </a>

      <Sidebar />

      {!hideMobileHeader && (
        <header className={styles.mobileHeader}>
          <Logo />
          <div className={styles.headerActions}>
            <SampleDataBadge />
            <NavLink to={paths.me} aria-label="마이페이지" className={styles.headerAvatar}>
              <Avatar name={profile.nickname} size="sm" />
            </NavLink>
          </div>
        </header>
      )}

      <main id="main" className={cn(styles.main, hideBottomNav && styles.noNav)} tabIndex={-1}>
        <Outlet />
      </main>

      {!hideBottomNav && <BottomNav />}
      <ToastViewport />
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === paths.home} className={({ isActive }) => cn(styles.sideLink, isActive && styles.active)}>
      <Icon aria-hidden />
      <span>{item.label}</span>
      {item.upcoming && <span className={styles.soon}>준비 중</span>}
    </NavLink>
  );
}

function Sidebar() {
  const goal = useLibraryStore((s) => s.goal);
  const profile = useProfile();
  return (
    <aside className={styles.sidebar} aria-label="주 메뉴">
      <div className={styles.sideTop}>
        <Logo />
      </div>
      <nav className={styles.sideNav}>
        <p className={styles.sideGroup}>나의 독서</p>
        {primaryNav.map((item) => (
          <SideLink key={item.to} item={item} />
        ))}
        <p className={styles.sideGroup}>함께 읽기</p>
        {socialNav.map((item) => (
          <SideLink key={item.to} item={item} />
        ))}
      </nav>
      <div className={styles.sideBottom}>
        <SampleDataBadge />
        <NavLink to={paths.me} className={({ isActive }) => cn(styles.profile, isActive && styles.active)}>
          <Avatar name={profile.nickname} size="sm" />
          <span className={styles.profileText}>
            <strong>{profile.nickname}</strong>
            <span>{goal.year} 목표 {goal.targetBooks}권</span>
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

function BottomNav() {
  return (
    <nav className={styles.bottomNav} aria-label="주 메뉴">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === paths.home}
            className={({ isActive }) => cn(styles.tab, isActive && styles.active)}
          >
            <Icon aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
