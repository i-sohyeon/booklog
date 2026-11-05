import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, BookCheck, BookMarked, BookOpen, ChevronRight } from 'lucide-react';
import type { Book, ReadingStatus } from '@/types/book';
import { ONE_LINER_MAX, READING_STATUS_LABEL } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useShelf } from '@/hooks/useShelf';
import { searchCatalogSync } from '@/services/bookSearch';
import { toDateKey } from '@/lib/date';
import { josa } from '@/lib/josa';
import { paths } from '@/routes/paths';
import { BookCover, Button, IconButton, SearchField, Sheet, StarRating, TextField, useToast } from '@/components/ui';
import { useRecord } from './recordStore';
import styles from './RecordSheet.module.scss';

/** 화면 어디서든 열리는 기록 시트: 책 검색 → 상태 → (다 읽었으면) 별점·한 줄 평·완독일 → 서재에 저장 */
export function RecordSheet() {
  const { open, book, step, setBook, setStep, close } = useRecord();
  if (!open) return null;

  const title = step === 'pick' ? '어떤 책을 기록할까요?' : step === 'status' ? '이 책은 지금' : '다 읽은 책 기록';
  return (
    <Sheet open onClose={close} title={title} description={book && step !== 'pick' ? `「${book.title}」 · ${book.authors.join(', ')}` : undefined}>
      {step !== 'pick' && (
        <IconButton label="이전 단계" size="sm" className={styles.back} onClick={() => setStep(step === 'finish' && book ? 'status' : 'pick')}>
          <ArrowLeft />
        </IconButton>
      )}
      {step === 'pick' && <PickStep onPick={setBook} />}
      {step === 'status' && book && <StatusStep key={book.id} book={book} onDone={() => setStep('finish')} onClose={close} />}
      {step === 'finish' && book && <FinishStep key={book.id} book={book} onClose={close} />}
    </Sheet>
  );
}

function PickStep({ onPick }: { onPick: (b: Book) => void }) {
  const [q, setQ] = useState('');
  const shelf = useShelf();
  const results = useMemo(() => searchCatalogSync(q), [q]);
  const reading = shelf.filter((i) => i.entry.status === 'reading').map((i) => i.book);
  const list = q.trim() ? results : reading;

  return (
    <div className={styles.pick}>
      <SearchField label="책 검색" placeholder="제목, 저자로 찾기" value={q} onValueChange={setQ} autoFocus />
      {!q.trim() && reading.length > 0 && <p className={styles.hint}>읽는 중인 책</p>}
      {q.trim() && results.length === 0 && <p className={styles.hint}>‘{q}’에 맞는 책이 없어요. (샘플 도서 {SAMPLE_CATALOG.length}권 안에서 검색돼요)</p>}
      {!q.trim() && reading.length === 0 && <p className={styles.hint}>읽은 책이나 읽고 싶은 책을 검색해 보세요.</p>}
      <ul role="list" className={styles.results}>
        {list.map((b) => (
          <li key={b.id}>
            <button type="button" className={styles.result} onClick={() => onPick(b)}>
              <BookCover book={b} size="xs" />
              <span className={styles.resultText}>
                <strong>{b.title}</strong>
                <span>{b.authors.join(', ')}</span>
              </span>
              <ChevronRight aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_META: Record<ReadingStatus, { icon: typeof BookOpen; hint: string }> = {
  want: { icon: BookMarked, hint: '나중에 읽을 책으로 담아둬요' },
  reading: { icon: BookOpen, hint: '진도는 기록하지 않아요' },
  done: { icon: BookCheck, hint: '별점과 한 줄 평을 남겨요' },
};

function StatusStep({ book, onDone, onClose }: { book: Book; onDone: () => void; onClose: () => void }) {
  const entry = useLibraryStore((s) => s.entries[book.id]);
  const setStatus = useLibraryStore((s) => s.setStatus);
  const showToast = useToast((s) => s.show);

  const choose = (status: ReadingStatus) => {
    if (status === 'done') return onDone();
    setStatus(book, status);
    showToast(`「${book.title}」${josa(book.title, '을/를')} ${READING_STATUS_LABEL[status]} 책으로 담았어요`);
    onClose();
  };

  return (
    <div className={styles.statusGrid}>
      <div className={styles.bookHero}>
        <BookCover book={book} size="lg" />
      </div>
      {(['done', 'reading', 'want'] as ReadingStatus[]).map((s) => {
        const { icon: Icon, hint } = STATUS_META[s];
        return (
          <button key={s} type="button" className={styles.status} aria-pressed={entry?.status === s} onClick={() => choose(s)}>
            <Icon aria-hidden />
            <span>
              <strong>{READING_STATUS_LABEL[s]}</strong>
              <em>{hint}</em>
            </span>
            {entry?.status === s && <span className={styles.current}>현재</span>}
          </button>
        );
      })}
    </div>
  );
}

function FinishStep({ book, onClose }: { book: Book; onClose: () => void }) {
  const entry = useLibraryStore((s) => s.entries[book.id]);
  const saveFinished = useLibraryStore((s) => s.saveFinished);
  const showToast = useToast((s) => s.show);
  const navigate = useNavigate();
  const today = toDateKey(new Date());

  const [rating, setRating] = useState<number | undefined>(entry?.rating);
  const [oneLiner, setOneLiner] = useState(entry?.oneLiner ?? '');
  const [finishedAt, setFinishedAt] = useState(entry?.finishedAt ?? today);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    rating: rating ? undefined : '별점을 골라주세요.',
    date: !finishedAt ? '완독일을 입력해 주세요.' : finishedAt > today ? '미래 날짜는 고를 수 없어요.' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const save = (more = false) => {
    setSubmitted(true);
    if (!valid || !rating) return;
    saveFinished(book, { rating, oneLiner, finishedAt, spoiler: entry?.spoiler });
    showToast(entry?.status === 'done' ? '기록을 고쳤어요' : `「${book.title}」${josa(book.title, '을/를')} 서재에 기록했어요`);
    onClose();
    if (more) navigate(paths.recordEdit(book.id));
  };

  return (
    <form
      className={styles.finish}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      <div className={styles.rating}>
        <StarRating value={rating} size="lg" onChange={setRating} />
        <p className={submitted && errors.rating ? styles.error : styles.ratingHint}>
          {rating ? `${rating.toFixed(1)}점` : submitted && errors.rating ? errors.rating : '별을 눌러주세요 (반 개 단위)'}
        </p>
      </div>

      <TextField
        label="한 줄 평"
        optional
        placeholder="이 책을 한 문장으로 남긴다면?"
        maxLength={ONE_LINER_MAX}
        value={oneLiner}
        onChange={(e) => setOneLiner(e.target.value)}
        hint={`${oneLiner.length}/${ONE_LINER_MAX}`}
      />

      <TextField label="완독일" type="date" max={today} value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} error={errors.date} fieldClassName="field-narrow" />

      <div className={styles.saveRow}>
        <Button type="submit" size="lg" block>
          {entry?.status === 'done' ? '고치기' : '서재에 저장'}
        </Button>
        <Button type="button" variant="ghost" block onClick={() => save(true)}>
          저장하고 자세히 쓰기 (감상·문장·태그)
        </Button>
      </div>
    </form>
  );
}
