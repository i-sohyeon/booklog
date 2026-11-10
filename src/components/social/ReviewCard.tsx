import { Link } from 'react-router';
import type { ReviewView } from '@/hooks/useSocial';
import { useBookLookup, useMemberLookup } from '@/hooks/useSocial';
import { useSocialStore } from '@/store/socialStore';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Avatar, BookCover, LikeButton, Spoiler, StarRating } from '@/components/ui';
import { cn } from '@/lib/cn';
import styles from './ReviewCard.module.scss';

interface ReviewCardProps {
  review: ReviewView;
  /** 책 정보(표지·제목) 함께 표시 */
  showBook?: boolean;
  variant?: 'card' | 'row';
}

/** 한 줄 평 카드: 프로필 · 별점 · 한 줄 평 · 공감 */
export function ReviewCard({ review, showBook = true, variant = 'card' }: ReviewCardProps) {
  const member = useMemberLookup()(review.memberId);
  const book = useBookLookup()(review.bookId);
  const toggleLike = useSocialStore((s) => s.toggleLike);

  return (
    <article className={cn(styles.card, styles[variant])}>
      <header className={styles.head}>
        <Avatar name={member.nickname} tone={member.tone} size="sm" />
        <div className={styles.who}>
          <strong>{member.nickname}</strong>
          <span>{formatRelative(review.createdAt)}</span>
        </div>
        <StarRating value={review.rating} size="sm" />
      </header>

      <Spoiler active={review.spoiler}>
        <p className={styles.line}>{review.oneLiner}</p>
      </Spoiler>

      <footer className={styles.foot}>
        {showBook && book ? (
          <Link to={paths.book(book.id)} className={styles.book}>
            <BookCover book={book} size="xs" />
            <span>{book.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {review.isMine ? (
          <span className={styles.mine}>내 후기</span>
        ) : (
          <LikeButton liked={review.liked} count={review.likeCount} onToggle={() => toggleLike('review', review.id)} label={`${member.nickname}의 후기`} />
        )}
      </footer>
    </article>
  );
}
