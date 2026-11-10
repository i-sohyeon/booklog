import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Send, Trash2 } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { useMemberLookup, usePosts } from '@/hooks/useSocial';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { Avatar, Button, ButtonLink, EmptyState, IconButton, Sheet, Spoiler, useToast } from '@/components/ui';
import { PostCard } from '@/components/social/PostCard';
import styles from './PostDetailPage.module.scss';

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const post = usePosts().find((p) => p.id === postId);
  const findMember = useMemberLookup();
  const addComment = useSocialStore((s) => s.addComment);
  const deletePost = useSocialStore((s) => s.deletePost);
  const showToast = useToast((s) => s.show);
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!post)
    return (
      <Page narrow>
        <EmptyState title="글을 찾을 수 없어요" description="삭제되었을 수 있어요." action={<ButtonLink to={paths.community}>커뮤니티로</ButtonLink>} />
      </Page>
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addComment(post.id, body, spoiler);
    setBody('');
    setSpoiler(false);
  };

  return (
    <Page narrow>
      <PageHeader
        back
        title="이야기"
        actions={
          post.isMine && (
            <IconButton label="글 삭제" onClick={() => setConfirm(true)}>
              <Trash2 />
            </IconButton>
          )
        }
      />
      <PostCard post={post} linked={false} />

      <section className={styles.comments} aria-labelledby="comments-title">
        <h2 id="comments-title" className={styles.h2}>
          댓글 {post.comments.length}
        </h2>
        {post.comments.length === 0 && <p className={styles.muted}>첫 댓글을 남겨보세요.</p>}
        <ul role="list">
          {post.comments.map((c) => {
            const m = findMember(c.memberId);
            return (
              <li key={c.id} className={styles.comment}>
                <Avatar name={m.nickname} tone={m.tone} size="sm" />
                <div>
                  <p className={styles.who}>
                    <strong>{m.nickname}</strong> {formatRelative(c.createdAt)}
                  </p>
                  <Spoiler active={c.spoiler}>
                    <p className={styles.body}>{c.body}</p>
                  </Spoiler>
                </div>
              </li>
            );
          })}
        </ul>
        <form className={styles.form} onSubmit={submit}>
          <label className="sr-only" htmlFor="comment-input">
            댓글
          </label>
          <textarea id="comment-input" rows={2} maxLength={500} placeholder="댓글을 남겨주세요" value={body} onChange={(e) => setBody(e.target.value)} className={styles.input} />
          <div className={styles.formRow}>
            <label className={styles.check}>
              <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
              스포일러 가리기
            </label>
            <Button type="submit" size="sm" disabled={!body.trim()} leadingIcon={<Send aria-hidden />}>
              등록
            </Button>
          </div>
        </form>
      </section>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="글을 삭제할까요?"
        description="댓글도 함께 삭제되며 되돌릴 수 없어요."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deletePost(post.id);
                showToast('글을 삭제했어요');
                navigate(paths.community, { replace: true });
              }}
            >
              삭제
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </Page>
  );
}
