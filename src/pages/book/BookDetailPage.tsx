import { useId, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, NotebookPen, PenLine, Plus, Quote, Trash2 } from 'lucide-react';
import type { Book, ReadingStatus } from '@/types/book';
import { NOTE_KIND_LABEL, READING_STATUS_LABEL, VISIBILITY_LABEL } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useAsync } from '@/hooks/useAsync';
import { bookSearchService } from '@/services/bookSearch';
import { formatDate, formatRelative } from '@/lib/date';
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
  ProgressBar,
  Sheet,
  Skeleton,
  StarRating,
  useToast,
} from '@/components/ui';
import { AddToShelfSheet, DatesSheet, ProgressSheet, StatusPicker } from '@/components/book';
import { VisibilityIcon } from '@/components/editor/VisibilityField';
import styles from './BookDetailPage.module.scss';

export function BookDetailPage() {
  const { bookId = '' } = useParams();
  const cached = useLibraryStore((s) => s.books[bookId]);
  const remote = useAsync(cached ? null : (signal) => bookSearchService.getById(bookId, { signal }), [bookId, Boolean(cached)]);
  const navigate = useNavigate();

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(paths.home));

  let content;
  if (cached) content = <BookDetail book={cached} />;
  else if (remote.status === 'loading' || remote.status === 'idle') content = <DetailSkeleton />;
  else if (remote.status === 'error') content = <ErrorState onRetry={remote.retry} />;
  else if (!remote.data)
    content = (
      <EmptyState
        title="책을 찾을 수 없어요"
        description="삭제되었거나 잘못된 주소일 수 있어요."
        action={<ButtonLink to={paths.search}>도서 검색으로</ButtonLink>}
      />
    );
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

