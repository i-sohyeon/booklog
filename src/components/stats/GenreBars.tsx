import type { Genre } from '@/types/book';
import styles from './GenreBars.module.scss';

/** 장르별 완독 권수 — 가로 막대 (단일 색상, 라벨로 식별) */
export function GenreBars({ data }: { data: Array<{ genre: Genre; count: number }> }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul role="list" className={styles.list}>
      {data.map((d) => {
        const share = Math.round((d.count / total) * 100);
        return (
          <li key={d.genre} className={styles.row} aria-label={`${d.genre} ${d.count}권, ${share}%`}>
            <span className={styles.label} aria-hidden>
              {d.genre}
            </span>
            <span className={styles.track} aria-hidden>
              <span className={styles.bar} style={{ width: `${(d.count / max) * 100}%` }} />
            </span>
            <span className={styles.value} aria-hidden>
              {d.count}권 <em>{share}%</em>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
