import { cn } from '@/lib/cn';
import styles from './Avatar.module.scss';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <span className={cn(styles.avatar, styles[size], className)} aria-hidden>
      {src ? <img src={src} alt="" /> : name.slice(0, 1)}
    </span>
  );
}
