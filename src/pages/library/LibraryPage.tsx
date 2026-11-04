import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { READING_STATUS_LABEL, READING_STATUS_ORDER, type ReadingStatus } from '@/types/book';
import { useShelf } from '@/hooks/useShelf';
import { countByStatus, progressOf, type ShelfItem } from '@/store/selectors';
import { formatDate } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { ButtonLink, EmptyState, IconButton, ProgressBar, StarRating, StatusBadge, Tabs, type TabItem } from '@/components/ui';
import { BookGridItem, BookListItem } from '@/components/book';
import styles from './LibraryPage.module.scss';

type Filter = ReadingStatus | 'all';
type View = 'grid' | 'list';
type Sort = 'recent' | 'title' | 'rating';

const SORT_LABEL: Record<Sort, string> = { recent: '최근 활동순', title: '제목순', rating: '별점순' };

const EMPTY_COPY: Record<Filter, { title: string; desc: string }> = {
  all: { title: '서재가 비어 있어요', desc: '읽고 있거나 읽고 싶은 책을 검색해서 담아보세요.' },
  reading: { title: '읽고 있는 책이 없어요', desc: '새로운 책을 시작해 볼까요?' },
  want: { title: '읽고 싶은 책이 없어요', desc: '마음에 드는 책을 발견하면 담아두세요.' },
  done: { title: '아직 완독한 책이 없어요', desc: '첫 완독의 기쁨이 곧 찾아올 거예요.' },
  paused: { title: '중단한 책이 없어요', desc: '모든 책을 끝까지 읽고 계시네요.' },
};

function isFilter(v: string | null): v is Filter {
  return v === 'all' || (v !== null && (READING_STATUS_ORDER as string[]).includes(v));
}

function sortItems(items: ShelfItem[], sort: Sort): ShelfItem[] {
  const copy = [...items];
  if (sort === 'title') return copy.sort((a, b) => a.book.title.localeCompare(b.book.title, 'ko'));
  if (sort === 'rating') return copy.sort((a, b) => (b.entry.rating ?? -1) - (a.entry.rating ?? -1));
  return copy.sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));
}

export function LibraryPage() {
  const shelf = useShelf();
  const [params, setParams] = useSearchParams();

  const rawStatus = params.get('status');
  const filter: Filter = isFilter(rawStatus) ? rawStatus : 'all';
  const view: View = params.get('view') === 'list' ? 'list' : 'grid';
  const rawSort = params.get('sort');
  const sort: Sort = rawSort === 'title' || rawSort === 'rating' ? rawSort : 'recent';

  const update = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(params);
    if (value === defaultValue) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => countByStatus(shelf), [shelf]);
  const items = useMemo(
    () => sortItems(filter === 'all' ? shelf : shelf.filter((i) => i.entry.status === filter), sort),
    [shelf, filter, sort],
  );

  const tabs: TabItem<Filter>[] = [
    { value: 'all', label: '전체', count: counts.all },
    ...READING_STATUS_ORDER.map((s) => ({ value: s, label: READING_STATUS_LABEL[s], count: counts[s] })),
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="My Library"
        title="내 서재"
        description={`${counts.all}권의 책 · 완독 ${counts.done}권`}
        actions={
          <ButtonLink to={paths.search} size="sm" variant="secondary" leadingIcon={<Plus aria-hidden />}>
            책 담기
          </ButtonLink>
        }
      />

      <div className={styles.toolbar}>
        <Tabs label="독서 상태" items={tabs} value={filter} onChange={(v) => update('status', v, 'all')} controls="library-panel" />
        <div className={styles.controls}>
          <label className={styles.sort}>
            <span className="sr-only">정렬</span>
            <select value={sort} onChange={(e) => update('sort', e.target.value, 'recent')}>
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.viewToggle} role="group" aria-label="보기 방식">
            <IconButton label="격자로 보기" size="sm" aria-pressed={view === 'grid'} onClick={() => update('view', 'grid', 'grid')}>
              <LayoutGrid />
            </IconButton>
            <IconButton label="목록으로 보기" size="sm" aria-pressed={view === 'list'} onClick={() => update('view', 'list', 'grid')}>
              <List />
            </IconButton>
          </div>
        </div>
      </div>

      <div id="library-panel" role="tabpanel" aria-label={tabs.find((t) => t.value === filter)?.label} className={styles.panel}>
        {items.length === 0 ? (
          <EmptyState
            title={EMPTY_COPY[filter].title}
            description={EMPTY_COPY[filter].desc}
            action={
              <ButtonLink to={paths.search} size="md">
                책 검색하기
              </ButtonLink>
            }
          />
        ) : view === 'grid' ? (
          <ul role="list" className={styles.grid}>
            {items.map((item) => (
              <li key={item.book.id}>
                <BookGridItem item={item} showStatus={filter === 'all'} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <BookListItem key={item.book.id} book={item.book} meta={<ListMeta item={item} showStatus={filter === 'all'} />} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

function ListMeta({ item, showStatus }: { item: ShelfItem; showStatus: boolean }) {
  const { entry, book } = item;
  const pct = Math.round(progressOf(item) * 100);
  return (
    <>
      {showStatus && <StatusBadge status={entry.status} />}
      {(entry.status === 'reading' || entry.status === 'paused') && (
        <span className={styles.listProgress}>
          <ProgressBar value={pct / 100} size="sm" label={`${book.title} 진행률`} />
          <span>{pct}%</span>
        </span>
      )}
      {entry.status === 'done' && (
        <>
          <StarRating value={entry.rating} />
          {entry.finishedAt && <span className={styles.date}>{formatDate(entry.finishedAt)} 완독</span>}
        </>
      )}
      {entry.status === 'want' && <span className={styles.date}>{formatDate(entry.addedAt)} 담음</span>}
    </>
  );
}
