import { useMemo } from 'react';
import { Link } from 'react-router';
import { useLibraryStore } from '@/store/libraryStore';
import { recentNotes } from '@/store/selectors';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { EmptyState, SectionHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import styles from './RecentNotes.module.scss';

export function RecentNotes() {
  const notes = useLibraryStore((s) => s.notes);
  const books = useLibraryStore((s) => s.books);
  const recent = useMemo(() => recentNotes(notes, 3), [notes]);

  return (
    <section aria-labelledby="notes-title">
      <SectionHeader
        id="notes-title"
        title="최근 기록"
        description="메모와 밑줄 그은 문장"
        more={notes.length > 0 ? { to: paths.notes, label: `${notes.length}개` } : undefined}
      />
      {recent.length === 0 ? (
        <div className={styles.empty}>
          <EmptyState
            compact
            title="아직 남긴 기록이 없어요"
            description="책 상세 화면에서 마음에 남은 문장이나 생각을 기록해 보세요."
          />
        </div>
      ) : (
        <ul role="list" className={styles.list}>
          {recent.map((note) => {
            const book = books[note.bookId];
            return (
              <li key={note.id}>
                <Link to={paths.noteEdit(note.bookId, note.id)} className={cn(styles.note, styles[note.kind])}>
                  <span className={styles.kind}>{note.kind === 'quote' ? '문장' : '메모'}</span>
                  <p className={styles.content}>{note.content}</p>
                  <p className={styles.source}>
                    <strong>{book?.title ?? '알 수 없는 책'}</strong>
                    {note.page !== undefined && <span>p.{note.page}</span>}
                    <span>{formatRelative(note.createdAt)}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
