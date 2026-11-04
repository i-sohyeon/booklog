import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReadingSession } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { yearStats } from '@/store/stats';
import type { ShelfItem } from '@/store/selectors';
import { paths } from '@/routes/paths';
import { formatDate } from '@/lib/date';
import { BookCover, IconButton, ProgressBar, SegmentedControl } from '@/components/ui';
import { BarChart } from '@/components/stats/BarChart';
import { YearHeatmap } from '@/components/stats/YearHeatmap';
import { GenreBars } from '@/components/stats/GenreBars';
import { StatGrid, StatTile } from '@/components/stats/StatTile';
import styles from './StatsPage.module.scss';

interface Props {
  shelf: ShelfItem[];
  sessions: ReadingSession[];
  year: number;
  years: number[];
  onYear: (y: number) => void;
}

type Metric = 'pages' | 'books';

export function YearView({ shelf, sessions, year, years, onYear }: Props) {
  const goal = useLibraryStore((s) => s.goal);
  const stats = useMemo(() => yearStats(shelf, sessions, year), [shelf, sessions, year]);
  const [metric, setMetric] = useState<Metric>('pages');
  const now = new Date();
  const isCurrent = year === now.getFullYear();
  const idx = years.indexOf(year);

  const chartData = stats.monthlyPages.map((pages, m) => ({
    key: String(m),
    label: `${m + 1}`,
    fullLabel: `${year}년 ${m + 1}월`,
    value: metric === 'pages' ? pages : (stats.monthlyFinished[m] ?? 0),
    muted: isCurrent && m > now.getMonth(),
  }));

  const target = goal.year === year ? goal.targetBooks : null;
  const rate = target ? stats.finished.length / target : 0;
  // 연 진행률 대비 목표 진행률 (페이스)
  const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000) + 1;
  const expected = target ? Math.round((target * Math.min(dayOfYear, 365)) / 365) : 0;
  const diff = stats.finished.length - expected;

  return (
    <>
      <div className={styles.navigator}>
        <IconButton label="이전 해" disabled={idx === -1 || idx >= years.length - 1} onClick={() => onYear(years[idx + 1]!)}>
          <ChevronLeft />
        </IconButton>
        <h2 className={styles.navLabel}>{year}년</h2>
        <IconButton label="다음 해" disabled={idx <= 0} onClick={() => onYear(years[idx - 1]!)}>
          <ChevronRight />
        </IconButton>
      </div>

      <section aria-label={`${year}년 요약`}>
        <StatGrid>
          <StatTile label="완독" value={stats.finished.length} unit="권" />
          <StatTile label="읽은 쪽수" value={stats.pages.toLocaleString()} unit="쪽" />
          <StatTile label="독서일" value={stats.readingDays} unit="일" hint={stats.longestStreak > 1 ? `최장 ${stats.longestStreak}일 연속` : undefined} />
          <StatTile label="평균 별점" value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : '–'} unit={stats.avgRating !== null ? '점' : undefined} />
        </StatGrid>
        {target !== null && (
          <div className={styles.goal}>
            <div className={styles.goalRow}>
              <span>올해 목표 {target}권</span>
              <strong>{Math.round(rate * 100)}% 달성</strong>
            </div>
            <ProgressBar value={rate} label="올해 목표 달성률" />
            {isCurrent && (
              <p className={styles.goalNote}>
                {stats.finished.length >= target
                  ? '목표를 달성했어요. 멋진 한 해예요!'
                  : diff >= 0
                    ? `지금 페이스면 목표보다 ${diff}권 앞서 있어요.`
                    : `지금 시점 기준 목표 페이스보다 ${-diff}권 뒤처져 있어요.`}
              </p>
            )}
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="monthly-title">
        <div className={styles.cardHead}>
          <div>
            <h3 id="monthly-title" className={styles.cardTitle}>
              월별 {metric === 'pages' ? '읽은 쪽수' : '완독 권수'}
            </h3>
            <p className={styles.cardDesc}>막대를 누르거나 가리키면 값이 보여요</p>
          </div>
          <SegmentedControl<Metric>
            label="지표"
            hideLabel
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'pages', label: '쪽수' },
              { value: 'books', label: '권수' },
            ]}
          />
        </div>
        <BarChart
          title={`${year}년 월별 ${metric === 'pages' ? '읽은 쪽수' : '완독 권수'}`}
          data={chartData}
          unit={metric === 'pages' ? '쪽' : '권'}
          highlightKey={isCurrent ? String(now.getMonth()) : undefined}
        />
      </section>

      <section className={styles.card} aria-labelledby="calendar-title">
        <div className={styles.cardHead}>
          <div>
            <h3 id="calendar-title" className={styles.cardTitle}>
              독서 캘린더
            </h3>
            <p className={styles.cardDesc}>하루에 읽은 쪽수만큼 진해져요</p>
          </div>
        </div>
        <YearHeatmap year={year} daily={stats.daily} />
      </section>

      <div className={styles.twoCol}>
        <section className={styles.card} aria-labelledby="genre-title">
          <div className={styles.cardHead}>
            <div>
              <h3 id="genre-title" className={styles.cardTitle}>
                장르별 완독
              </h3>
              <p className={styles.cardDesc}>{stats.genres[0] ? `가장 많이 읽은 장르는 ${stats.genres[0].genre}예요` : '완독한 책 기준'}</p>
            </div>
          </div>
          {stats.genres.length ? <GenreBars data={stats.genres} /> : <p className={styles.muted}>이 해에 완독한 책이 없어요.</p>}
        </section>

        <section className={styles.card} aria-labelledby="shelf-title">
          <div className={styles.cardHead}>
            <div>
              <h3 id="shelf-title" className={styles.cardTitle}>
                {year}년의 서재
              </h3>
              <p className={styles.cardDesc}>완독한 순서대로</p>
            </div>
          </div>
          {stats.finished.length ? (
            <ul role="list" className={styles.shelf}>
              {stats.finished.map(({ book, entry }) => (
                <li key={book.id}>
                  <Link to={paths.book(book.id)} aria-label={`${book.title}, ${formatDate(entry.finishedAt!)} 완독`}>
                    <BookCover book={book} size="fluid" />
                    <span>{entry.finishedAt!.slice(5).replace('-', '.')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>이 해에 완독한 책이 없어요.</p>
          )}
        </section>
      </div>
    </>
  );
}
