import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookCheck, BookMarked, BookOpen, ChevronRight, Globe, ListPlus, Lock, PenLine, Trash2 } from 'lucide-react';
import type { Book, LibraryEntry, ReadingStatus } from '@/types/book';
import { READING_STATUS_LABEL, RECORD_FIELD_LABEL } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { ratingSummary } from '@/store/selectors';
import { useAsync } from '@/hooks/useAsync';
import { useReviews } from '@/hooks/useSocial';
import { bookSearchService } from '@/services/bookSearch';
import { formatDate } from '@/lib/date';
import { paths } from '@/routes/paths';
import {
  Badge,
  BookCover,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingRegion,
  Sheet,
  Skeleton,
  StarRating,
  Tabs,
  useToast,
} from '@/components/ui';
import { RatingDistribution } from '@/components/book/RatingDistribution';
import { ReviewCard } from '@/components/social/ReviewCard';
import { AddToListSheet } from '@/components/social/ListSheets';
import { useRecord } from '@/components/record';
import { VisibilitySheet, publicFields } from '@/components/record/VisibilitySheet';
import { useBookCache } from '@/store/bookCache';
import { SourceCredit } from '@/components/book/SourceCredit';
import { knownGenre } from '@/lib/byline';
import { requireLogin } from '@/store/loginGate';
import { VideoRail } from '@/components/video/VideoRail';
import styles from './BookDetailPage.module.scss';

export function BookDetailPage() {
  const { bookId = '' } = useParams();
  const inLibrary = useLibraryStore((s) => s.books[bookId]);
  const seen = useBookCache((s) => s.books[bookId]);
  const cached = inLibrary ?? seen;
  const remote = useAsync(cached ? null : (signal) => bookSearchService.getById(bookId, { signal }), [bookId, Boolean(cached)]);
  const navigate = useNavigate();
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(paths.home));

  let content;
  if (cached) content = <BookDetail book={cached} />;
  else if (remote.status === 'loading' || remote.status === 'idle')
    content = (
      <LoadingRegion label="책 정보를 불러오는 중">
        <div className={styles.hero}>
          <Skeleton variant="cover" width={168} />
        </div>
      </LoadingRegion>
    );
  else if (remote.status === 'error') content = <ErrorState onRetry={remote.retry} />;
  else if (!remote.data)
    content = <EmptyState title="책을 찾을 수 없어요" description="삭제되었거나 잘못된 주소일 수 있어요." action={<ButtonLink to={paths.discover}>발견으로</ButtonLink>} />;
  else content = <BookDetail book={remote.data} />;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <IconButton label="뒤로가기" variant="solid" onClick={back}>
          <ArrowLeft />
        </IconButton>
      </div>
      {content}
    </div>
  );
}

type Sort = 'likes' | 'recent';

const STATUS_BUTTONS: Array<{ status: ReadingStatus; icon: typeof BookOpen }> = [
  { status: 'want', icon: BookMarked },
  { status: 'reading', icon: BookOpen },
  { status: 'done', icon: BookCheck },
];

/** 공개 상태 한 줄: 내용이 있는 항목 기준 */
function visibilityLabel(entry: LibraryEntry) {
  const on = publicFields(entry);
  if (on.length === 0) return '나만 보는 기록이에요';
  const names = on.map((f) => RECORD_FIELD_LABEL[f]);
  return names.length <= 2 ? `${names.join('·')} 공개 중` : `${names.slice(0, 2).join('·')} 외 ${names.length - 2}개 공개 중`;
}

