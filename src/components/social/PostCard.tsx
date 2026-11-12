import { Link } from 'react-router';
import { MessageCircle } from 'lucide-react';
import type { PostView } from '@/hooks/useSocial';
import { useBookLookup, useMemberLookup } from '@/hooks/useSocial';
import { useSocialStore } from '@/store/socialStore';
import { POST_KIND_LABEL } from '@/types/social';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Avatar, BookCover, LikeButton, Spoiler } from '@/components/ui';
import { MemberLink } from '@/components/social/MemberLink';
import styles from './PostCard.module.scss';

export function PostCard({ post, linked = true }: { post: PostView; linked?: boolean }) {
  const member = useMemberLookup()(post.memberId);
  const findBook = useBookLookup();
  const book = post.bookId ? findBook(post.bookId) : undefined;
  const toggleLike = useSocialStore((s) => s.toggleLike);

  const content = (
    <>
      <header className={styles.head}>
        {linked ? (
          <>
            <Avatar name={member.nickname} tone={member.tone} size="sm" />
            <div className={styles.who}>
              <strong>{member.nickname}</strong>
              <span>
                {POST_KIND_LABEL[post.kind]} · {formatRelative(post.createdAt)}
              </span>
            </div>
          </>
        ) : (
          // 글 상세에서는 작성자를 눌러 친구 서재로 (목록에서는 카드 전체가 글 링크)
          <MemberLink id={post.memberId} className={styles.whoLink} label={`${member.nickname}님의 서재`}>
            <Avatar name={member.nickname} tone={member.tone} size="sm" />
            <span className={styles.who}>
              <strong>{member.nickname}</strong>
              <span>
                {POST_KIND_LABEL[post.kind]} · {formatRelative(post.createdAt)}
              </span>
            </span>
          </MemberLink>
        )}
      </header>
      <Spoiler active={post.spoiler}>
        {post.quote && (
          <blockquote className={styles.quote}>
            {post.quote}
          </blockquote>
        )}
        <p className={linked ? styles.bodyClamp : styles.body}>{post.body}</p>
      </Spoiler>
    </>
  );

  return (
    <article className={styles.card}>
      {linked ? (
        <Link to={paths.post(post.id)} className={styles.main}>
          {content}
        </Link>
      ) : (
        <div className={styles.main}>{content}</div>
      )}
      {book && (
        <Link to={paths.book(book.id)} className={styles.tag}>
          <BookCover book={book} size="xs" />
          <span>
            <strong>{book.title}</strong>
            {book.authors[0]}
          </span>
        </Link>
      )}
      <footer className={styles.foot}>
        <LikeButton liked={post.liked} count={post.likeCount} onToggle={() => toggleLike('post', post.id)} label={`${member.nickname}의 글`} />
        <span className={styles.comments}>
          <MessageCircle aria-hidden />
          {post.comments.length}
          <span className="sr-only">개의 댓글</span>
        </span>
      </footer>
    </article>
  );
}
