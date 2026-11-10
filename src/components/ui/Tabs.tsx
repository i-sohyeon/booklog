import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import styles from './Tabs.module.scss';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** 탭이 제어하는 패널 id */
  controls?: string;
  variant?: 'underline' | 'pill' | 'segment';
  /** 가로 스크롤 칩이 화면 끝까지 닿도록 좌우 여백만큼 확장 */
  bleed?: boolean;
  className?: string;
}

/** WAI-ARIA Tabs 패턴 (좌우 화살표/Home/End 이동) */
export function Tabs<T extends string>({ items, value, onChange, label, controls, variant = 'underline', bleed, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = items.findIndex((i) => i.value === value);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;
    e.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cn(styles.list, styles[variant], bleed && styles.bleed, className)} onKeyDown={onKeyDown}>
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
