import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './LikeButton.module.scss';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  /** 스크린리더용: 무엇에 대한 공감인지 */
  label: string;
}

export function LikeButton({ liked, count, onToggle, label }: LikeButtonProps) {
  return (
    <button
      type="button"
      className={cn(styles.button, liked && styles.liked)}
      aria-pressed={liked}
      aria-label={`${label} 공감 ${count}개${liked ? ', 공감함' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      <Heart aria-hidden />
      <span>{count.toLocaleString()}</span>
    </button>
  );
}
