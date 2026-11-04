import { useId, useState } from 'react';
import type { Book, LibraryEntry } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { Button, Sheet, useToast } from '@/components/ui';
import styles from './ProgressSheet.module.scss';

interface ProgressSheetProps {
  target: { book: Book; entry: LibraryEntry } | null;
  onClose: () => void;
}

/** 현재 읽은 쪽수 기록 — 증가분은 오늘의 독서 기록(세션)으로 저장됩니다 */
export function ProgressSheet({ target, onClose }: ProgressSheetProps) {
  if (!target) return null;
  return <ProgressSheetInner key={target.book.id} target={target} onClose={onClose} />;
}

function ProgressSheetInner({ target, onClose }: { target: NonNullable<ProgressSheetProps['target']>; onClose: () => void }) {
  const updateProgress = useLibraryStore((s) => s.updateProgress);
  const setStatus = useLibraryStore((s) => s.setStatus);
  const showToast = useToast((s) => s.show);
  const [page, setPage] = useState(target.entry.currentPage);
  const [markDone, setMarkDone] = useState(true);
  const inputId = useId();
  const hintId = useId();

  const { book, entry } = target;
  const total = book.pageCount;
  const valid = Number.isFinite(page) && page >= 0 && page <= total;
  const delta = page - entry.currentPage;
  const reachedEnd = page === total;
  const pct = Math.round((Math.min(Math.max(page, 0), total) / total) * 100);

  const submit = () => {
    if (!valid) return;
    updateProgress(book.id, page);
    if (reachedEnd && markDone) {
      setStatus(book.id, 'done');
      showToast(`「${book.title}」 완독을 축하해요!`);
    } else {
      showToast(delta > 0 ? `오늘 ${delta}쪽을 읽었어요` : '진도를 수정했어요');
    }
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="오늘의 진도"
      description={`「${book.title}」`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!valid || (delta === 0 && !(reachedEnd && markDone && entry.status !== 'done'))}>
            저장
          </Button>
        </>
      }
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={inputId} className={styles.label}>
          지금 읽은 페이지
        </label>
        <div className={styles.pageRow}>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            max={total}
            value={Number.isNaN(page) ? '' : page}
            onChange={(e) => setPage(e.target.value === '' ? Number.NaN : Number(e.target.value))}
            aria-describedby={hintId}
            aria-invalid={!valid || undefined}
            className={styles.input}
          />
          <span className={styles.total}>/ {total}쪽</span>
          <span className={styles.pct}>{valid ? `${pct}%` : '—'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={total}
          value={valid ? page : entry.currentPage}
          onChange={(e) => setPage(Number(e.target.value))}
          aria-label="페이지 슬라이더"
          className={styles.range}
          style={{ ['--pct' as string]: `${pct}%` }}
        />
        <p id={hintId} className={valid ? styles.hint : styles.error}>
          {!valid
            ? `0에서 ${total} 사이의 숫자를 입력해 주세요.`
            : delta > 0
              ? `지난 기록보다 ${delta}쪽 더 읽었어요.`
              : delta < 0
                ? `지난 기록(${entry.currentPage}쪽)보다 앞으로 수정돼요.`
                : `마지막 기록: ${entry.currentPage}쪽`}
        </p>
        {reachedEnd && entry.status !== 'done' && (
          <label className={styles.check}>
            <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
            완독으로 표시하기
          </label>
        )}
      </form>
    </Sheet>
  );
}
