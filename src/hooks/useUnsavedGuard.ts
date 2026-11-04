import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

/**
 * 작성 중인 내용이 있을 때 이탈을 막습니다.
 * - 앱 내 이동: router blocker → 확인 시트
 * - 새로고침/탭 닫기: beforeunload
 * 저장 직후 이동할 때는 allow()를 먼저 호출하세요.
 */
export function useUnsavedGuard(dirty: boolean) {
  const allowed = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed.current && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowed.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const allow = useCallback(() => {
    allowed.current = true;
  }, []);

  return { blocker, allow };
}
