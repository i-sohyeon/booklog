import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import styles from './Skeleton.module.scss';

interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
  variant?: 'block' | 'text' | 'cover';
}

export function Skeleton({ width, height, radius, className, variant = 'block' }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(styles.skeleton, styles[variant], className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/** 로딩 영역을 감싸 스크린리더에 상태를 알림 */
export function LoadingRegion({ label = '불러오는 중', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
