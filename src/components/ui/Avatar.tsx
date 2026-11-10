import type { AvatarTone } from '@/types/social';
import { cn } from '@/lib/cn';
import styles from './Avatar.module.scss';

interface AvatarProps {
  name: string;
  src?: string;
  tone?: AvatarTone;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, tone = 'plum', size = 'md', className }: AvatarProps) {
  return (
    <span className={cn(styles.avatar, styles[size], className)} data-tone={tone} aria-hidden>
      {src ? <img src={src} alt="" /> : name.slice(0, 1)}
    </span>
  );
}
