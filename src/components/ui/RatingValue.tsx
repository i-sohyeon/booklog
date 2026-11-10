import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './RatingValue.module.scss';

/** "★ 4.3" — 평균 별점 등 숫자 한 개를 조용히 표시 */
export function RatingValue({ value, count, size = 'sm', className }: { value: number; count?: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn(styles.root, styles[size], className)} aria-label={`평균 별점 ${value.toFixed(1)}${count ? `, ${count.toLocaleString()}명 참여` : ''}`}>
      <Star aria-hidden />
      <strong>{value.toFixed(1)}</strong>
      {count !== undefined && <span className={styles.count}>({count.toLocaleString()})</span>}
    </span>
  );
}
