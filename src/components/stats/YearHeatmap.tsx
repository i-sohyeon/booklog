import { useEffect, useMemo, useRef } from 'react';
import { yearWeeks } from '@/store/stats';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import styles from './YearHeatmap.module.scss';

function level(pages: number): 0 | 1 | 2 | 3 | 4 {
  if (pages <= 0) return 0;
  if (pages < 15) return 1;
  if (pages < 30) return 2;
  if (pages < 50) return 3;
  return 4;
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/** 연간 독서 캘린더 — 한 칸 = 하루, 농도 = 읽은 쪽수 (단일 색상 연속 스케일) */
export function YearHeatmap({ year, daily }: { year: number; daily: Map<string, number> }) {
  const weeks = useMemo(() => yearWeeks(year), [year]);
  const todayKey = toDateKey(new Date());
  const scroller = useRef<HTMLDivElement>(null);

  // 모바일: 오늘이 보이도록 오른쪽으로 스크롤
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ratio = year === new Date().getFullYear() ? (new Date().getMonth() + 1) / 12 : 1;
    el.scrollLeft = el.scrollWidth * ratio - el.clientWidth;
  }, [year]);

  const monthStarts = weeks.map((w, i) => {
    const firstOfMonth = w.find((k) => k?.endsWith('-01'));
    return firstOfMonth ? { col: i, label: MONTHS[Number(firstOfMonth.slice(5, 7)) - 1] } : null;
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.scroller} ref={scroller}>
        <div className={styles.inner} style={{ ['--weeks' as string]: weeks.length }}>
          <div className={styles.months} aria-hidden>
            {monthStarts.map((m, i) => (
              <span key={i}>{m?.label ?? ''}</span>
            ))}
          </div>
          <div className={styles.grid} role="img" aria-label={`${year}년 독서 캘린더. 기록한 날 ${daily.size}일`}>
            {weeks.map((week, wi) =>
              week.map((key, di) => {
                if (!key) return <span key={`${wi}-${di}`} className={styles.blank} />;
                const pages = daily.get(key) ?? 0;
                return (
                  <span
                    key={key}
                    className={cn(styles.cell, styles[`l${level(pages)}`], key === todayKey && styles.today, key > todayKey && styles.future)}
                    title={`${key.slice(5, 7)}월 ${Number(key.slice(8))}일 · ${pages ? `${pages}쪽` : '기록 없음'}`}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <div className={styles.legend} aria-hidden>
        <span>적게</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} className={styles[`l${l}`]} />
        ))}
        <span>많이</span>
      </div>
    </div>
  );
}
