import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './Card.module.scss';

interface CardProps {
  /** 맨 위 한 줄: 왼쪽(누가·언제) — 오른쪽(별점·상태). 왼쪽·오른쪽은 headerAside로 나눔 */
  header?: ReactNode;
  headerAside?: ReactNode;
  /** 본문 */
  children?: ReactNode;
  /** 맨 아래 한 줄(구분선 위): 왼쪽(관련 정보) — 오른쪽(동작). 오른쪽은 footerAside */
  footer?: ReactNode;
  footerAside?: ReactNode;
  as?: ElementType;
  className?: string;
  'aria-label'?: string;
}

/**
 * 공통 카드: 헤더 · 본문 · 푸터 세 구역.
 * - 패딩 space-5, 구역 사이 space-3, 1px 안쪽 테두리, radius-lg
 * - 헤더/푸터는 한 줄에서 왼쪽(정보)·오른쪽(별점이나 동작)으로 나눔
 * - 푸터는 위에 구분선을 두어 본문과 묶음을 나눔
 */
export function Card({ header, headerAside, children, footer, footerAside, as: Tag = 'article', className, ...rest }: CardProps) {
  return (
    <Tag className={cn(styles.card, className)} {...rest}>
      {(header || headerAside) && (
        <header className={styles.header}>
          <div className={styles.lead}>{header}</div>
          {headerAside && <div className={styles.aside}>{headerAside}</div>}
        </header>
      )}
      {children != null && children !== false && <div className={styles.body}>{children}</div>}
      {(footer || footerAside) && (
        <footer className={styles.footer}>
          <div className={styles.lead}>{footer}</div>
          {footerAside && <div className={styles.aside}>{footerAside}</div>}
        </footer>
      )}
    </Tag>
  );
}
