import { Link } from 'react-router';
import { useLibraryStore } from '@/store/libraryStore';
import { useAsync } from '@/hooks/useAsync';
import { bookSearchService } from '@/services/bookSearch';
import { paths } from '@/routes/paths';
import { Badge, BookCover, ErrorState, LoadingRegion, SectionHeader, Skeleton } from '@/components/ui';
import styles from './Discover.module.scss';

export function Discover() {
  const entries = useLibraryStore((s) => s.entries);
  const ownedKey = Object.keys(entries).sort().join(',');
  const state = useAsync(() => bookSearchService.recommendations(ownedKey ? ownedKey.split(',') : [], 10), [ownedKey]);

  return (
    <section aria-labelledby="discover-title" className={styles.section}>
      <SectionHeader
        id="discover-title"
        title="이런 책은 어때요"
        description="아직 서재에 없는 책"
        aside={<Badge tone="outline">샘플 추천</Badge>}
      />

      {state.status === 'loading' && (
        <LoadingRegion label="추천 도서를 불러오는 중">
          <div className={styles.rail}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={styles.item}>
                <Skeleton variant="cover" />
                <Skeleton variant="text" width="80%" className={styles.skelTitle} />
                <Skeleton variant="text" width="50%" />
              </div>
            ))}
          </div>
        </LoadingRegion>
      )}

      {state.status === 'error' && <ErrorState compact title="추천 도서를 불러오지 못했어요" onRetry={state.retry} />}

      {state.status === 'success' &&
        (state.data.length === 0 ? (
          <p className={styles.none}>추천할 새 책이 없어요. 서재가 정말 풍성하네요!</p>
        ) : (
          <ul role="list" className={styles.rail}>
            {state.data.map((book) => (
              <li key={book.id} className={styles.item}>
                <Link to={paths.book(book.id)} className={styles.link}>
                  <BookCover book={book} size="fluid" className={styles.cover} />
                  <span className={styles.title}>{book.title}</span>
                  <span className={styles.author}>{book.authors.join(', ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
