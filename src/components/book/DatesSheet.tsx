import { useState } from 'react';
import type { LibraryEntry } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { toDateKey } from '@/lib/date';
import { Button, Sheet, TextField, useToast } from '@/components/ui';
import styles from './DatesSheet.module.scss';

/** 독서 시작일 · 완료일 수정 */
export function DatesSheet({ entry, onClose }: { entry: LibraryEntry | null; onClose: () => void }) {
  if (!entry) return null;
  return <DatesSheetInner key={entry.bookId} entry={entry} onClose={onClose} />;
}

function DatesSheetInner({ entry, onClose }: { entry: LibraryEntry; onClose: () => void }) {
  const setDates = useLibraryStore((s) => s.setDates);
  const showToast = useToast((s) => s.show);
  const [startedAt, setStartedAt] = useState(entry.startedAt ?? '');
  const [finishedAt, setFinishedAt] = useState(entry.finishedAt ?? '');
  const today = toDateKey(new Date());
  const showFinished = entry.status === 'done';

  const error =
    startedAt > today || finishedAt > today
      ? '미래 날짜는 선택할 수 없어요.'
      : showFinished && startedAt && finishedAt && finishedAt < startedAt
        ? '완독일은 시작일보다 빠를 수 없어요.'
        : showFinished && !finishedAt
          ? '완독일을 입력해 주세요.'
          : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      title="독서 기간"
      description="시작일과 완독일은 통계와 캘린더에 반영돼요."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={Boolean(error)}
            onClick={() => {
              setDates(entry.bookId, { startedAt: startedAt || undefined, ...(showFinished ? { finishedAt } : {}) });
              showToast('독서 기간을 수정했어요');
              onClose();
            }}
          >
            저장
          </Button>
        </>
      }
    >
      <div className={styles.grid}>
        <TextField label="시작일" type="date" max={today} value={startedAt} onChange={(e) => setStartedAt(e.target.value)} optional={!showFinished} />
        {showFinished && <TextField label="완독일" type="date" max={today} min={startedAt || undefined} value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Sheet>
  );
}
