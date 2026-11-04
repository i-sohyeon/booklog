import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Clock, Plus, X } from 'lucide-react';
import type { Book, Genre } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useAsync } from '@/hooks/useAsync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { bookSearchService } from '@/services/bookSearch';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, EmptyState, ErrorState, LoadingRegion, SearchField, Skeleton, StatusBadge } from '@/components/ui';
import { AddToShelfSheet, BookListItem } from '@/components/book';
import styles from './SearchPage.module.scss';

const GENRES: Genre[] = ['소설', '에세이', '시', '인문', '과학', '역사', '경제경영', '자기계발', '예술'];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [input, setInput] = useState(urlQuery);
  const debounced = useDebouncedValue(input.trim(), 300);
  const recent = useRecentSearches();
  const [target, setTarget] = useState<Book | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL ← 입력값 동기화 (공유/뒤로가기 지원)
  useEffect(() => {
    if (debounced === urlQuery) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    setParams(next, { replace: true });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  // 뒤로가기 등으로 URL이 바뀌면 입력값 반영
  useEffect(() => {
    if (urlQuery !== input.trim()) setInput(urlQuery);
  }, [urlQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = urlQuery;
  const result = useAsync(query ? (signal) => bookSearchService.search(query, { signal }) : null, [query]);

  useEffect(() => {
    if (result.status === 'success' && result.data.total > 0) recent.add(query);
  }, [result.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const runQuery = (q: string) => {
    setInput(q);
    const next = new URLSearchParams(params);
    next.set('q', q);
    setParams(next, { replace: true });
    inputRef.current?.blur();
  };

  const isPending = input.trim() !== query; // 디바운스 대기 중

  return (
    <Page narrow>
      <PageHeader eyebrow="Discover" title="도서 검색" />

      <form
        role="search"
        className={styles.searchBar}
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) runQuery(input.trim());
        }}
      >
        <SearchField
          ref={inputRef}
          size="lg"
          label="도서 검색"
          placeholder="책 제목, 저자, 출판사로 검색"
          value={input}
          onValueChange={setInput}
        />
      </form>

      <p className={styles.notice}>
        <Badge tone="outline">샘플</Badge>
        현재는 샘플 도서 24권 안에서 검색돼요. 도서 검색 API는 다음 단계에서 연결됩니다.
      </p>

      {!query && !isPending ? (
        <IdleView recent={recent} onPick={runQuery} />
      ) : result.status === 'loading' || (isPending && input.trim() !== '') ? (
        <LoadingRegion label="검색 중">
          <div className={styles.results}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={styles.skelRow}>
                <Skeleton variant="cover" width={56} />
                <div className={styles.skelText}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
            ))}
          </div>
        </LoadingRegion>
      ) : result.status === 'error' ? (
        <ErrorState title="검색 중 문제가 생겼어요" onRetry={result.retry} />
      ) : result.status === 'success' && result.data.items.length === 0 ? (
        <EmptyState
          title={`‘${query}’ 검색 결과가 없어요`}
          description="철자를 확인하거나 저자 이름, 다른 키워드로 검색해 보세요."
        />
      ) : result.status === 'success' ? (
        <section aria-labelledby="result-title">
          <h2 id="result-title" className={styles.resultTitle} aria-live="polite">
            검색 결과 <strong>{result.data.total}</strong>권
          </h2>
          <div className={styles.results}>
            {result.data.items.map((book) => (
              <BookListItem
                key={book.id}
                book={book}
                meta={<Badge>{book.genre}</Badge>}
                action={<ShelfAction book={book} onAdd={() => setTarget(book)} />}
              />
            ))}
          </div>
        </section>
      ) : null}

      <AddToShelfSheet book={target} onClose={() => setTarget(null)} />
    </Page>
  );
}

function ShelfAction({ book, onAdd }: { book: Book; onAdd: () => void }) {
  const entry = useLibraryStore((s) => s.entries[book.id]);
  if (entry) return <StatusBadge status={entry.status} />;
  return (
    <Button size="sm" variant="secondary" leadingIcon={<Plus aria-hidden />} onClick={onAdd} aria-label={`「${book.title}」 서재에 담기`}>
      담기
    </Button>
  );
}

function IdleView({ recent, onPick }: { recent: ReturnType<typeof useRecentSearches>; onPick: (q: string) => void }) {
  const keywords = useAsync(() => bookSearchService.popularKeywords(), []);

  return (
    <div className={styles.idle}>
      {recent.items.length > 0 && (
        <section aria-labelledby="recent-title">
          <div className={styles.idleHead}>
            <h2 id="recent-title">최근 검색어</h2>
            <button type="button" className={styles.textBtn} onClick={recent.clear}>
              모두 지우기
            </button>
          </div>
          <ul role="list" className={styles.recentList}>
            {recent.items.map((q) => (
              <li key={q} className={styles.recentItem}>
                <button type="button" className={styles.recentBtn} onClick={() => onPick(q)}>
                  <Clock aria-hidden />
                  {q}
                </button>
                <button type="button" className={styles.recentRemove} aria-label={`최근 검색어 ${q} 삭제`} onClick={() => recent.remove(q)}>
                  <X aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="popular-title">
        <div className={styles.idleHead}>
          <h2 id="popular-title">추천 검색어</h2>
        </div>
        <div className={styles.chips}>
          {keywords.status === 'success' &&
            keywords.data.map((k, i) => (
              <button key={k} type="button" className={styles.chip} onClick={() => onPick(k)}>
                <span className={styles.rank}>{i + 1}</span>
                {k}
              </button>
            ))}
        </div>
      </section>

      <section aria-labelledby="genre-title">
        <div className={styles.idleHead}>
          <h2 id="genre-title">장르로 찾기</h2>
        </div>
        <div className={styles.genres}>
          {GENRES.map((g) => (
            <button key={g} type="button" className={styles.genre} onClick={() => onPick(g)}>
              {g}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
