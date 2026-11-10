import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Plus } from 'lucide-react';
import type { Book } from '@/types/book';
import { useSocialStore } from '@/store/socialStore';
import { paths } from '@/routes/paths';
import { Button, Sheet, TextField, useToast } from '@/components/ui';
import styles from './ListSheets.module.scss';

/** 새 큐레이션 리스트 만들기 */
export function CreateListSheet({ open, onClose, initialBook }: { open: boolean; onClose: () => void; initialBook?: Book }) {
  if (!open) return null;
  return <CreateListInner onClose={onClose} initialBook={initialBook} />;
}

function CreateListInner({ onClose, initialBook }: { onClose: () => void; initialBook?: Book }) {
  const createList = useSocialStore((s) => s.createList);
  const showToast = useToast((s) => s.show);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const error = !title.trim() ? '리스트 이름을 입력해 주세요.' : undefined;

  const submit = () => {
    setSubmitted(true);
    if (error) return;
    const id = createList(title, desc, initialBook ? [initialBook.id] : []);
    showToast('리스트를 만들었어요');
    onClose();
    if (!initialBook) navigate(paths.list(id));
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="새 리스트"
      description={initialBook ? `「${initialBook.title}」로 시작하는 리스트` : '좋아하는 책을 주제별로 모아보세요'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit}>만들기</Button>
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
        <TextField label="리스트 이름" placeholder="예: 비 오는 날 읽기 좋은 소설" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} error={submitted ? error : undefined} autoFocus />
        <TextField label="소개" optional maxLength={80} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </form>
    </Sheet>
  );
}

/** 책을 내 리스트에 담기 / 빼기 */
export function AddToListSheet({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const myLists = useSocialStore((s) => s.myLists);
  const toggle = useSocialStore((s) => s.toggleBookInList);
  const [creating, setCreating] = useState(false);
  if (!book) return null;
  if (creating) return <CreateListSheet open onClose={onClose} initialBook={book} />;

  return (
    <Sheet open onClose={onClose} title="내 리스트에 담기" description={`「${book.title}」`}>
      <ul role="list" className={styles.lists}>
        {myLists.map((l) => {
          const has = l.bookIds.includes(book.id);
          return (
            <li key={l.id}>
              <button type="button" className={styles.listBtn} aria-pressed={has} onClick={() => toggle(l.id, book.id)}>
                <span>
                  <strong>{l.title}</strong>
                  <em>{l.bookIds.length}권</em>
                </span>
                {has && <Check aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" block leadingIcon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
        새 리스트 만들기
      </Button>
    </Sheet>
  );
}
