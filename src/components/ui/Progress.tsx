import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './Progress.module.scss';

interface ProgressBarProps {
  /** 0 ~ 1 */
  value: number;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'brand' | 'accent';
  className?: string;
}

export function ProgressBar({ value, label, size = 'md', tone = 'brand', className }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={cn(styles.bar, styles[size], styles[tone], className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}

export function ProgressRing({ value, size = 120, stroke = 10, label, children }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={styles.ring}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className={styles.indicator}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </svg>
      <div className={styles.ringContent}>{children}</div>
    </div>
  );
}
