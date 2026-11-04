import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { NotebookPen, Quote, Trash2 } from 'lucide-react';
import type { NoteKind, Visibility } from '@/types/book';
import { NOTE_KIND_LABEL } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { paths } from '@/routes/paths';
import { Button, SegmentedControl, Sheet, TextArea, TextField, useToast } from '@/components/ui';
import { EditorShell } from '@/components/editor/EditorShell';
import { BookContext } from '@/components/editor/BookContext';
import { VisibilityField } from '@/components/editor/VisibilityField';
import { EditorUnavailable } from './EditorGate';
import { josa } from '@/lib/josa';

const MAX_LENGTH = 2000;

const PLACEHOLDER: Record<NoteKind, string> = {
  memo: '읽으며 떠오른 생각, 질문, 연결되는 기억을 자유롭게 적어보세요.',
  quote: '마음에 남은 문장을 그대로 옮겨 적어보세요.',
};

/** 메모 · 인상 깊은 문장 작성(new) / 수정(:noteId) */
export function NoteEditorPage() {
  const { bookId = '', noteId } = useParams();
  const book = useLibraryStore((s) => s.books[bookId]);
  const entry = useLibraryStore((s) => s.entries[bookId]);
  const note = useLibraryStore((s) => (noteId ? s.notes.find((n) => n.id === noteId) : undefined));

  if (!book || !entry) {
    return <EditorUnavailable bookId={book ? bookId : undefined} title="서재에 담은 책에만 기록할 수 있어요" description="먼저 책을 서재에 담아주세요." />;
  }
  if (noteId && (!note || note.bookId !== bookId)) {
    return <EditorUnavailable bookId={bookId} title="기록을 찾을 수 없어요" description="이미 삭제되었을 수 있어요." />;
  }
  return <NoteEditor key={noteId ?? 'new'} bookId={bookId} />;
}

function NoteEditor({ bookId }: { bookId: string }) {
  const { noteId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const book = useLibraryStore((s) => s.books[bookId])!;
  const entry = useLibraryStore((s) => s.entries[bookId])!;
  const existing = useLibraryStore((s) => (noteId ? s.notes.find((n) => n.id === noteId) : undefined));
  const addNote = useLibraryStore((s) => s.addNote);
  const updateNote = useLibraryStore((s) => s.updateNote);
  const deleteNote = useLibraryStore((s) => s.deleteNote);
  const showToast = useToast((s) => s.show);

  const initial = useMemo(
    () => ({
      kind: existing?.kind ?? (params.get('kind') === 'quote' ? 'quote' : 'memo') as NoteKind,
      content: existing?.content ?? '',
      page: existing?.page !== undefined ? String(existing.page) : entry.status === 'reading' && entry.currentPage > 0 ? String(entry.currentPage) : '',
      visibility: existing?.visibility ?? ('private' as Visibility),
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [kind, setKind] = useState<NoteKind>(initial.kind);
  const [content, setContent] = useState(initial.content);
  const [page, setPage] = useState(initial.page);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pageNum = page === '' ? undefined : Number(page);
  const pageError =
    pageNum !== undefined && (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > book.pageCount)
      ? `1에서 ${book.pageCount} 사이의 쪽수를 입력해 주세요.`
      : undefined;
  const contentError = touched && !content.trim() ? '내용을 입력해 주세요.' : undefined;

  const dirty =
    kind !== initial.kind || content !== initial.content || page !== initial.page || visibility !== initial.visibility;
  const canSubmit = content.trim().length > 0 && !pageError && (dirty || !existing);
  const { blocker, allow } = useUnsavedGuard(dirty);

  const location = useLocation();
  // 앱 안에서 들어왔으면 뒤로, 직접 진입(새 탭 등)이면 책 상세로
  const leave = () => (location.key !== 'default' ? navigate(-1) : navigate(paths.book(bookId), { replace: true }));

  const save = () => {
    setTouched(true);
    if (!canSubmit) return;
    const input = { kind, content, page: pageNum, visibility };
    if (existing) {
      updateNote(existing.id, input);
      showToast(`${NOTE_KIND_LABEL[kind]}${josa(NOTE_KIND_LABEL[kind], '을/를')} 수정했어요`);
    } else {
      addNote(bookId, input);
      showToast(`${NOTE_KIND_LABEL[kind]}${josa(NOTE_KIND_LABEL[kind], '을/를')} 남겼어요`);
    }
    allow();
    leave();
  };

  return (
    <EditorShell
      title={existing ? `${NOTE_KIND_LABEL[existing.kind]} 수정` : '새 기록'}
      onClose={leave}
      onSubmit={save}
      canSubmit={canSubmit}
      blocker={blocker}
      footer={
        existing && (
          <Button variant="danger" size="sm" leadingIcon={<Trash2 aria-hidden />} onClick={() => setConfirmDelete(true)}>
            이 기록 삭제
          </Button>
        )
      }
    >
      <BookContext book={book} />

      <SegmentedControl
        label="기록 종류"
        hideLabel
        value={kind}
        onChange={setKind}
        options={[
          { value: 'memo', label: '메모', icon: <NotebookPen aria-hidden /> },
          { value: 'quote', label: '인상 깊은 문장', icon: <Quote aria-hidden /> },
        ]}
      />

      <TextArea
        label={kind === 'quote' ? '문장' : '메모'}
        tone={kind === 'quote' ? 'serif' : 'sans'}
        placeholder={PLACEHOLDER[kind]}
        value={content}
        maxLength={MAX_LENGTH}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => setTouched(true)}
        error={contentError}
        autoFocus={!existing}
      />

      <TextField
        label="쪽수"
        optional
        type="number"
        inputMode="numeric"
        min={1}
        max={book.pageCount}
        placeholder={`1 – ${book.pageCount}`}
        suffix="쪽"
        value={page}
        onChange={(e) => setPage(e.target.value)}
        error={pageError}
        hint={kind === 'quote' ? '문장이 있는 쪽을 남겨두면 다시 찾기 쉬워요.' : undefined}
        fieldClassName="field-narrow"
      />

      <VisibilityField value={visibility} onChange={setVisibility} />

      {existing && (
        <Sheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="이 기록을 삭제할까요?"
          description="삭제한 기록은 되돌릴 수 없어요."
          footer={
            <>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteNote(existing.id);
                  showToast('기록을 삭제했어요');
                  allow();
                  leave();
                }}
              >
                삭제
              </Button>
            </>
          }
        >
          {null}
        </Sheet>
      )}
    </EditorShell>
  );
}
