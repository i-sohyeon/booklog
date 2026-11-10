import { useEffect, useState } from 'react';

/** 아래로 스크롤하면 true(숨김), 위로 올리면 false. 페이지 맨 위에서는 항상 보임 */
export function useHideOnScroll(resetKey?: unknown, threshold = 6) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (y < 64) setHidden(false);
        else if (delta > threshold) setHidden(true);
        else if (delta < -threshold) setHidden(false);
        if (Math.abs(delta) > threshold) last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [resetKey, threshold]);

  return hidden;
}
