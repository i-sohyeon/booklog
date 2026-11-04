import type { ReactNode } from 'react';
import { CloudOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import styles from './StateView.module.scss';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** 일러스트 대신 쓰이는 아이콘/표지 장식 */
  visual?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, description, visual, action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.state, compact && styles.compact, className)}>
      {visual ?? <ShelfIllustration />}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = '불러오지 못했어요',
  description = '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <div className={cn(styles.state, compact && styles.compact)} role="alert">
      <span className={styles.iconWrap}>
        <CloudOff aria-hidden />
      </span>
      <p className={styles.title}>{title}</p>
      <p className={styles.desc}>{description}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}

/** 빈 책장 일러스트 — 기울어진 책 세 권 */
function ShelfIllustration() {
  return (
    <svg className={styles.illust} width="120" height="80" viewBox="0 0 120 80" aria-hidden>
      <rect x="18" y="74" width="84" height="3" rx="1.5" fill="var(--paper-300)" />
      <rect x="32" y="26" width="14" height="48" rx="2" fill="var(--plum-200)" />
      <rect x="48" y="16" width="16" height="58" rx="2" fill="var(--plum-400)" />
      <rect x="35" y="34" width="8" height="2" rx="1" fill="var(--paper-50)" opacity=".8" />
      <rect x="52" y="24" width="8" height="2" rx="1" fill="var(--paper-50)" opacity=".8" />
      <g transform="rotate(14 74 74)">
        <rect x="68" y="30" width="13" height="44" rx="2" fill="var(--ochre-400)" />
      </g>
      <circle cx="92" cy="20" r="3" fill="var(--ochre-400)" opacity=".5" />
      <circle cx="22" cy="40" r="2" fill="var(--plum-300)" opacity=".6" />
    </svg>
  );
}
