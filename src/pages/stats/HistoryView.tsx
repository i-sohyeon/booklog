import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BookCheck, BookOpen, BookPlus, NotebookPen, Quote, type LucideIcon } from 'lucide-react';
import { josa } from '@/lib/josa';
import { useLibraryStore } from '@/store/libraryStore';
import { activityHistory, type ActivityKind } from '@/store/stats';
import type { ShelfItem } from '@/store/selectors';
import { formatDate } from '@/lib/date';
import { paths } from '@/routes/paths';
import { BookCover, Button, EmptyState } from '@/components/ui';
import styles from './HistoryView.module.scss';

const META: Record<ActivityKind, { icon: LucideIcon; text: string }> = {
  added: { icon: BookPlus, text: '서재에 담았어요' },
  started: { icon: BookOpen, text: '읽기 시작했어요' },
  finished: { icon: BookCheck, text: '완독했어요' },
  memo: { icon: NotebookPen, text: '메모를 남겼어요' },
  quote: { icon: Quote, text: '문장을 담았어요' },
};

const PAGE = 20;

/** 독서 활동 히스토리 — 월별 타임라인 */
export function HistoryView({ shelf }: { shelf: ShelfItem[] }) {
  const notes = useLibraryStore((s) => s.notes);
  const events = useMemo(() => activityHistory(shelf, notes), [shelf, notes]);
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events.slice(0, limit)) {
      const key = e.at.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()];
  }, [events, limit]);

  if (events.length === 0) return <EmptyState title="아직 활동이 없어요" description="책을 담고 기록하면 활동이 차곡차곡 쌓여요." />;

  return (
    <div className={styles.wrap}>
      {groups.map(([month, items]) => (
        <section key={month} aria-labelledby={`h-${month}`}>
          <h2 id={`h-${month}`} className={styles.month}>
            {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
          </h2>
          <ol className={styles.timeline}>
            {items.map((e) => {
              const { icon: Icon, text } = META[e.kind];
              const to = e.kind === 'memo' || e.kind === 'quote' ? paths.noteEdit(e.item.book.id, e.id) : paths.book(e.item.book.id);
              return (
                <li key={e.id} className={styles.event} data-kind={e.kind}>
                  <span className={styles.dot} aria-hidden>
                    <Icon />
                  </span>
                  <Link to={to} className={styles.body}>
                    <span className={styles.line}>
                      <strong>{e.item.book.title}</strong>
                      {e.kind === 'finished' ? `${josa(e.item.book.title, '을/를')} ` : ' · '}
                      {text}
                      {e.kind === 'finished' && e.detail && <em>{e.detail}</em>}
                    </span>
                    {(e.kind === 'memo' || e.kind === 'quote') && e.detail && <span className={styles.excerpt}>{e.detail}</span>}
                    <time className={styles.time} dateTime={e.at}>
                      {formatDate(e.at.slice(0, 10))}
                    </time>
                  </Link>
                  <BookCover book={e.item.book} size="xs" className={styles.cover} />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {limit < events.length && (
        <Button variant="outline" block onClick={() => setLimit((l) => l + PAGE)}>
          이전 활동 더 보기 ({events.length - limit}개)
        </Button>
      )}
    </div>
  );
}
