import { Link } from 'react-router';
import type { Book } from '@/types/book';
import { ratingSummary } from '@/store/selectors';
import { paths } from '@/routes/paths';
import { BookCover, RatingValue } from '@/components/ui';
import { cn } from '@/lib/cn';
import { byline } from '@/lib/byline';
import styles from './BookTile.module.scss';

interface BookTileProps {
  book: Book;
  rank?: number;
  /** 표시할 별점 — 생략하면 샘플 평균 */
  rating?: number | null;
  caption?: string;
  className?: string;
}

/** 표지가 주인공인 책 카드: 큰 표지 + 제목 + 저자 + 평균 별점 */
export function BookTile({ book, rank, rating, caption, className }: BookTileProps) {
  const value = rating === undefined ? ratingSummary(book.id).average : rating;
  return (
    <Link to={paths.book(book.id)} className={cn(styles.tile, className)}>
      <div className={styles.coverWrap}>
        <BookCover book={book} size="fluid" />
        {rank !== undefined && <span className={styles.rank}>{rank}</span>}
      </div>
      <p className={styles.title}>{book.title}</p>
      <p className={styles.author}>{caption ?? byline(book)}</p>
      {value ? <RatingValue value={value} className={styles.rating} /> : null}
    </Link>
  );
}
