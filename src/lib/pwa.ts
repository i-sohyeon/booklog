import { create } from 'zustand';

/**
 * 앱으로 쓰기 (PWA)
 * - 서비스 워커 등록 (배포본에서만)
 * - 안드로이드·PC 크롬의 "설치" 창(beforeinstallprompt)을 잡아 두었다가 버튼으로 띄움
 * - 아이폰은 설치 창을 띄울 수 없어 공유 → 홈 화면에 추가 방법을 안내
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios-safari' | 'ios-chrome' | 'ios-other' | 'android' | 'desktop';

export function detectPlatform(ua = navigator.userAgent): Platform {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) {
    if (/CriOS/.test(ua)) return 'ios-chrome';
    if (/FxiOS|EdgiOS|KAKAOTALK|NAVER|Instagram|FBAN|Line\//.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** 카카오톡·인스타 같은 앱 안 브라우저 (여기선 홈 화면에 추가가 안 됨) */
export const isInAppBrowser = (ua = navigator.userAgent) => /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//.test(ua);

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

interface InstallState {
  /** 설치 창을 바로 띄울 수 있음 (안드로이드·PC 크롬) */
  canPrompt: boolean;
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

let deferred: BeforeInstallPromptEvent | null = null;

export const useInstall = create<InstallState>()((set) => ({
  canPrompt: false,
  installed: typeof window !== 'undefined' && isStandalone(),
  promptInstall: async () => {
    if (!deferred) return 'unavailable';
    const e = deferred;
    deferred = null;
    set({ canPrompt: false });
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'accepted') set({ installed: true });
    return outcome;
  },
}));

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 브라우저 기본 안내 대신 우리 버튼으로
    deferred = e as BeforeInstallPromptEvent;
    useInstall.setState({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    useInstall.setState({ canPrompt: false, installed: true });
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* 지원하지 않거나 막힌 환경: 앱은 그대로 동작 */
      });
    });
  }
}
