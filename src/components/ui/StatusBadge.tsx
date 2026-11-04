import type { ReactNode } from 'react';
import { READING_STATUS_LABEL, type ReadingStatus } from '@/types/book';
import { cn } from '@/lib/cn';
import styles from './StatusBadge.module.scss';

export function StatusBadge({ status, className }: { status: ReadingStatus; className?: string }) {
  return <span className={cn(styles.badge, styles[status], className)}>{READING_STATUS_LABEL[status]}</span>;
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'outline'; className?: string }) {
  return <span className={cn(styles.badge, styles[tone], className)}>{children}</span>;
}
