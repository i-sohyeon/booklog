import { useId, useState } from 'react';
import type { Book, ReadingStatus } from '@/types/book';
import { READING_STATUS_LABEL } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { Button, Sheet, useToast } from '@/components/ui';
import { StatusPicker } from './StatusPicker';
import { josa } from '@/lib/josa';

interface AddToShelfSheetProps {
  book: Book | null;
  onClose: () => void;
}

/** 서재에 책 담기 — 상태를 고른 뒤 저장 */
export function AddToShelfSheet({ book, onClose }: AddToShelfSheetProps) {
  if (!book) return null;
  return <AddToShelfSheetInner key={book.id} book={book} onClose={onClose} />;
}

function AddToShelfSheetInner({ book, onClose }: { book: Book; onClose: () => void }) {
  const addBook = useLibraryStore((s) => s.addBook);
  const showToast = useToast((s) => s.show);
  const [status, setStatus] = useState<ReadingStatus>('want');
  const name = useId();

  const submit = () => {
    addBook(book, status);
    showToast(`「${book.title}」${josa(book.title, '을/를')} ${READING_STATUS_LABEL[status]} 책으로 담았어요`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="서재에 담기"
      description={`「${book.title}」 · ${book.authors.join(', ')}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit}>담기</Button>
        </>
      }
    >
      <StatusPicker name={name} value={status} onChange={setStatus} />
    </Sheet>
  );
}
