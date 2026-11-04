import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReadingSession } from '@/types/book';
import { booksReadInMonth, monthStats } from '@/store/stats';
import type { ShelfItem } from '@/store/selectors';
import { paths } from '@/routes/paths';
import { BookCover, IconButton, StatusBadge } from '@/components/ui';
import { BarChart } from '@/components/stats/BarChart';
import { MonthHeatmap } from '@/components/stats/MonthHeatmap';
import { StatGrid, StatTile } from '@/components/stats/StatTile';
import styles from './StatsPage.module.scss';

interface Props {
  shelf: ShelfItem[];
  sessions: ReadingSession[];
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthView({ shelf, sessions, year, month, onChange }: Props) {
  const stats = useMemo(() => monthStats(shelf, sessions, year, month), [shelf, sessions, year, month]);
  const books = useMemo(() => booksReadInMonth(shelf, sessions, year, month), [shelf, sessions, year, month]);
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());
  const elapsed = isCurrent ? now.getDate() : stats.daysInMonth;
  const avg = stats.readingDays ? Math.round(stats.pages / stats.readingDays) : 0;

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChange(d.getFullYear(), d.getMonth());
  };

  const dailyMap = useMemo(() => new Map(stats.dailyPages.map((p, i) => [i + 1, p] as [number, number]).filter(([, p]) => p > 0)), [stats]);

  return (
    <>
      <div className={styles.navigator}>
        <IconButton label="이전 달" onClick={() => go(-1)}>
          <ChevronLeft />
        </IconButton>
        <h2 className={styles.navLabel}>
          {year}년 {month + 1}월
        </h2>
        <IconButton label="다음 달" disabled={isFuture} onClick={() => go(1)}>
          <ChevronRight />
        </IconButton>
      </div>

      <StatGrid>
        <StatTile label="읽은 쪽수" value={stats.pages.toLocaleString()} unit="쪽" />
        <StatTile label="독서일" value={stats.readingDays} unit={`/ ${elapsed}일`} />
        <StatTile label="완독" value={stats.finished.length} unit="권" />
        <StatTile label="독서한 날 평균" value={avg} unit="쪽" />
      </StatGrid>

      <section className={styles.card} aria-labelledby="daily-title">
        <div className={styles.cardHead}>
          <div>
            <h3 id="daily-title" className={styles.cardTitle}>
              일별 읽은 쪽수
            </h3>
          </div>
        </div>
        <BarChart
          title={`${year}년 ${month + 1}월 일별 읽은 쪽수`}
          unit="쪽"
          height={160}
          labelEvery={5}
          highlightKey={isCurrent ? String(now.getDate()) : undefined}
          data={stats.dailyPages.map((p, i) => ({
            key: String(i + 1),
            label: String(i + 1),
            fullLabel: `${month + 1}월 ${i + 1}일`,
            value: p,
            muted: isCurrent && i + 1 > now.getDate(),
          }))}
        />
      </section>

      <div className={styles.twoCol}>
        <section className={styles.card} aria-labelledby="mcal-title">
          <div className={styles.cardHead}>
            <h3 id="mcal-title" className={styles.cardTitle}>
              독서 캘린더
            </h3>
          </div>
          <MonthHeatmap year={year} month={month} daily={dailyMap} />
        </section>

        <section className={styles.card} aria-labelledby="mbooks-title">
          <div className={styles.cardHead}>
            <div>
              <h3 id="mbooks-title" className={styles.cardTitle}>
                이달에 읽은 책
              </h3>
              <p className={styles.cardDesc}>진도를 기록한 책 · 쪽수 많은 순</p>
            </div>
          </div>
          {books.length === 0 ? (
            <p className={styles.muted}>이 달에는 진도 기록이 없어요.</p>
          ) : (
            <div className={styles.bookRows}>
              {books.map(({ item, pages }) => (
                <Link key={item.book.id} to={paths.book(item.book.id)} className={styles.bookRow}>
                  <BookCover book={item.book} size="xs" />
                  <span className={styles.bookTitle}>{item.book.title}</span>
                  {item.entry.status === 'done' && item.entry.finishedAt?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && (
                    <StatusBadge status="done" />
                  )}
                  <span className={styles.bookPages}>{pages}쪽</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
