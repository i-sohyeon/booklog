import { cn } from '@/lib/cn';
import styles from './Switch.module.scss';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 화면에 보이는 라벨 (스위치 왼쪽) */
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** 켜기/끄기 스위치 — 라벨까지 눌러도 바뀝니다 */
export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} className={cn(styles.row, className)} onClick={() => onChange(!checked)}>
      <span className={styles.text}>
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
