import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import styles from './SampleNotice.module.scss';

/** 서버 연결 전 소셜 기능 안내 — 샘플 데이터임을 명확히 표시 */
export function SampleNotice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="note">
      <Info aria-hidden />
      <span>{children}</span>
    </p>
  );
}
