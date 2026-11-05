import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { Book } from '@/types/book';
import { ratingSummary } from '@/store/selectors';
import { paths } from '@/routes/paths';
import { BookCover, RatingValue } from '@/components/ui';
import styles from './BookRow.module.scss';

interface BookRowProps {
  book: Book;
  rank?: number;
  change?: number | null;
  aside?: ReactNode;
}

/** 차트·검색·리스트용 한 줄: (순위) 표지 · 제목 · 저자 · 평균 별점 */
export function BookRow({ book, rank, change, aside }: BookRowProps) {
  const summary = ratingSummary(book.id);
  return (
    <div className={styles.row}>
      <Link to={paths.book(book.id)} className={styles.link}>
        {rank !== undefined && (
          <span className={styles.rankCol}>
            <span className={styles.rank}>{rank}</span>
            {change !== undefined && <Change value={change} />}
          </span>
        )}
        <BookCover book={book} size="sm" />
        <span className={styles.text}>
          <strong>{book.title}</strong>
          <span className={styles.author}>{book.authors.join(', ')}</span>
          {summary.count > 0 && <RatingValue value={summary.average} count={summary.count} />}
        </span>
      </Link>
      {aside && <div className={styles.aside}>{aside}</div>}
    </div>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className={styles.new}>NEW</span>;
  if (value === 0) return <Minus className={styles.same} aria-label="순위 변동 없음" />;
  return value > 0 ? (
    <span className={styles.up} aria-label={`${value}계단 상승`}>
      <ArrowUp aria-hidden />
      {value}
    </span>
  ) : (
    <span className={styles.down} aria-label={`${-value}계단 하락`}>
      <ArrowDown aria-hidden />
      {-value}
    </span>
  );
}
