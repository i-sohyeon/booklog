import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatches } from 'react-router';
import { LogIn, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fabFor, isNavActive, mainNav } from '@/routes/navigation';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { paths } from '@/routes/paths';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, Button, ToastViewport } from '@/components/ui';
import { FloatingAction, RecordSheet, useRecord } from '@/components/record';
import { Logo } from './Logo';
import { SampleDataBadge } from './SampleDataBadge';
import { useCloudStore } from '@/store/cloudStore';
import { useAuthGate } from '@/store/loginGate';
import { LoginPromptSheet } from '@/components/auth/LoginPrompt';
import styles from './AppLayout.module.scss';

export interface RouteHandle {
  /** 모바일 상단 앱 헤더 숨김 (자체 헤더를 쓰는 화면) */
  hideMobileHeader?: boolean;
  /** 하단 탭·기록 버튼 숨김 (작성 화면) */
  hideBottomNav?: boolean;
}

export function AppLayout() {
  const matches = useMatches();
  const handles = matches.map((m) => m.handle as RouteHandle | undefined);
  const hideMobileHeader = handles.some((h) => h?.hideMobileHeader);
  const hideBottomNav = handles.some((h) => h?.hideBottomNav);
  const { pathname } = useLocation();
  const fabHidden = useHideOnScroll(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    // 친구의 새 글·후기 반영 (로그인 중일 때만, 15초에 한 번까지)
    useCloudStore.getState().refreshSoon();
  }, [pathname]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && useCloudStore.getState().refreshSoon();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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
            <NavLink to={paths.discover} aria-label="책 검색" className={styles.headerIcon}>
              <Search aria-hidden />
            </NavLink>
          </div>
        </header>
      )}

      <main id="main" className={cn(styles.main, hideBottomNav && styles.noNav)} tabIndex={-1}>
        <Outlet />
      </main>

      {!hideBottomNav && (
        <>
          <BottomNav />
          <FloatingAction kind={fabFor(pathname)} hidden={fabHidden} />
        </>
      )}
      <RecordSheet />
      <LoginPromptSheet />
      <ToastViewport />
    </div>
  );
}

function Sidebar() {
  const profile = useProfile();
  const { pathname } = useLocation();
  const start = useRecord((s) => s.start);
  const gate = useAuthGate();
  return (
    <aside className={styles.sidebar} aria-label="주 메뉴">
      <div className={styles.sideTop}>
        <Logo />
      </div>
      <nav className={styles.sideNav}>
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={cn(styles.sideLink, isNavActive(item, pathname) && styles.active)} aria-current={isNavActive(item, pathname) ? 'page' : undefined}>
              <Icon aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <Button className={styles.sideRecord} leadingIcon={<Plus aria-hidden />} onClick={() => start()}>
        책 기록하기
      </Button>
      <div className={styles.sideBottom}>
        <SampleDataBadge />
        {gate === 'guest' ? (
          <Link to={paths.login} state={{ from: pathname }} className={styles.sideLink}>
            <LogIn aria-hidden />
            <span>로그인</span>
          </Link>
        ) : gate === 'member' ? (
          <NavLink to={paths.me} className={({ isActive }) => cn(styles.profile, isActive && styles.active)}>
            <Avatar name={profile.nickname} size="sm" />
            <span className={styles.profileText}>
              <strong>{profile.nickname}</strong>
              <span>{profile.source === 'account' ? profile.handle : profile.source === 'sample' ? '샘플 사용자' : '이 기기에 저장'}</span>
            </span>
          </NavLink>
        ) : null}
      </div>
    </aside>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className={styles.bottomNav} aria-label="주 메뉴">
      {mainNav.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} className={cn(styles.tab, isNavActive(item, pathname) && styles.active)} aria-current={isNavActive(item, pathname) ? 'page' : undefined}>
            <Icon aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
