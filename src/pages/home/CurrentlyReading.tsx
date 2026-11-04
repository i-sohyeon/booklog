import { Link } from 'react-router';
import { BookMarked, PenLine } from 'lucide-react';
import type { ReadingSession } from '@/types/book';
import { lastSessionDate, progressOf, type ShelfItem } from '@/store/selectors';
import { diffInDays, parseDateKey } from '@/lib/date';
import { paths } from '@/routes/paths';
import { BookCover, Button, ButtonLink, EmptyState, IconButton, ProgressBar, SectionHeader } from '@/components/ui';
import styles from './CurrentlyReading.module.scss';

interface Props {
  items: ShelfItem[];
  sessions: ReadingSession[];
  onRecord: (item: ShelfItem) => void;
}

function lastReadLabel(date: Date | null): string | null {
  if (!date) return null;
  const d = diffInDays(new Date(), date);
  if (d <= 0) return '오늘 읽음';
  if (d === 1) return '어제 읽음';
  return `${d}일 전 읽음`;
}

export function CurrentlyReading({ items, sessions, onRecord }: Props) {
  const [hero, ...rest] = items;

  return (
    <section aria-labelledby="reading-title">
      <SectionHeader
        id="reading-title"
        title="지금 읽는 중"
        more={items.length > 0 ? { to: `${paths.library}?status=reading`, label: `${items.length}권` } : undefined}
      />

      {!hero ? (
        <div className={styles.empty}>
          <EmptyState
            compact
            title="읽고 있는 책이 없어요"
            description="읽기 시작한 책을 등록하면 진도를 기록할 수 있어요."
            visual={<BookMarked className={styles.emptyIcon} aria-hidden />}
            action={
              <>
                <ButtonLink to={`${paths.library}?status=want`} variant="outline" size="sm">
                  읽고 싶은 책 보기
                </ButtonLink>
                <ButtonLink to={paths.search} size="sm">
                  책 검색
                </ButtonLink>
              </>
            }
          />
        </div>
      ) : (
        <>
          <HeroCard item={hero} sessions={sessions} onRecord={onRecord} />
          {rest.length > 0 && (
            <ul role="list" className={styles.others}>
              {rest.map((item) => {
                const pct = Math.round(progressOf(item) * 100);
                return (
                  <li key={item.book.id} className={styles.other}>
                    <Link to={paths.book(item.book.id)} className={styles.otherLink}>
                      <BookCover book={item.book} size="xs" />
                      <span className={styles.otherBody}>
                        <span className={styles.otherTitle}>{item.book.title}</span>
                        <span className={styles.otherMeta}>
                          <ProgressBar value={pct / 100} size="sm" label={`${item.book.title} 진행률`} />
                          <span className={styles.otherPct}>{pct}%</span>
                        </span>
                      </span>
                    </Link>
                    <IconButton label={`「${item.book.title}」 진도 기록`} variant="soft" size="sm" onClick={() => onRecord(item)}>
                      <PenLine />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function HeroCard({ item, sessions, onRecord }: { item: ShelfItem; sessions: ReadingSession[]; onRecord: (i: ShelfItem) => void }) {
  const { book, entry } = item;
  const pct = Math.round(progressOf(item) * 100);
  const remaining = book.pageCount - entry.currentPage;
  const dayCount = entry.startedAt ? diffInDays(new Date(), parseDateKey(entry.startedAt)) + 1 : null;
  const lastRead = lastReadLabel(lastSessionDate(sessions, book.id));

  return (
    <article className={styles.hero} data-tone={book.coverTone}>
      <Link to={paths.book(book.id)} className={styles.heroCover} aria-label={`${book.title} 상세 보기`}>
        <BookCover book={book} size="fluid" />
      </Link>
      <div className={styles.heroBody}>
        <p className={styles.heroEyebrow}>
          {dayCount ? `${dayCount}일째 읽는 중` : '읽는 중'}
          {lastRead && <span> · {lastRead}</span>}
        </p>
        <h3 className={styles.heroTitle}>
          <Link to={paths.book(book.id)}>{book.title}</Link>
        </h3>
        <p className={styles.heroAuthor}>{book.authors.join(', ')}</p>

        <div className={styles.heroProgress}>
          <div className={styles.heroNumbers}>
            <span className={styles.heroPct}>
              {pct}
              <small>%</small>
            </span>
            <span className={styles.heroPages}>
              {entry.currentPage} / {book.pageCount}쪽
              <br />
              {remaining > 0 ? `${remaining}쪽 남음` : '마지막 페이지'}
            </span>
          </div>
          <ProgressBar value={pct / 100} label={`${book.title} 진행률`} />
        </div>
      </div>

      <div className={styles.heroActions}>
        <Button size="sm" leadingIcon={<PenLine aria-hidden />} onClick={() => onRecord(item)}>
          진도 기록
        </Button>
        <ButtonLink to={paths.book(book.id)} size="sm" variant="outline">
          책 정보
        </ButtonLink>
      </div>
    </article>
  );
}
