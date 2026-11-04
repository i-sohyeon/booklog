import { BookMarked, BookOpen, BookCheck, PauseCircle, type LucideIcon } from 'lucide-react';
import { READING_STATUS_LABEL, READING_STATUS_ORDER, type ReadingStatus } from '@/types/book';
import { cn } from '@/lib/cn';
import styles from './StatusPicker.module.scss';

const META: Record<ReadingStatus, { icon: LucideIcon; hint: string }> = {
  reading: { icon: BookOpen, hint: '오늘부터 읽기 시작' },
  want: { icon: BookMarked, hint: '나중에 읽을 책으로 보관' },
  done: { icon: BookCheck, hint: '오늘 완독한 것으로 기록' },
  paused: { icon: PauseCircle, hint: '잠시 멈춘 책' },
};

interface StatusPickerProps {
  value: ReadingStatus | null;
  onChange: (status: ReadingStatus) => void;
  name: string;
  layout?: 'grid' | 'row';
}

export function StatusPicker({ value, onChange, name, layout = 'grid' }: StatusPickerProps) {
  return (
    <div role="radiogroup" aria-label="독서 상태" className={cn(styles.group, styles[layout])}>
      {READING_STATUS_ORDER.map((status) => {
        const { icon: Icon, hint } = META[status];
        const checked = value === status;
        return (
          <label key={status} className={cn(styles.option, checked && styles.checked)} data-status={status}>
            <input
              type="radio"
              name={name}
              value={status}
              checked={checked}
              onChange={() => onChange(status)}
              className="sr-only"
            />
            <Icon aria-hidden className={styles.icon} />
            <span className={styles.label}>{READING_STATUS_LABEL[status]}</span>
            {layout === 'grid' && <span className={styles.hint}>{hint}</span>}
          </label>
        );
      })}
    </div>
  );
}
