import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Book } from '@/types/book';
import { paths } from '@/routes/paths';
import { BookCover } from '@/components/ui';
import styles from './BookListItem.module.scss';

interface BookListItemProps {
  book: Book;
  /** 제목 아래 추가 정보 (진행률, 별점 등) */
  meta?: ReactNode;
  /** 오른쪽 액션 (링크 바깥에 렌더링되어 독립적으로 클릭 가능) */
  action?: ReactNode;
}

export function BookListItem({ book, meta, action }: BookListItemProps) {
  const year = book.publishedAt.slice(0, 4);
  return (
    <div className={styles.item}>
      <Link to={paths.book(book.id)} className={styles.link}>
        <BookCover book={book} size="sm" />
        <div className={styles.body}>
          <p className={styles.title}>{book.title}</p>
          <p className={styles.sub}>
            {book.authors.join(', ')}
            <span aria-hidden> · </span>
            {book.publisher}
            <span aria-hidden> · </span>
            {year}
          </p>
          {meta && <div className={styles.meta}>{meta}</div>}
        </div>
      </Link>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