function BookDetail({ book }: { book: Book }) {
  const entry = useLibraryStore((s) => s.entries[book.id]);
  const setStatus = useLibraryStore((s) => s.setStatus);
  const removeBook = useLibraryStore((s) => s.removeBook);
  const start = useRecord((s) => s.start);
  const showToast = useToast((s) => s.show);
  const allReviews = useReviews();
  const [sort, setSort] = useState<Sort>('likes');
  const [listOpen, setListOpen] = useState(false);
  const [visOpen, setVisOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const summary = ratingSummary(book.id, entry?.status === 'done' ? entry.rating : undefined);
  const reviews = useMemo(() => {
    const list = allReviews.filter((r) => r.bookId === book.id && !r.isMine);
    return sort === 'likes' ? list.sort((a, b) => b.likeCount - a.likeCount) : list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allReviews, book.id, sort]);

  const chooseStatus = (status: ReadingStatus) => {
    if (!requireLogin('서재에 담으려면 로그인해 주세요.')) return;
    if (status === 'done') return start({ book, step: 'finish' });
    if (entry?.status === status) {
      removeBook(book.id);
      showToast('서재에서 뺐어요');
      return;
    }
    setStatus(book, status);
    showToast(status === 'want' ? '읽고 싶은 책에 담았어요' : '읽는 중으로 표시했어요');
  };

  return (
    <>
      <section className={styles.hero} data-tone={book.coverTone}>
        <BookCover book={book} size="fluid" decorative={false} className={styles.cover} />
      </section>

      <div className={styles.body}>
        <header className={styles.head}>
          {knownGenre(book.genre) && <Badge tone="outline">{book.genre}</Badge>}
          <h1 className={styles.title}>{book.title}</h1>
          <p className={styles.byline}>
            {book.authors.join(', ')}
            {book.translators && ` · ${book.translators.join(', ')} 옮김`}
          </p>
          <p className={styles.pub}>
            {book.publisher} · {book.publishedAt.slice(0, 4)}
          </p>
        </header>

        {/* ---- 내 상태: 읽고 싶어요 / 읽는 중 / 다 읽었어요 ---- */}
        <div className={styles.statusRow} role="group" aria-label="내 독서 상태">
          {STATUS_BUTTONS.map(({ status, icon: Icon }) => {
            const active = entry?.status === status;
            return (
              <button key={status} type="button" className={styles.statusBtn} aria-pressed={active} onClick={() => chooseStatus(status)}>
                <Icon aria-hidden />
                {READING_STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>

        {entry?.status === 'done' && (
          <section className={styles.mine} aria-label="내 기록">
            <div className={styles.mineHead}>
              <span className={styles.mineLabel}>
                {entry.finishedAt ? `${formatDate(entry.finishedAt)} 완독` : '완독'}
                {entry.readCount && entry.readCount > 1 && <span className={styles.reread}>{entry.readCount}회독</span>}
              </span>
              <StarRating value={entry.rating} size="md" />
            </div>
            {entry.oneLiner ? <p className={styles.mineLine}>{entry.oneLiner}</p> : <p className={styles.muted}>한 줄 평을 남기지 않았어요.</p>}
            {entry.review && <p className={styles.mineReview}>{entry.review}</p>}
            {Boolean(entry.quotes?.length || entry.tags?.length) && (
              <p className={styles.mineMeta}>
                {entry.quotes?.length ? `기억하고 싶은 문장 ${entry.quotes.length}개` : null}
                {entry.quotes?.length && entry.tags?.length ? ' · ' : null}
                {entry.tags?.map((t) => `#${t}`).join(' ')}
              </p>
            )}
            <button type="button" className={styles.privacy} onClick={() => setVisOpen(true)} aria-haspopup="dialog">
              {publicFields(entry).length ? <Globe aria-hidden /> : <Lock aria-hidden />}
              <span>{visibilityLabel(entry)}</span>
              <span className={styles.privacyAction}>
                공개 설정
                <ChevronRight aria-hidden />
              </span>
            </button>
            <VisibilitySheet entry={entry} open={visOpen} onClose={() => setVisOpen(false)} />
            <div className={styles.mineActions}>
              <ButtonLink to={paths.recordEdit(book.id)} size="sm" variant="outline" leadingIcon={<PenLine aria-hidden />}>
                기록 자세히 쓰기
              </ButtonLink>
              <IconButton label="기록 삭제" size="sm" onClick={() => setConfirmRemove(true)}>
                <Trash2 />
              </IconButton>
            </div>
          </section>
        )}

        <button type="button" className={styles.textBtn} onClick={() => requireLogin('리스트에 담으려면 로그인해 주세요.') && setListOpen(true)}>
          <ListPlus aria-hidden /> 내 리스트에 담기
        </button>

        <section className={styles.section} aria-labelledby="about">
          <h2 id="about" className={styles.h2}>
            책 소개
          </h2>
          {book.description ? <p className={styles.desc}>{book.description}</p> : <p className={styles.muted}>등록된 소개가 없어요.</p>}
          {book.id.startsWith('isbn-') && (
            <SourceCredit
              href={book.sourceUrl ?? `https://search.daum.net/search?w=book&q=${encodeURIComponent(book.isbn ?? book.title)}`}
              label="도서 정보 제공: 카카오(Daum 책) · 자세히 보기"
            />
          )}
        </section>

        <section className={styles.section} aria-labelledby="videos">
          <h2 id="videos" className={styles.h2}>
            이 책을 다룬 영상
          </h2>
          <VideoRail query={`${book.title} ${book.authors[0] ?? ''} 책`.trim()} limit={6} emptyText="이 책을 다룬 영상을 찾지 못했어요." />
        </section>

        <section className={styles.section} aria-labelledby="ratings">
          <h2 id="ratings" className={styles.h2}>
            평점 <Badge tone="outline">샘플</Badge>
          </h2>
          {summary.count > 0 ? <RatingDistribution summary={summary} /> : <p className={styles.muted}>아직 평가가 없어요.</p>}
        </section>

        <section className={styles.section} aria-labelledby="reviews">
          <div className={styles.reviewsHead}>
            <h2 id="reviews" className={styles.h2}>
              후기 <span className={styles.count}>{reviews.length}</span>
            </h2>
            {reviews.length > 1 && (
              <Tabs<Sort>
                label="정렬"
                variant="pill"
                value={sort}
                onChange={setSort}
                controls="review-list"
                items={[
                  { value: 'likes', label: '공감순' },
                  { value: 'recent', label: '최신순' },
                ]}
              />
            )}
          </div>
          <div id="review-list" role="tabpanel" aria-label="후기 목록" className={styles.reviewList}>
            {reviews.length === 0 ? (
              <p className={styles.muted}>아직 후기가 없어요. 다 읽었다면 첫 한 줄 평을 남겨주세요.</p>
            ) : (
              reviews.map((r) => <ReviewCard key={r.id} review={r} showBook={false} variant="row" />)
            )}
          </div>
        </section>
      </div>

      <AddToListSheet book={listOpen ? book : null} onClose={() => setListOpen(false)} />
      <Sheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="기록을 삭제할까요?"
        description="별점·한 줄 평·문장 등 이 책의 기록이 모두 삭제되며 되돌릴 수 없어요."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeBook(book.id);
                setConfirmRemove(false);
                showToast('기록을 삭제했어요');
              }}
            >
              삭제
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </>
  );
}
