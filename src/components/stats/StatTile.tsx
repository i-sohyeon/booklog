import type { ReactNode } from 'react';
import styles from './StatTile.module.scss';

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className={styles.grid}>{children}</dl>;
}

export function StatTile({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className={styles.tile}>
      <dt>{label}</dt>
      <dd>
        <span className={styles.value}>
          {value}
          {unit && <small>{unit}</small>}
        </span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </dd>
    </div>
  );
}
