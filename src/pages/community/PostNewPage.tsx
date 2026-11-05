import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { Book } from '@/types/book';
import type { PostKind } from '@/types/social';
import { POST_KIND_LABEL } from '@/types/social';
import { useSocialStore } from '@/store/socialStore';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { paths } from '@/routes/paths';
import { Button, IconButton, SegmentedControl, Sheet, TextArea, useToast } from '@/components/ui';
import { BookPicker } from '@/components/common/BookPicker';
import styles from './PostNewPage.module.scss';

export function PostNewPage() {
  const navigate = useNavigate();
  const addPost = useSocialStore((s) => s.addPost);
  const showToast = useToast((s) => s.show);
  const [kind, setKind] = useState<PostKind>('free');
  const [body, setBody] = useState('');
  const [quote, setQuote] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [spoiler, setSpoiler] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dirty = Boolean(body || quote || book);
  const { blocker, allow } = useUnsavedGuard(dirty);

  const errors = {
    body: !body.trim() ? (kind === 'quote' ? '문장에 대한 생각을 한 줄 남겨주세요.' : '내용을 입력해 주세요.') : undefined,
    quote: kind === 'quote' && !quote.trim() ? '공유할 문장을 입력해 주세요.' : undefined,
    book: kind === 'quote' && !book ? '어떤 책의 문장인지 골라주세요.' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    const id = addPost({
      kind,
      body,
      quote: kind === 'quote' ? quote : undefined,
      bookId: book?.id,
      spoiler,
    });
    showToast('글을 올렸어요');
    allow();
    navigate(paths.post(id), { replace: true });
  };

  return (
    <form
      className={styles.shell}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <header className={styles.bar}>
        <IconButton label="닫기" onClick={() => navigate(-1)}>
          <X />
        </IconButton>
        <h1 className={styles.title}>글쓰기</h1>
        <Button type="submit" size="sm">
          올리기
        </Button>
      </header>

      <div className={styles.body}>
        <SegmentedControl<PostKind>
          label="글 종류"
          hideLabel
          value={kind}
          onChange={setKind}
          options={(Object.keys(POST_KIND_LABEL) as PostKind[]).map((k) => ({ value: k, label: POST_KIND_LABEL[k] }))}
        />

        {kind === 'quote' && (
          <>
            <TextArea label="문장" placeholder="마음에 남은 문장을 그대로 옮겨 적어주세요" maxLength={500} value={quote} onChange={(e) => setQuote(e.target.value)} error={submitted ? errors.quote : undefined} />
          </>
        )}

        <TextArea
          label={kind === 'quote' ? '나의 생각' : '내용'}
          placeholder={kind === 'request' ? '어떤 책을 찾고 있나요? 좋아했던 책을 함께 적으면 추천받기 쉬워요.' : '자유롭게 이야기해 주세요'}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={submitted ? errors.body : undefined}
        />

        <BookPicker label="책 태그" optional={kind !== 'quote'} value={book} onChange={setBook} />
        {submitted && errors.book && (
          <p className={styles.error} role="alert">
            {errors.book}
          </p>
        )}

        <label className={styles.check}>
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
          스포일러가 있어요 (내용을 가려서 보여줘요)
        </label>
      </div>

      <Sheet
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="작성을 그만둘까요?"
        description="작성 중인 내용은 사라져요."
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              계속 쓰기
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              나가기
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </form>
  );
}