function DetailSkeleton() {
  return (
    <LoadingRegion label="책 정보를 불러오는 중">
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <Skeleton variant="cover" width={148} />
          <div className={styles.heroText}>
            <Skeleton variant="text" width="70%" height={28} />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

function BookDetail({ book }: { book: Book }) {
  const entry = useLibraryStore((s) => s.entries[book.id]);
  const allNotes = useLibraryStore((s) => s.notes);
  const setStatus = useLibraryStore((s) => s.setStatus);
  const setRating = useLibraryStore((s) => s.setRating);
  const removeBook = useLibraryStore((s) => s.removeBook);
  const showToast = useToast((s) => s.show);
  const notes = useMemo(
    () => allNotes.filter((n) => n.bookId === book.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allNotes, book.id],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const pickerName = useId();

  const pct = entry ? Math.round((entry.currentPage / book.pageCount) * 100) : 0;

  const changeStatus = (status: ReadingStatus) => {
    if (!entry || entry.status === status) return;
    setStatus(book.id, status);
    showToast(`${READING_STATUS_LABEL[status]} 상태로 바꿨어요`);
  };

  return (
    <>
      <section className={styles.hero} data-tone={book.coverTone}>
        <div className={styles.heroInner}>
          <BookCover book={book} size="fluid" decorative={false} className={styles.cover} />
          <div className={styles.heroText}>
            <Badge tone="outline">{book.genre}</Badge>
            <h1 className={styles.title}>{book.title}</h1>
            {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
            <p className={styles.byline}>
              {book.authors.join(', ')} 지음
              {book.translators && ` · ${book.translators.join(', ')} 옮김`}
            </p>
            <dl className={styles.facts}>
              <div>
                <dt>출판사</dt>
                <dd>{book.publisher}</dd>
              </div>
              <div>
                <dt>출간</dt>
                <dd>{book.publishedAt.replace('-', '.')}</dd>
              </div>
              <div>
                <dt>쪽수</dt>
                <dd>{book.pageCount}쪽</dd>
              </div>
            </dl>
            {!entry && (
              <Button className={styles.addBtn} leadingIcon={<Plus aria-hidden />} onClick={() => setAddOpen(true)}>
                서재에 담기
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className={styles.body}>
        {entry && (
          <section className={styles.card} aria-labelledby="my-reading">
            <div className={styles.cardHead}>
              <h2 id="my-reading" className={styles.h2}>
                나의 독서
              </h2>
              <IconButton label="서재에서 삭제" size="sm" onClick={() => setRemoveOpen(true)}>
                <Trash2 />
              </IconButton>
            </div>

            <StatusPicker name={pickerName} value={entry.status} onChange={changeStatus} layout="row" />

            {(entry.status === 'reading' || entry.status === 'paused') && (
              <div className={styles.progress}>
                <div className={styles.progressNums}>
                  <strong>{pct}%</strong>
                  <span>
                    {entry.currentPage} / {book.pageCount}쪽
                  </span>
                </div>
                <ProgressBar value={pct / 100} label="진행률" />
                <Button variant="secondary" block leadingIcon={<PenLine aria-hidden />} onClick={() => setProgressOpen(true)} className={styles.progressBtn}>
                  진도 기록하기
                </Button>
              </div>
            )}

            {entry.status === 'done' && (
              <div className={styles.rating}>
                <p className={styles.label}>나의 별점</p>
                <StarRating
                  value={entry.rating}
                  size="lg"
                  onChange={(v) => {
                    setRating(book.id, v);
                  }}
                />
                <p className={styles.ratingValue}>{entry.rating ? `${entry.rating.toFixed(1)}점` : '별을 눌러 평가해 보세요'}</p>
              </div>
            )}

            <div className={styles.datesRow}>
            <dl className={styles.dates}>
              <div>
                <dt>서재에 담은 날</dt>
                <dd>{formatDate(entry.addedAt)}</dd>
              </div>
              {entry.startedAt && (
                <div>
                  <dt>읽기 시작</dt>
                  <dd>{formatDate(entry.startedAt)}</dd>
                </div>
              )}
              {entry.finishedAt && (
                <div>
                  <dt>완독</dt>
                  <dd>{formatDate(entry.finishedAt)}</dd>
                </div>
              )}
            </dl>
            {(entry.startedAt || entry.status !== 'want') && (
              <Button variant="ghost" size="sm" leadingIcon={<CalendarDays aria-hidden />} onClick={() => setDatesOpen(true)}>
                기간 수정
              </Button>
            )}
            </div>
          </section>
        )}

        {entry && (
          <section aria-labelledby="review" className={styles.section}>
            <div className={styles.cardHead}>
              <h2 id="review" className={styles.h2}>
                나의 리뷰
              </h2>
              <ButtonLink to={paths.review(book.id)} size="sm" variant="ghost" leadingIcon={<PenLine aria-hidden />}>
                {entry.review ? '수정' : '쓰기'}
              </ButtonLink>
            </div>
            {entry.review ? (
              <Link to={paths.review(book.id)} className={styles.reviewCard}>
                {entry.rating ? <StarRating value={entry.rating} size="md" /> : null}
                <p>{entry.review}</p>
                <span className={styles.visibility}>
                  <VisibilityIcon value={entry.reviewVisibility ?? 'private'} /> {VISIBILITY_LABEL[entry.reviewVisibility ?? 'private']}
                </span>
              </Link>
            ) : (
              <p className={styles.muted}>
                {entry.status === 'done' ? '책을 덮은 뒤의 감상을 남겨보세요.' : '완독 후 감상을 남기거나, 지금까지의 생각을 먼저 적어둘 수 있어요.'}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="about" className={styles.section}>
          <h2 id="about" className={styles.h2}>
            책 소개
          </h2>
          <p className={styles.desc}>{book.description}</p>
        </section>

        {entry && (
          <section aria-labelledby="notes" className={styles.section}>
            <div className={styles.cardHead}>
              <h2 id="notes" className={styles.h2}>
                메모와 문장 <span className={styles.count}>{notes.length}</span>
              </h2>
            </div>
            <div className={styles.noteActions}>
              <ButtonLink to={paths.noteNew(book.id, 'memo')} variant="outline" size="sm" leadingIcon={<NotebookPen aria-hidden />}>
                메모 쓰기
              </ButtonLink>
              <ButtonLink to={paths.noteNew(book.id, 'quote')} variant="outline" size="sm" leadingIcon={<Quote aria-hidden />}>
                문장 담기
              </ButtonLink>
            </div>
            {notes.length === 0 ? (
              <p className={styles.muted}>아직 이 책에 남긴 메모나 문장이 없어요.</p>
            ) : (
              <ul role="list" className={styles.notes}>
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link to={paths.noteEdit(book.id, n.id)} className={n.kind === 'quote' ? styles.quote : undefined} aria-label={`${NOTE_KIND_LABEL[n.kind]} 수정: ${n.content.slice(0, 30)}`}>
                      <p>{n.content}</p>
                      <span>
                        {NOTE_KIND_LABEL[n.kind]}
                        {n.page !== undefined && ` · p.${n.page}`} · {VISIBILITY_LABEL[n.visibility]} · {formatRelative(n.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {!entry && <AddToShelfSheet book={addOpen ? book : null} onClose={() => setAddOpen(false)} />}
      <ProgressSheet target={progressOpen && entry ? { book, entry } : null} onClose={() => setProgressOpen(false)} />
      <DatesSheet entry={datesOpen && entry ? entry : null} onClose={() => setDatesOpen(false)} />
      <Sheet
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="서재에서 삭제할까요?"
        description="이 책의 진도와 메모가 함께 삭제되며 되돌릴 수 없어요."
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeBook(book.id);
                setRemoveOpen(false);
                showToast('서재에서 삭제했어요');
              }}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className={styles.muted}>「{book.title}」</p>
      </Sheet>
    </>
  );
}
