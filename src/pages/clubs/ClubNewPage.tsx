import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { Book } from '@/types/book';
import { useSocialStore } from '@/store/socialStore';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { toDateKey } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Button, IconButton, SegmentedControl, Sheet, TextArea, TextField, useToast } from '@/components/ui';
import { BookPicker } from '@/components/common/BookPicker';
import styles from './ClubNewPage.module.scss';

interface SessionDraft {
  range: string;
  date: string;
  time: string;
}

const defaultDate = (offsetWeeks: number) => {
  const d = new Date();
  d.setDate(d.getDate() + 7 * (offsetWeeks + 1));
  return toDateKey(d);
};

export function ClubNewPage() {
  const navigate = useNavigate();
  const createClub = useSocialStore((s) => s.createClub);
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [duration, setDuration] = useState<'45' | '60' | '90'>('60');
  const [sessions, setSessions] = useState<SessionDraft[]>([{ range: '', date: defaultDate(0), time: '21:00' }]);
  const [submitted, setSubmitted] = useState(false);

  const dirty = Boolean(name || book || description || sessions.some((s) => s.range));
  const { blocker, allow } = useUnsavedGuard(dirty);
  const today = toDateKey(new Date());

  const errors = {
    name: !name.trim() ? '모임 이름을 입력해 주세요.' : undefined,
    book: !book ? '함께 읽을 책을 골라주세요.' : undefined,
    sessions: sessions.some((s) => !s.range.trim() || !s.date || !s.time)
      ? '모든 회차의 읽을 범위와 날짜·시간을 입력해 주세요.'
      : sessions.some((s) => s.date < today)
        ? '지난 날짜는 고를 수 없어요.'
        : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const update = (i: number, patch: Partial<SessionDraft>) => setSessions((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const submit = () => {
    setSubmitted(true);
    if (!valid || !book) return;
    const id = createClub({
      name,
      bookId: book.id,
      description,
      capacity,
      durationMin: Number(duration),
      sessions: sessions.map((s) => ({ range: s.range, startsAt: new Date(`${s.date}T${s.time}`).toISOString() })),
    });
    showToast('모임을 만들었어요');
    allow();
    navigate(paths.club(id), { replace: true });
  };

  return (
    <form
      className={styles.shell}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <header className={styles.bar}>
        <IconButton label="닫기" onClick={() => navigate(-1)}>
          <X />
        </IconButton>
        <h1 className={styles.title}>모임 만들기</h1>
        <Button type="submit" size="sm">
          만들기
        </Button>
      </header>

      <div className={styles.body}>
        <TextField label="모임 이름" placeholder="예: 한 달에 한 권, 한강 읽기" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} error={submitted ? errors.name : undefined} />
        <div>
          <BookPicker label="함께 읽을 책" value={book} onChange={setBook} />
          {submitted && errors.book && <p className={styles.error}>{errors.book}</p>}
        </div>
        <TextArea label="소개" optional placeholder="어떤 분과 어떻게 읽고 싶은지 적어주세요" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className={styles.row}>
          <div>
            <p className={styles.label}>정원</p>
            <div className={styles.stepper}>
              <IconButton label="정원 줄이기" size="sm" variant="soft" disabled={capacity <= 2} onClick={() => setCapacity((c) => c - 1)}>
                <Minus />
              </IconButton>
              <span aria-live="polite">{capacity}명</span>
              <IconButton label="정원 늘리기" size="sm" variant="soft" disabled={capacity >= 30} onClick={() => setCapacity((c) => c + 1)}>
                <Plus />
              </IconButton>
            </div>
          </div>
          <SegmentedControl
            label="모임 시간"
            size="sm"
            value={duration}
            onChange={setDuration}
            options={[
              { value: '45', label: '45분' },
              { value: '60', label: '1시간' },
              { value: '90', label: '1시간 반' },
            ]}
          />
        </div>

        <fieldset className={styles.sessions}>
          <legend className={styles.label}>진행 일정 (온라인)</legend>
          {sessions.map((s, i) => (
            <div key={i} className={styles.session}>
              <span className={styles.weekNo}>{i + 1}주차</span>
              <div className={styles.sessionFields}>
                <TextField label={`${i + 1}주차 읽을 범위`} placeholder="예: 1~3장" value={s.range} onChange={(e) => update(i, { range: e.target.value })} />
                <div className={styles.dt}>
                  <TextField label="날짜" type="date" min={today} value={s.date} onChange={(e) => update(i, { date: e.target.value })} />
                  <TextField label="시간" type="time" value={s.time} onChange={(e) => update(i, { time: e.target.value })} />
                </div>
              </div>
              {sessions.length > 1 && (
                <IconButton label={`${i + 1}주차 삭제`} size="sm" onClick={() => setSessions((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 />
                </IconButton>
              )}
            </div>
          ))}
          {submitted && errors.sessions && <p className={styles.error}>{errors.sessions}</p>}
          {sessions.length < 12 && (
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Plus aria-hidden />}
              onClick={() => setSessions((prev) => [...prev, { range: '', date: defaultDate(prev.length), time: prev[prev.length - 1]?.time ?? '21:00' }])}
            >
              회차 추가
            </Button>
          )}
        </fieldset>
      </div>

      <Sheet
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="모임 만들기를 그만둘까요?"
        description="입력한 내용은 사라져요."
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              계속 만들기
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              나가기
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </form>
  );
}
