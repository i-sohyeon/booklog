import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui';
import styles from './Page.module.scss';

/** 페이지 공통 컨테이너 (좌우 거터 + 최대폭) */
export function Page({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn(styles.page, narrow && styles.narrow, className)}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  /** 뒤로가기 버튼 노출 (하위 화면) */
  back?: boolean | string;
}

export function PageHeader({ title, description, eyebrow, actions, back }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={styles.header}>
      {back && (
        <IconButton
          label="뒤로가기"
          className={styles.back}
          onClick={() => (typeof back === 'string' ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <ArrowLeft />
        </IconButton>
      )}
      <div className={styles.headRow}>
        <div className={styles.headText}>
          {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
          <h1 className="t-title-1">{title}</h1>
          {description && <p className={styles.desc}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
