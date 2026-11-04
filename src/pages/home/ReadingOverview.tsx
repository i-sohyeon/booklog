import { useMemo, useState } from 'react';
import { Flame, Pencil } from 'lucide-react';
import type { ReadingSession } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { finishedInYear, monthSummary, type ShelfItem } from '@/store/selectors';
import { paths } from '@/routes/paths';
import { IconButton, ProgressRing, SectionHeader } from '@/components/ui';
import { GoalSheet } from '@/components/stats/GoalSheet';
import { MonthHeatmap } from '@/components/stats/MonthHeatmap';
import styles from './ReadingOverview.module.scss';

interface Props {
  shelf: ShelfItem[];
  sessions: ReadingSession[];
  streak: number;
}

export function ReadingOverview({ shelf, sessions, streak }: Props) {
  const goal = useLibraryStore((s) => s.goal);
  const [goalOpen, setGoalOpen] = useState(false);
  const now = new Date();
  const year = now.getFullYear();

  const finished = useMemo(() => finishedInYear(shelf, year).length, [shelf, year]);
  const month = useMemo(() => monthSummary(shelf, sessions, now), [shelf, sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = goal.year === year ? goal.targetBooks : 0;
  const rate = target > 0 ? finished / target : 0;
  const remaining = Math.max(0, target - finished);
  const monthsLeft = 12 - now.getMonth();
  const pace = remaining > 0 ? Math.ceil((remaining / monthsLeft) * 10) / 10 : 0;

  return (
    <section aria-labelledby="overview-title" className={styles.card}>
      <SectionHeader
        id="overview-title"
        eyebrow={`${year} Reading`}
        title="올해의 독서"
        more={{ to: paths.stats, label: '통계' }}
        className={styles.header}
      />

      <div className={styles.goal}>
        <ProgressRing value={rate} size={112} stroke={9} label={`올해 목표 달성률 ${Math.round(rate * 100)}%`}>
          <span className={styles.ringValue}>{finished}</span>
          <span className={styles.ringUnit}>/ {target}권</span>
        </ProgressRing>
        <div className={styles.goalText}>
          <p className={styles.goalRate}>
            {Math.round(rate * 100)}
            <small>%</small>
          </p>
          <p className={styles.goalDesc}>
            {target === 0
              ? '올해 목표를 정해보세요.'
              : remaining === 0
                ? '올해 목표를 달성했어요!'
                : `목표까지 ${remaining}권, 한 달에 ${pace}권씩 읽으면 돼요.`}
          </p>
          <IconButton label="독서 목표 수정" size="sm" variant="soft" onClick={() => setGoalOpen(true)} className={styles.edit}>
            <Pencil />
          </IconButton>
        </div>
      </div>

      <div className={styles.monthHead}>
        <h3 className={styles.monthTitle}>{now.getMonth() + 1}월의 기록</h3>
        {streak > 0 && (
          <span className={styles.streak}>
            <Flame aria-hidden />
            {streak}일 연속
          </span>
        )}
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>읽은 쪽수</dt>
          <dd>
            {month.pages.toLocaleString()}
            <small>쪽</small>
          </dd>
        </div>
        <div>
          <dt>독서일</dt>
          <dd>
            {month.readingDays}
            <small>일</small>
          </dd>
        </div>
        <div>
          <dt>완독</dt>
          <dd>
            {month.finished}
            <small>권</small>
          </dd>
        </div>
      </dl>

      <MonthHeatmap year={month.year} month={month.month} daily={month.daily} today={now} />

      <GoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} />
    </section>
  );
}
