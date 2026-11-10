import type { RatingSummary } from '@/types/social';
import { StarRating } from '@/components/ui';
import styles from './RatingDistribution.module.scss';

/** 평균 별점 + 0.5~5점 분포 (단일 색상 막대) */
export function RatingDistribution({ summary }: { summary: RatingSummary }) {
  const max = Math.max(...summary.distribution, 1);
  return (
    <div className={styles.wrap}>
      <div className={styles.avg}>
        <strong>{summary.average.toFixed(1)}</strong>
        <StarRating value={Math.round(summary.average * 2) / 2} size="md" />
        <span>{summary.count.toLocaleString()}명 평가</span>
      </div>
      <div className={styles.bars} role="img" aria-label={`별점 분포: ${summary.distribution.map((c, i) => `${(i + 1) / 2}점 ${c}명`).join(', ')}`}>
        {summary.distribution.map((c, i) => (
          <div key={i} className={styles.col}>
            <span className={styles.bar} style={{ height: `${Math.max((c / max) * 100, c > 0 ? 4 : 0)}%` }} />
            <span className={styles.label} aria-hidden>
              {i % 2 === 1 ? (i + 1) / 2 : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
