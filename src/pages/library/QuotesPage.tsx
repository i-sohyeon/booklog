import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PenLine } from 'lucide-react';
import type { Book, Quote } from '@/types/book';
import { useShelf } from '@/hooks/useShelf';
import { formatDate } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { BookCover, ButtonLink, EmptyState, Tabs } from '@/components/ui';
import { byline } from '@/lib/byline';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { Quote as QuoteIcon } from 'lucide-react';
import styles from './QuotesPage.module.scss';

interface QuoteItem {
  quote: Quote;
  book: Book;
}

/** 문장 모아보기 — 저장한 문장만 카드로 */
function QuotesPageInner() {
  const shelf = useShelf();
  const [bookId, setBookId] = useState<string>('all');
  const all = useMemo<QuoteItem[]>(
    () =>
      shelf
        .flatMap(({ book, entry }) => (entry.quotes ?? []).map((quote) => ({ quote, book })))
        .sort((a, b) => b.quote.createdAt.localeCompare(a.quote.createdAt)),
    [shelf],
  );
  const books = useMemo(() => [...new Map(all.map((q) => [q.book.id, q.book])).values()], [all]);
  const items = bookId === 'all' ? all : all.filter((q) => q.book.id === bookId);

  return (
    <Page narrow>
      <PageHeader title="문장 모아보기" description={`기억하고 싶은 문장 ${all.length}개`} back={paths.library} />
      {all.length === 0 ? (
        <EmptyState
          title="아직 저장한 문장이 없어요"
          description="책 기록을 자세히 쓸 때 마음에 남은 문장을 텍스트나 사진으로 남겨보세요."
          action={<ButtonLink to={paths.library}>서재로</ButtonLink>}
        />
      ) : (
        <>
          {books.length > 1 && (
            <Tabs<string>
              label="책별로 보기"
              variant="pill"
              bleed
              value={bookId}
              onChange={setBookId}
              controls="quote-list"
              items={[{ value: 'all', label: '전체' }, ...books.map((b) => ({ value: b.id, label: b.title }))]}
            />
          )}
          <ul role="list" id="quote-list" className={styles.list}>
            {items.map(({ quote, book }) => (
              <li key={quote.id} className={styles.card}>
                {quote.image && <img src={quote.image} alt={`「${book.title}」에서 사진으로 남긴 문장`} className={styles.image} />}
                {quote.text && (quote.image ? <p className={styles.memo}>{quote.text}</p> : <blockquote className={styles.text}>{quote.text}</blockquote>)}
                <footer className={styles.foot}>
                  <Link to={paths.book(book.id)} className={styles.book}>
                    <BookCover book={book} size="xs" />
                    <span>
                      <strong>{book.title}</strong>
                      <span>{byline(book)}</span>
                    </span>
                  </Link>
                  <Link to={paths.recordEdit(book.id)} className={styles.edit} aria-label={`「${book.title}」 기록 고치기`}>
                    <PenLine aria-hidden />
                  </Link>
                </footer>
                <p className={styles.date}>{formatDate(quote.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}

/** 로그인하지 않았으면 로그인 안내, 했으면 본 화면 */
export function QuotesPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<QuoteIcon aria-hidden />} title="문장 모아보기는 로그인 후에 볼 수 있어요" description="책에서 기억하고 싶은 문장을 남기면 여기에 모여요." />
      </Page>
    );
  return <QuotesPageInner />;
}
