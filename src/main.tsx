import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from '@/routes/router';
import { useAuthStore } from '@/store/authStore';
import { useCloudStore } from '@/store/cloudStore';
import { onSyncStatus, resetAfterSignOut, startLibrarySync, stopLibrarySync } from '@/services/librarySync';
import { useToast } from '@/components/ui';
import '@/styles/global.scss';

// Supabase 세션 복원 및 구독 (설정이 없으면 아무 일도 하지 않음)
useAuthStore.getState().init();

onSyncStatus((status) => {
  if (status === 'error') useToast.getState().show('서재를 계정에 저장하지 못했어요. 설정에서 상태를 확인해 주세요.');
});

// 로그인하면 서재 자동 저장 + 친구·게시판 데이터 불러오기, 로그아웃하면 끔
useAuthStore.subscribe((s, prev) => {
  const id = s.user?.id ?? null;
  if (id === (prev.user?.id ?? null) && s.status === prev.status) return;
  if (s.status === 'signedIn' && id) {
    void startLibrarySync(id);
    void useCloudStore.getState().start(id);
  } else if (s.status === 'signedOut') {
    stopLibrarySync();
    useCloudStore.getState().clear();
    resetAfterSignOut();
  }
});

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
