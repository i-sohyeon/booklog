import { useId, useMemo } from 'react';
import { cn } from '@/lib/cn';
import styles from './BarChart.module.scss';

export interface BarDatum {
  key: string;
  /** 축 라벨 (짧게) */
  label: string;
  /** 툴팁/스크린리더용 전체 라벨 */
  fullLabel: string;
  value: number;
  /** 미래 구간 등 아직 오지 않은 데이터 */
  muted?: boolean;
}

interface BarChartProps {
  title: string;
  data: BarDatum[];
  unit: string;
  height?: number;
  /** 강조할 막대 (현재 월/오늘) */
  highlightKey?: string;
  /** 축 라벨을 n개마다 표시 (일간 차트) */
  labelEvery?: number;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

/**
 * 단일 시리즈 세로 막대 차트 (단일 색상 = 크기 표현).
 * - 막대 끝 4px 라운드, 막대 사이 간격, 옅은 격자
 * - hover/focus 툴팁, 스크린리더용 표 제공
 */
export function BarChart({ title, data, unit, height = 180, highlightKey, labelEvery = 1 }: BarChartProps) {
  const tableId = useId();
  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0)), [data]);
  const ticks = [max, max / 2, 0];
  const empty = data.every((d) => d.value === 0);

  return (
    <figure className={styles.figure}>
      <figcaption className="sr-only">{title}</figcaption>
      <div className={styles.chart} style={{ height }}>
        <div className={styles.grid} aria-hidden>
          {ticks.map((t) => (
            <div key={t} className={styles.gridLine}>
              <span>{Number.isInteger(t) ? t.toLocaleString() : t.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className={styles.bars} role="list" aria-describedby={tableId}>
          {data.map((d) => {
            const pct = (d.value / max) * 100;
            return (
              <div
                key={d.key}
                role="listitem"
                tabIndex={0}
                className={cn(styles.col, d.key === highlightKey && styles.highlight, d.muted && styles.muted)}
                aria-label={`${d.fullLabel} ${d.value.toLocaleString()}${unit}`}
              >
                <span className={styles.bar} style={{ height: d.value > 0 ? `max(${pct}%, 3px)` : 0 }} />
                <span className={styles.tip} aria-hidden>
                  <strong>
                    {d.value.toLocaleString()}
                    {unit}
                  </strong>
                  {d.fullLabel}
                </span>
              </div>
            );
          })}
        </div>
        {empty && <p className={styles.empty}>이 기간에는 기록이 없어요</p>}
      </div>
      <div className={styles.axis} aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className={d.key === highlightKey ? styles.axisActive : undefined}>
            {i % labelEvery === 0 || d.key === highlightKey ? d.label : ''}
          </span>
        ))}
      </div>
      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.fullLabel}</th>
              <td>
                {d.value.toLocaleString()}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
