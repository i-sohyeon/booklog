import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  title: string;
  id?: string;
  eyebrow?: string;
  description?: ReactNode;
  more?: { to: string; label?: string };
  aside?: ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}

export function SectionHeader({ title, id, eyebrow, description, more, aside, as: H = 'h2', className }: SectionHeaderProps) {
  return (
    <div className={cn(styles.header, className)}>
      <div className={styles.text}>
        {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
        <H id={id} className={styles.title}>
          {title}
        </H>
        {description && <p className={styles.desc}>{description}</p>}
      </div>
      {aside}
      {more && (
        <Link to={more.to} className={styles.more}>
          {more.label ?? '전체보기'}
          <ChevronRight aria-hidden />
        </Link>
      )}
    </div>
  );
}
