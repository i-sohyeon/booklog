import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from '@/routes/router';
import { useAuthStore } from '@/store/authStore';
import '@/styles/global.scss';

// Supabase 세션 복원 및 구독 (설정이 없으면 아무 일도 하지 않음)
useAuthStore.getState().init();

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
