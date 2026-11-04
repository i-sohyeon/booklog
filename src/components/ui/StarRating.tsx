import { useId } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './StarRating.module.scss';

interface StarRatingProps {
  value?: number;
  size?: 'sm' | 'md' | 'lg';
  /** 지정하면 0.5 단위로 입력 가능한 라디오 그룹으로 동작 */
  onChange?: (value: number | undefined) => void;
  className?: string;
}

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function StarRating({ value = 0, size = 'sm', onChange, className }: StarRatingProps) {
  const name = useId();
  const stars = (
    <span className={styles.stars} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={styles.star}>
            <Star className={styles.empty} />
            <span className={styles.full} style={{ width: `${fill * 100}%` }}>
              <Star />
            </span>
          </span>
        );
      })}
    </span>
  );

  if (!onChange) {
    if (!value) return null;
    return (
      <span className={cn(styles.root, styles[size], className)} role="img" aria-label={`별점 5점 중 ${value}점`}>
        {stars}
      </span>
    );
  }

  return (
    <fieldset className={cn(styles.root, styles.input, styles[size], className)}>
      <legend className="sr-only">별점</legend>
      {stars}
      <span className={styles.hits}>
        {STEPS.map((step) => (
          <label key={step} className={styles.hit}>
            <input
              type="radio"
              name={name}
              value={step}
              checked={value === step}
              onChange={() => onChange(step)}
              onClick={() => value === step && onChange(undefined)}
              className="sr-only"
            />
            <span className="sr-only">{step}점</span>
          </label>
        ))}
      </span>
    </fieldset>
  );
}
