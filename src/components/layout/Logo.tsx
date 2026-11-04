import { Link } from 'react-router';
import { paths } from '@/routes/paths';
import styles from './Logo.module.scss';

export function Logo() {
  return (
    <Link to={paths.home} className={styles.logo} aria-label="BookLog 홈">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--plum-700)" />
        <path d="M9 8.5h6.2c2.6 0 4.3 1.3 4.3 3.4 0 1.4-.8 2.4-2 2.9 1.6.4 2.6 1.6 2.6 3.2 0 2.4-1.9 3.9-4.7 3.9H9z" fill="var(--paper-50)" />
        <circle cx="23" cy="20.5" r="1.6" fill="var(--ochre-400)" />
      </svg>
      <span className={styles.word}>
        Book<em>Log</em>
      </span>
    </Link>
  );
}
