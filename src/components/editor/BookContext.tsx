import type { ReactNode } from 'react';
import type { Book } from '@/types/book';
import { BookCover } from '@/components/ui';
import styles from './BookContext.module.scss';

/** 작성 화면 상단: 어떤 책에 대한 기록인지 */
export function BookContext({ book, aside }: { book: Book; aside?: ReactNode }) {
  return (
    <div className={styles.ctx}>
      <BookCover book={book} size="xs" />
      <div className={styles.text}>
        <p className={styles.title}>{book.title}</p>
        <p className={styles.author}>{book.authors.join(', ')}</p>
      </div>
      {aside}
    </div>
  );
}
