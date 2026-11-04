import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import styles from './MonthHeatmap.module.scss';

interface MonthHeatmapProps {
  year: number;
  month: number; // 0-11
  daily: Map<number, number>;
  today?: Date;
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function level(pages: number): 0 | 1 | 2 | 3 {
  if (pages <= 0) return 0;
  if (pages < 20) return 1;
  if (pages < 40) return 2;
  return 3;
}

/** 이번 달 독서 캘린더 — 하루에 읽은 쪽수를 농도로 표현 */
export function MonthHeatmap({ year, month, daily, today = new Date() }: MonthHeatmapProps) {
  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [year, month]);
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className={styles.wrap}>
      <div className={styles.grid} role="grid" aria-label={`${year}년 ${month + 1}월 독서 캘린더`}>
        <div role="row" className={styles.row}>
          {WEEK.map((w) => (
            <span key={w} role="columnheader" className={styles.week}>
              {w}
            </span>
          ))}
        </div>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
          <div role="row" className={styles.row} key={r}>
            {cells.slice(r * 7, r * 7 + 7).map((day, i) => {
              if (day === null) return <span key={`e${i}`} role="gridcell" className={styles.blank} />;
              const pages = daily.get(day) ?? 0;
              const isToday = isThisMonth && day === today.getDate();
              const future = isThisMonth && day > today.getDate();
              return (
                <span
                  key={day}
                  role="gridcell"
                  className={cn(styles.cell, styles[`l${level(pages)}`], isToday && styles.today, future && styles.future)}
                  aria-label={`${month + 1}월 ${day}일${pages ? `, ${pages}쪽 읽음` : ', 기록 없음'}${isToday ? ' (오늘)' : ''}`}
                >
                  {day}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.legend} aria-hidden>
        <span>적게</span>
        <i className={styles.l1} />
        <i className={styles.l2} />
        <i className={styles.l3} />
        <span>많이</span>
      </div>
    </div>
  );
}
