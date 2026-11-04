import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { AppLayout, type RouteHandle } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/home/HomePage';
import { LibraryPage } from '@/pages/library/LibraryPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { BookDetailPage } from '@/pages/book/BookDetailPage';
import { MyPage } from '@/pages/me/MyPage';
import { NotFoundPage } from '@/pages/misc/NotFoundPage';
import { ClubsPage, FeedPage, FriendProfilePage } from '@/pages/misc/upcoming';
import { paths } from './paths';

/** 1차 경로 호환: /books/:id/record → 새 메모 작성 */
function RecordRedirect() {
  const { bookId = '' } = useParams();
  return <Navigate to={paths.noteNew(bookId)} replace />;
}

// 2차 화면은 필요할 때 불러오기 (초기 번들 축소)
const noteEditor = () => import('@/pages/record/NoteEditorPage').then((m) => ({ Component: m.NoteEditorPage }));
const reviewEditor = () => import('@/pages/record/ReviewEditorPage').then((m) => ({ Component: m.ReviewEditorPage }));
const notes = () => import('@/pages/notes/NotesPage').then((m) => ({ Component: m.NotesPage }));
const stats = () => import('@/pages/stats/StatsPage').then((m) => ({ Component: m.StatsPage }));
const login = () => import('@/pages/auth/LoginPage').then((m) => ({ Component: m.LoginPage }));
const signup = () => import('@/pages/auth/SignupPage').then((m) => ({ Component: m.SignupPage }));
const resetPassword = () => import('@/pages/auth/ResetPasswordPage').then((m) => ({ Component: m.ResetPasswordPage }));
const updatePassword = () => import('@/pages/auth/UpdatePasswordPage').then((m) => ({ Component: m.UpdatePasswordPage }));

const detailHandle: RouteHandle = { hideMobileHeader: true };
const editorHandle: RouteHandle = { hideMobileHeader: true, hideBottomNav: true };

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'books/:bookId', element: <BookDetailPage />, handle: detailHandle },
      { path: 'books/:bookId/record', element: <RecordRedirect /> },
      { path: 'books/:bookId/notes/new', lazy: noteEditor, handle: editorHandle },
      { path: 'books/:bookId/notes/:noteId', lazy: noteEditor, handle: editorHandle },
      { path: 'books/:bookId/review', lazy: reviewEditor, handle: editorHandle },
      { path: 'notes', lazy: notes },
      { path: 'stats', lazy: stats },
      { path: 'feed', element: <FeedPage /> },
      { path: 'users/:handle', element: <FriendProfilePage /> },
      { path: 'clubs', element: <ClubsPage /> },
      { path: 'clubs/:clubId', element: <ClubsPage /> },
      { path: 'me', element: <MyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'login', lazy: login },
  { path: 'signup', lazy: signup },
  { path: 'reset-password', lazy: resetPassword },
  { path: 'account/password', lazy: updatePassword },
]);
