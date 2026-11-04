import { Link } from 'react-router';
import type { ShelfItem } from '@/store/selectors';
import { progressOf } from '@/store/selectors';
import { paths } from '@/routes/paths';
import { BookCover, ProgressBar, StarRating, StatusBadge } from '@/components/ui';
import styles from './BookGridItem.module.scss';

export function BookGridItem({ item, showStatus }: { item: ShelfItem; showStatus?: boolean }) {
  const { book, entry } = item;
  const pct = Math.round(progressOf(item) * 100);
  return (
    <Link to={paths.book(book.id)} className={styles.item}>
      <div className={styles.coverWrap}>
        <BookCover book={book} size="fluid" />
        {showStatus && <StatusBadge status={entry.status} className={styles.badge} />}
      </div>
      <p className={styles.title}>{book.title}</p>
      <p className={styles.author}>{book.authors.join(', ')}</p>
      {entry.status === 'reading' && (
        <div className={styles.progress}>
          <ProgressBar value={pct / 100} size="sm" label={`${book.title} 진행률`} />
          <span>{pct}%</span>
        </div>
      )}
      {entry.status === 'done' && entry.rating ? <StarRating value={entry.rating} className={styles.rating} /> : null}
    </Link>
  );
}
