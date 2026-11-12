import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import type { BestsellerCategory } from '@/types/social';
import { SAMPLE_CATEGORIES } from '@/mocks/social';
import { useAsync } from '@/hooks/useAsync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLists, useReviews } from '@/hooks/useSocial';
import { bookSearchService, fetchBestsellers } from '@/services/bookSearch';
import { SourceCredit } from '@/components/book/SourceCredit';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, EmptyState, ErrorState, LoadingRegion, SearchField, SectionHeader, Skeleton, Tabs } from '@/components/ui';
import { BookRow } from '@/components/book/BookRow';
import { ListCard } from '@/components/social/ListCard';
import { ReviewCard } from '@/components/social/ReviewCard';
import { CreateListSheet } from '@/components/social/ListSheets';
import styles from './DiscoverPage.module.scss';

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const debounced = useDebouncedValue(input.trim(), 300);

  // 입력 → URL 동기화 (공유·뒤로가기 지원)
  useEffect(() => {
    if (debounced === q.trim()) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    setParams(next, { replace: true });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL → 입력 (헤더 검색 아이콘·뒤로가기)
  useEffect(() => {
    if (q.trim() !== input.trim()) setInput(q);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page>
      <PageHeader title="발견" description="모두에게 같은 이번 주 책 이야기" />
      <form
        role="search"
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <SearchField label="책 검색" placeholder="제목, 저자, 출판사로 검색" value={input} onValueChange={setInput} />
      </form>
      {q.trim() ? <SearchResults query={q.trim()} /> : <Browse />}
    </Page>
  );
}

function SearchResults({ query }: { query: string }) {
  const result = useAsync((signal) => bookSearchService.search(query, { signal }), [query]);
  if (result.status === 'loading' || result.status === 'idle')
    return (
      <LoadingRegion label="검색 중">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.skelRow}>
            <Skeleton variant="cover" width={56} />
            <div>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="30%" />
            </div>
          </div>
        ))}
      </LoadingRegion>
    );
  if (result.status === 'error') return <ErrorState onRetry={result.retry} />;
  if (result.data.items.length === 0)
    return (
      <EmptyState
        title={`‘${query}’ 검색 결과가 없어요`}
        description={result.data.isSample ? `도서 검색 서버에 연결되지 않아 샘플 도서 ${SAMPLE_CATALOG.length}권 안에서 찾았어요.` : '제목이나 저자 이름을 다르게 입력해 보세요.'}
      />
    );
  return (
    <section aria-label="검색 결과">
      <p className={styles.count} aria-live="polite">
        검색 결과 <strong>{result.data.total.toLocaleString()}</strong>권{result.data.total > result.data.items.length && ` 중 ${result.data.items.length}권`}
        {result.data.isSample && <Badge tone="outline">샘플</Badge>}
      </p>
      {result.data.items.map((b) => (
        <BookRow key={b.id} book={b} />
      ))}
      {!result.data.isSample && <SourceCredit />}
    </section>
  );
}

function Browse() {
  const [cat, setCat] = useState<BestsellerCategory>('종합');
  const lists = useLists();
  const [creating, setCreating] = useState(false);
  const chart = useAsync(() => fetchBestsellers(cat), [cat]);
  const reviews = useReviews();
  const hot = useMemo(() => reviews.filter((r) => !r.isMine).sort((a, b) => b.likeCount - a.likeCount).slice(0, 8), [reviews]);

  return (
    <>
      <section className={styles.section} aria-labelledby="chart-title">
        <SectionHeader
          id="chart-title"
          title="베스트셀러"
          description="이번 주 기준"
          aside={chart.status === 'success' && chart.data.isSample ? <Badge tone="outline">샘플</Badge> : undefined}
        />
        <Tabs<BestsellerCategory>
          label="카테고리"
          variant="pill"
          bleed
          value={cat}
          onChange={setCat}
          controls="chart-panel"
          items={SAMPLE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <div id="chart-panel" role="tabpanel" className={styles.chart}>
          {chart.status === 'success' ? (
            chart.data.rows.map((r) => <BookRow key={r.book.id} book={r.book} rank={r.rank} change={r.change} />)
          ) : chart.status === 'error' ? (
            <ErrorState onRetry={chart.retry} />
          ) : (
            <LoadingRegion label="베스트셀러 불러오는 중">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={styles.skelRow}>
                  <Skeleton variant="cover" width={56} />
                  <div>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="30%" />
                  </div>
                </div>
              ))}
            </LoadingRegion>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="hot-title">
        <SectionHeader id="hot-title" title="지금 화제인 후기" description="공감을 많이 받은 한 줄 평" aside={<Badge tone="outline">샘플</Badge>} />
        <ul role="list" className={styles.reviewRail}>
          {hot.map((r) => (
            <li key={r.id}>
              <ReviewCard review={r} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="lists-title">
        <SectionHeader
          id="lists-title"
          title="취향 리스트"
          description="사람들이 직접 모은 책들"
          aside={
            <Button size="sm" variant="ghost" leadingIcon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
              만들기
            </Button>
          }
        />
        <ul role="list" className={styles.lists}>
          {lists.map((l) => (
            <li key={l.id}>
              <ListCard list={l} />
            </li>
          ))}
        </ul>
      </section>
      <CreateListSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
