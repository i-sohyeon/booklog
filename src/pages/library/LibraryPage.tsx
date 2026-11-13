import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Lock, Plus, Quote as QuoteIcon, Star } from 'lucide-react';
import type { ReadingStatus } from '@/types/book';
import { READING_STATUS_LABEL } from '@/types/book';
import type { ShelfItem } from '@/store/selectors';
import { finishedBooks, readingProfile } from '@/store/selectors';
import { useShelf } from '@/hooks/useShelf';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { BookCover, Button, ButtonLink, EmptyState, StarRating, Tabs } from '@/components/ui';
import { useRecord } from '@/components/record';
import { BookSpine, SPINE_MAX_HEIGHT } from '@/components/book/BookSpine';
import { byline } from '@/lib/byline';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { Library as LibraryIcon } from 'lucide-react';
import styles from './LibraryPage.module.scss';

type View = 'calendar' | 'list' | 'shelf';
type RatingFilter = 'all' | '5' | '4.5' | '4' | 'low';

const RATING_FILTERS: Array<{ value: RatingFilter; label: string }> = [
  { value: 'all', label: '별점 전체' },
  { value: '5', label: '★ 5점' },
  { value: '4.5', label: '★ 4.5점 이상' },
  { value: '4', label: '★ 4점 이상' },
  { value: 'low', label: '★ 3.5점 이하' },
];

const VIEW_LABEL: Record<View, string> = { calendar: '캘린더', list: '리스트', shelf: '책꽂이' };

const STATUS_ORDER: ReadingStatus[] = ['done', 'reading', 'want'];

