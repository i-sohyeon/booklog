import { useState, type ReactNode } from 'react';
import { EyeOff } from 'lucide-react';
import styles from './Spoiler.module.scss';

/** 스포일러 가리기 — 누르기 전까지 흐리게 */
export function Spoiler({ active, children }: { active?: boolean; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  if (!active || revealed) return <>{children}</>;
  return (
    <div className={styles.wrap}>
      <div className={styles.blur} aria-hidden>
        {children}
      </div>
      <button
        type="button"
        className={styles.reveal}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRevealed(true);
        }}
      >
        <EyeOff aria-hidden />
        스포일러가 있어요 · 눌러서 보기
      </button>
    </div>
  );
}
