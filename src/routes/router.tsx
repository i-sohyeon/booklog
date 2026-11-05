import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout, type RouteHandle } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/home/HomePage';
import { DiscoverPage } from '@/pages/discover/DiscoverPage';
import { BookDetailPage } from '@/pages/book/BookDetailPage';
import { CommunityPage } from '@/pages/community/CommunityPage';
import { MyPage } from '@/pages/me/MyPage';
import { LibraryPage } from '@/pages/library/LibraryPage';
import { NotFoundPage } from '@/pages/misc/NotFoundPage';
import { paths } from './paths';

// 진입 빈도가 낮은 화면은 필요할 때 불러오기
const lazy = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) => () =>
  load().then((m) => ({ Component: m[name] as ComponentType }));

const detailHandle: RouteHandle = { hideMobileHeader: true };
const editorHandle: RouteHandle = { hideMobileHeader: true, hideBottomNav: true };

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'books/:bookId', element: <BookDetailPage />, handle: detailHandle },
      { path: 'lists/:listId', lazy: lazy(() => import('@/pages/list/ListDetailPage'), 'ListDetailPage') },
      { path: 'community', element: <CommunityPage /> },
      { path: 'community/new', lazy: lazy(() => import('@/pages/community/PostNewPage'), 'PostNewPage'), handle: editorHandle },
      { path: 'community/:postId', lazy: lazy(() => import('@/pages/community/PostDetailPage'), 'PostDetailPage') },
      { path: 'clubs', element: <Navigate to={paths.clubs} replace /> },
      { path: 'clubs/new', lazy: lazy(() => import('@/pages/clubs/ClubNewPage'), 'ClubNewPage'), handle: editorHandle },
      { path: 'clubs/:clubId', lazy: lazy(() => import('@/pages/clubs/ClubDetailPage'), 'ClubDetailPage') },
      { path: 'library', element: <LibraryPage /> },
      { path: 'library/quotes', lazy: lazy(() => import('@/pages/library/QuotesPage'), 'QuotesPage') },
      { path: 'library/:bookId/edit', lazy: lazy(() => import('@/pages/library/RecordEditPage'), 'RecordEditPage'), handle: editorHandle },
      { path: 'me', element: <MyPage /> },
      { path: 'me/settings', lazy: lazy(() => import('@/pages/me/SettingsPage'), 'SettingsPage') },
      // 이전 주소 호환
      { path: 'search', element: <Navigate to={paths.discover} replace /> },
      { path: 'stats', element: <Navigate to={paths.library} replace /> },
      { path: 'notes', element: <Navigate to={paths.quotes} replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'login', lazy: lazy(() => import('@/pages/auth/LoginPage'), 'LoginPage') },
  { path: 'signup', lazy: lazy(() => import('@/pages/auth/SignupPage'), 'SignupPage') },
  { path: 'reset-password', lazy: lazy(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage') },
  { path: 'account/password', lazy: lazy(() => import('@/pages/auth/UpdatePasswordPage'), 'UpdatePasswordPage') },
]);
