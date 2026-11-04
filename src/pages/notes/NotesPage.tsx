import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { NOTE_KIND_LABEL, VISIBILITY_LABEL, type NoteKind } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatRelative } from '@/lib/date';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { BookCover, ButtonLink, EmptyState, SearchField, Tabs } from '@/components/ui';
import styles from './NotesPage.module.scss';

type Filter = NoteKind | 'all';

/** 모든 메모 · 문장 모아보기 */
export function NotesPage() {
  const notes = useLibraryStore((s) => s.notes);
  const books = useLibraryStore((s) => s.books);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim().toLowerCase(), 200);

  const counts = useMemo(
    () => ({ all: notes.length, memo: notes.filter((n) => n.kind === 'memo').length, quote: notes.filter((n) => n.kind === 'quote').length }),
    [notes],
  );

  const items = useMemo(
    () =>
      [...notes]
        .filter((n) => filter === 'all' || n.kind === filter)
        .filter((n) => !q || n.content.toLowerCase().includes(q) || books[n.bookId]?.title.toLowerCase().includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes, books, filter, q],
  );

  return (
    <Page narrow>
      <PageHeader back eyebrow="Notes" title="나의 기록" description={`메모 ${counts.memo}개 · 문장 ${counts.quote}개`} />

      {notes.length === 0 ? (
        <EmptyState
          title="아직 남긴 기록이 없어요"
          description="책 상세 화면에서 메모나 인상 깊은 문장을 남길 수 있어요."
          action={<ButtonLink to={paths.library}>내 서재로</ButtonLink>}
        />
      ) : (
        <>
          <div className={styles.tools}>
            <Tabs
              label="기록 종류"
              variant="pill"
              value={filter}
              onChange={setFilter}
              controls="notes-panel"
              items={[
                { value: 'all', label: '전체', count: counts.all },
                { value: 'memo', label: '메모', count: counts.memo },
                { value: 'quote', label: '문장', count: counts.quote },
              ]}
            />
            <SearchField label="기록 검색" placeholder="내용이나 책 제목으로 찾기" value={query} onValueChange={setQuery} />
          </div>

          <div id="notes-panel" role="tabpanel" aria-label="기록 목록">
            {items.length === 0 ? (
              <EmptyState compact title="조건에 맞는 기록이 없어요" description="다른 검색어로 찾아보세요." />
            ) : (
              <ul role="list" className={styles.list}>
                {items.map((n) => {
                  const book = books[n.bookId];
                  return (
                    <li key={n.id}>
                      <Link to={paths.noteEdit(n.bookId, n.id)} className={cn(styles.card, n.kind === 'quote' && styles.quote)}>
                        <p className={styles.content}>{n.content}</p>
                        <div className={styles.meta}>
                          {book && <BookCover book={book} size="xs" className={styles.cover} />}
                          <span className={styles.book}>{book?.title ?? '삭제된 책'}</span>
                          <span className={styles.dim}>
                            {NOTE_KIND_LABEL[n.kind]}
                            {n.page !== undefined && ` · p.${n.page}`} · {VISIBILITY_LABEL[n.visibility]} · {formatRelative(n.createdAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
