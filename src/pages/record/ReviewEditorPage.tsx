import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { Visibility } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { paths } from '@/routes/paths';
import { StarRating, TextArea, useToast } from '@/components/ui';
import { EditorShell } from '@/components/editor/EditorShell';
import { BookContext } from '@/components/editor/BookContext';
import { VisibilityField } from '@/components/editor/VisibilityField';
import { EditorUnavailable } from './EditorGate';
import styles from './ReviewEditorPage.module.scss';

const MAX_LENGTH = 3000;
const RATING_WORDS: Record<number, string> = {
  0.5: '아쉬워요',
  1: '별로예요',
  1.5: '조금 아쉬워요',
  2: '그저 그래요',
  2.5: '보통이에요',
  3: '괜찮아요',
  3.5: '좋았어요',
  4: '아주 좋았어요',
  4.5: '인생책에 가까워요',
  5: '인생책이에요',
};

export function ReviewEditorPage() {
  const { bookId = '' } = useParams();
  const book = useLibraryStore((s) => s.books[bookId]);
  const entry = useLibraryStore((s) => s.entries[bookId]);
  if (!book || !entry) {
    return <EditorUnavailable bookId={book ? bookId : undefined} title="서재에 담은 책에만 리뷰를 쓸 수 있어요" description="먼저 책을 서재에 담아주세요." />;
  }
  return <ReviewEditor bookId={bookId} />;
}

function ReviewEditor({ bookId }: { bookId: string }) {
  const navigate = useNavigate();
  const book = useLibraryStore((s) => s.books[bookId])!;
  const entry = useLibraryStore((s) => s.entries[bookId])!;
  const saveReview = useLibraryStore((s) => s.saveReview);
  const showToast = useToast((s) => s.show);

  const initial = useMemo(
    () => ({ rating: entry.rating, review: entry.review ?? '', visibility: entry.reviewVisibility ?? ('private' as Visibility) }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [rating, setRating] = useState<number | undefined>(initial.rating);
  const [review, setReview] = useState(initial.review);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);

  const dirty = rating !== initial.rating || review !== initial.review || visibility !== initial.visibility;
  const canSubmit = dirty && (rating !== undefined || review.trim().length > 0 || initial.rating !== undefined || initial.review !== '');
  const { blocker, allow } = useUnsavedGuard(dirty);
  const location = useLocation();
  // 앱 안에서 들어왔으면 뒤로, 직접 진입(새 탭 등)이면 책 상세로
  const leave = () => (location.key !== 'default' ? navigate(-1) : navigate(paths.book(bookId), { replace: true }));

  return (
    <EditorShell
      title={initial.review || initial.rating ? '리뷰 수정' : '리뷰 쓰기'}
      onClose={leave}
      onSubmit={() => {
        saveReview(bookId, { rating, review, visibility });
        showToast('리뷰를 저장했어요');
        allow();
        leave();
      }}
      canSubmit={canSubmit}
      blocker={blocker}
    >
      <BookContext book={book} />

      <section className={styles.rating} aria-label="별점">
        <p className={styles.question}>이 책, 어떠셨어요?</p>
        <StarRating value={rating} size="lg" onChange={setRating} />
        <p className={styles.word} aria-live="polite">
          {rating ? `${rating.toFixed(1)} · ${RATING_WORDS[rating] ?? ''}` : '별을 눌러 평가해 주세요 (반 개 단위)'}
        </p>
      </section>

      <TextArea
        label="리뷰"
        optional
        placeholder={entry.status === 'done' ? '책을 덮고 난 뒤의 감상을 남겨보세요.' : '지금까지 읽은 감상을 남겨보세요. 완독 후 고쳐 써도 좋아요.'}
        value={review}
        maxLength={MAX_LENGTH}
        onChange={(e) => setReview(e.target.value)}
        tone="serif"
      />

      <VisibilityField value={visibility} onChange={setVisibility} />
    </EditorShell>
  );
}