/** 서재 — 나만의 독서기록장 */
function LibraryPageInner() {
  const shelf = useShelf();
  const [params, setParams] = useSearchParams();
  const status = (STATUS_ORDER.includes(params.get('status') as ReadingStatus) ? params.get('status') : 'done') as ReadingStatus;
  const view: View = params.get('view') === 'list' ? 'list' : params.get('view') === 'shelf' ? 'shelf' : 'calendar';
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v === null ? next.delete(k) : next.set(k, v);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const c: Record<ReadingStatus, number> = { done: 0, reading: 0, want: 0 };
    for (const i of shelf) c[i.entry.status] += 1;
    return c;
  }, [shelf]);
  const quoteCount = useMemo(() => shelf.reduce((n, i) => n + (i.entry.quotes?.length ?? 0), 0), [shelf]);

  return (
    <Page>
      <PageHeader
        title="서재"
        description="나만의 독서기록장"
        actions={
          <ButtonLink to={paths.quotes} size="sm" variant="outline" leadingIcon={<QuoteIcon aria-hidden />}>
            문장 {quoteCount}
          </ButtonLink>
        }
      />

      <YearSummary shelf={shelf} />

      <div className={styles.statusTabs}>
        <Tabs<ReadingStatus>
          label="독서 상태"
          variant="pill"
          bleed
          value={status}
          onChange={(s) => update({ status: s === 'done' ? null : s, tag: null, rating: null })}
          controls="library-panel"
          items={STATUS_ORDER.map((s) => ({ value: s, label: s === 'done' ? '다 읽은 책' : READING_STATUS_LABEL[s], count: counts[s] }))}
        />
      </div>

      <div id="library-panel" role="tabpanel" aria-label={READING_STATUS_LABEL[status]}>
        {status === 'done' ? (
          <Finished shelf={shelf} view={view} onView={(v) => update({ view: v === 'calendar' ? null : v })} tag={params.get('tag')} rating={(params.get('rating') as RatingFilter) ?? 'all'} onFilter={update} />
        ) : (
          <CoverShelf items={shelf.filter((i) => i.entry.status === status)} status={status} />
        )}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 올해 결산
// ---------------------------------------------------------------------------
function YearSummary({ shelf }: { shelf: ShelfItem[] }) {
  const year = new Date().getFullYear();
  const items = useMemo(() => finishedBooks(shelf, year), [shelf, year]);
  const p = useMemo(() => readingProfile(items), [items]);
  if (items.length === 0) return null;
  const authors = p.authors.filter((a) => a.count > 1).slice(0, 2);

  return (
    <section className={styles.summary} aria-labelledby="summary-title">
      <h2 id="summary-title" className={styles.summaryTitle}>
        {year}년 결산
      </h2>
      <div className={styles.summaryCovers} aria-hidden>
        {items.slice(0, 6).map(({ book }) => (
          <BookCover key={book.id} book={book} size="fluid" />
        ))}
      </div>
      <dl className={styles.summaryStats}>
        <div>
          <dt>읽은 책</dt>
          <dd>
            {p.count}
            <small>권</small>
          </dd>
        </div>
        <div>
          <dt>평균 별점</dt>
          <dd>
            <Star aria-hidden className={styles.star} />
            {p.averageRating?.toFixed(1) ?? '–'}
          </dd>
        </div>
      </dl>
      <dl className={styles.summaryTaste}>
        <div>
          <dt>많이 읽은 장르</dt>
          <dd>{p.genres.slice(0, 3).map((g) => `${g.name} ${g.count}`).join(' · ')}</dd>
        </div>
        <div>
          <dt>많이 읽은 작가</dt>
          <dd>{authors.length ? authors.map((a) => `${a.name} ${a.count}`).join(' · ') : '아직 두 권 이상 읽은 작가가 없어요'}</dd>
        </div>
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 다 읽은 책: 태그·별점 필터 + 캘린더 | 리스트 | 책꽂이
// ---------------------------------------------------------------------------
function matchesRating(r: number | undefined, f: RatingFilter) {
  if (f === 'all') return true;
  if (!r) return false;
  if (f === '5') return r === 5;
  if (f === 'low') return r <= 3.5;
  return r >= Number(f);
}

function Finished({
  shelf,
  view,
  onView,
  tag,
  rating,
  onFilter,
}: {
  shelf: ShelfItem[];
  view: View;
  onView: (v: View) => void;
  tag: string | null;
  rating: RatingFilter;
  onFilter: (patch: Record<string, string | null>) => void;
}) {
  const start = useRecord((s) => s.start);
  const all = useMemo(() => finishedBooks(shelf), [shelf]);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of all) for (const t of i.entry.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);
  const items = useMemo(
    () => all.filter((i) => (!tag || i.entry.tags?.includes(tag)) && matchesRating(i.entry.rating, rating)),
    [all, tag, rating],
  );
  const filtered = Boolean(tag) || rating !== 'all';

  if (all.length === 0)
    return (
      <EmptyState
        compact
        title="아직 다 읽은 책이 없어요"
        description="다 읽은 책에 별점을 남기면 캘린더에 표지가 쌓여요."
        action={
          <Button leadingIcon={<Plus aria-hidden />} onClick={() => start()}>
            첫 책 기록하기
          </Button>
        }
      />
    );

  return (
    <>
      <div className={styles.filterRow}>
        <label className={styles.select}>
          <span className="sr-only">별점 필터</span>
          <select value={rating} onChange={(e) => onFilter({ rating: e.target.value === 'all' ? null : e.target.value })}>
            {RATING_FILTERS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <ul role="list" className={styles.tagRow} aria-label="태그 필터">
          {tags.map(([t, n]) => (
            <li key={t}>
              <button type="button" className={cn(styles.tag, tag === t && styles.tagOn)} aria-pressed={tag === t} onClick={() => onFilter({ tag: tag === t ? null : t })}>
                #{t} <span>{n}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.viewRow}>
        <p className={styles.resultCount} aria-live="polite">
          {filtered ? `${items.length}권 찾음` : `모두 ${items.length}권`}
          {filtered && (
            <button type="button" className={styles.clear} onClick={() => onFilter({ tag: null, rating: null })}>
              필터 지우기
            </button>
          )}
        </p>
        <Tabs<View>
          label="보기 방식"
          variant="segment"
          className={styles.viewTabs}
          value={view}
          onChange={onView}
          controls="finished-view"
          items={[
            { value: 'calendar', label: '캘린더' },
            { value: 'list', label: '리스트' },
            { value: 'shelf', label: '책꽂이' },
          ]}
        />
      </div>

      <div id="finished-view" role="tabpanel" aria-label={VIEW_LABEL[view]}>
        {items.length === 0 ? (
          <EmptyState compact title="조건에 맞는 책이 없어요" action={<Button variant="outline" onClick={() => onFilter({ tag: null, rating: null })}>필터 지우기</Button>} />
        ) : view === 'calendar' ? (
          <CalendarView items={items} />
        ) : view === 'list' ? (
          <ListView items={items} />
        ) : (
          <ShelfView items={items} />
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 캘린더: 완독한 날짜 칸에 표지
// ---------------------------------------------------------------------------
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function CalendarView({ items }: { items: ShelfItem[] }) {
  const today = new Date();
  const thisMonth = monthKey(today);
  // 이번 달 기록이 없으면 가장 최근에 완독한 달부터
  const initial = items.some((i) => i.entry.finishedAt!.startsWith(thisMonth)) ? thisMonth : (items[0]?.entry.finishedAt!.slice(0, 7) ?? thisMonth);
  const [month, setMonth] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const [y, m] = month.split('-').map(Number) as [number, number];
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const byDay = useMemo(() => {
    const map = new Map<string, ShelfItem[]>();
    for (const i of items) if (i.entry.finishedAt!.startsWith(month)) map.set(i.entry.finishedAt!, [...(map.get(i.entry.finishedAt!) ?? []), i]);
    return map;
  }, [items, month]);
  const monthItems = useMemo(() => items.filter((i) => i.entry.finishedAt!.startsWith(month)), [items, month]);
  const shown = selected ? (byDay.get(selected) ?? []) : monthItems;

  const move = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(monthKey(d));
    setSelected(null);
  };
  const todayKey = toDateKey(today);
  const isFuture = month >= thisMonth;

  return (
    <div className={styles.calendar}>
      <div className={styles.calHead}>
        <button type="button" className={styles.calNav} onClick={() => move(-1)} aria-label="이전 달">
          <ChevronLeft aria-hidden />
        </button>
        <h3 className={styles.calTitle} aria-live="polite">
          {y}년 {m}월 <span>{monthItems.length}권</span>
        </h3>
        <button type="button" className={styles.calNav} onClick={() => move(1)} aria-label="다음 달" disabled={isFuture}>
          <ChevronRight aria-hidden />
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.weekRow} aria-hidden>
          {WEEK.map((w) => (
            <span key={w} className={styles.weekday}>
              {w}
            </span>
          ))}
        </div>
        <div className={styles.days}>
          {Array.from({ length: first.getDay() }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const key = `${month}-${String(day).padStart(2, '0')}`;
            const books = byDay.get(key);
            const top = books?.[0];
            if (!top)
              return (
                <span key={key} className={cn(styles.day, key === todayKey && styles.today)} aria-hidden>
                  <span className={styles.dayNum}>{day}</span>
                </span>
              );
            return (
              <button
                key={key}
                type="button"
                className={cn(styles.day, styles.hasBook, selected === key && styles.selected, key === todayKey && styles.today)}
                aria-pressed={selected === key}
                aria-label={`${m}월 ${day}일, ${top.book.title}${books.length > 1 ? ` 외 ${books.length - 1}권` : ''}`}
                onClick={() => setSelected(selected === key ? null : key)}
              >
                <span className={styles.dayNum}>{day}</span>
                <span className={styles.thumb}>
                  <BookCover book={top.book} size="fluid" />
                  {books.length > 1 && <span className={styles.more}>+{books.length - 1}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.calList}>
        <p className={styles.calListTitle}>{selected ? `${m}월 ${Number(selected.slice(8))}일에 다 읽은 책` : `${m}월에 다 읽은 책`}</p>
        {shown.length === 0 ? <p className={styles.muted}>이 달에는 완독 기록이 없어요.</p> : <RecordRows items={shown} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 리스트: 완독일 · 표지 · 별점 · 한 줄 평 (월별)
// ---------------------------------------------------------------------------
function ListView({ items }: { items: ShelfItem[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ShelfItem[]>();
    for (const i of items) {
      const k = i.entry.finishedAt!.slice(0, 7);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className={styles.groups}>
      {groups.map(([k, list]) => (
        <section key={k} aria-label={`${k.slice(0, 4)}년 ${Number(k.slice(5))}월`}>
          <h3 className={styles.groupTitle}>
            {k.slice(0, 4)}년 {Number(k.slice(5))}월 <span>{list.length}권</span>
          </h3>
          <RecordRows items={list} />
        </section>
      ))}
    </div>
  );
}

function RecordRows({ items }: { items: ShelfItem[] }) {
  return (
    <ul role="list" className={styles.rows}>
      {items.map(({ book, entry }) => {
        const isPublic = Object.values(entry.visibility ?? {}).some(Boolean);
        return (
          <li key={book.id}>
            <Link to={paths.book(book.id)} className={styles.row}>
              <span className={styles.rowDate}>
                <strong>{Number(entry.finishedAt!.slice(8))}</strong>
                <span>{Number(entry.finishedAt!.slice(5, 7))}월</span>
              </span>
              <span className={styles.rowCover}>
                <BookCover book={book} size="fluid" />
              </span>
              <span className={styles.rowBody}>
                <strong className={styles.rowTitle}>{book.title}</strong>
                <span className={styles.rowAuthor}>{byline(book, true)}</span>
                <StarRating value={entry.rating} size="sm" />
                {entry.oneLiner && <span className={styles.rowLine}>{entry.oneLiner}</span>}
                <span className={styles.rowMeta}>
                  {entry.readCount && entry.readCount > 1 && <span className={styles.badge}>{entry.readCount}회독</span>}
                  {entry.quotes?.length ? <span>문장 {entry.quotes.length}</span> : null}
                  {!isPublic && (
                    <span className={styles.private}>
                      <Lock aria-hidden />
                      나만 보기
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// 책꽂이: 해마다 한 칸, 다 읽은 순서대로 책등이 왼쪽부터 꽂힘
// ---------------------------------------------------------------------------
function ShelfView({ items }: { items: ShelfItem[] }) {
  const years = useMemo(() => {
    const map = new Map<string, ShelfItem[]>();
    for (const i of items) {
      const y = i.entry.finishedAt!.slice(0, 4);
      map.set(y, [...(map.get(y) ?? []), i]);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([y, list]) => [y, [...list].sort((a, b) => a.entry.finishedAt!.localeCompare(b.entry.finishedAt!))] as const);
  }, [items]);

  return (
    <div className={styles.groups}>
      {years.map(([y, list]) => (
        <section key={y} aria-label={`${y}년 책꽂이`}>
          <h3 className={styles.groupTitle}>
            {y}년 <span>{list.length}권</span>
          </h3>
          <div className={styles.bookcase}>
            <ul role="list" className={styles.shelf} style={{ '--spine-max': `${SPINE_MAX_HEIGHT}px` } as CSSProperties}>
              {list.map(({ book, entry }) => (
                <li key={book.id} className={styles.slot}>
                  <Link
                    to={paths.book(book.id)}
                    className={styles.spineLink}
                    aria-label={`${book.title}, ${book.authors[0] ?? ''}${entry.rating ? `, 별점 ${entry.rating}점` : ''}`}
                    title={book.title}
                  >
                    <BookSpine book={book} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 읽는 중 / 읽고 싶어요: 표지 책장
// ---------------------------------------------------------------------------
function CoverShelf({ items, status }: { items: ShelfItem[]; status: ReadingStatus }) {
  const start = useRecord((s) => s.start);
  const sorted = useMemo(() => [...items].sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt)), [items]);
  if (sorted.length === 0)
    return (
      <EmptyState
        compact
        title={status === 'reading' ? '읽는 중인 책이 없어요' : '읽고 싶은 책이 없어요'}
        description="발견에서 마음에 드는 책을 찾아 담아보세요."
        action={<ButtonLink to={paths.discover}>책 둘러보기</ButtonLink>}
      />
    );
  return (
    <ul role="list" className={styles.coverGrid}>
      {sorted.map(({ book }) => (
        <li key={book.id}>
          <Link to={paths.book(book.id)} className={styles.coverItem}>
            <BookCover book={book} size="fluid" />
            <span className={styles.coverTitle}>{book.title}</span>
            <span className={styles.coverAuthor}>{byline(book, true)}</span>
          </Link>
          {status === 'reading' && (
            <button type="button" className={styles.finishBtn} onClick={() => start({ book, step: 'finish' })}>
              다 읽었어요
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 로그인하지 않았으면 로그인 안내, 했으면 본 화면 */
export function LibraryPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<LibraryIcon aria-hidden />} title="내 서재는 로그인 후에 볼 수 있어요" description="다 읽은 책, 읽는 중인 책, 읽고 싶은 책을 기록하면 여기에 모여요. 기록은 계정에 저장돼요." />
      </Page>
    );
  return <LibraryPageInner />;
}
