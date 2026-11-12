import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useCloudStore } from '@/store/cloudStore';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/cn';
import styles from './MemberLink.module.scss';

/** 가입한 사용자면 친구 서재로 가는 링크, 샘플 사용자면 그냥 텍스트 */
export function MemberLink({ id, children, className, label }: { id: string; children: ReactNode; className?: string; label?: string }) {
  const isReal = useCloudStore((s) => Boolean(s.profiles[id]));
  if (!isReal) return <span className={cn(styles.plain, className)}>{children}</span>;
  return (
    <Link to={paths.user(id)} className={cn(styles.link, className)} aria-label={label}>
      {children}
    </Link>
  );
}
