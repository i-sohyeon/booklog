import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Camera, Minus, Plus, Quote as QuoteIcon, Trash2, X } from 'lucide-react';
import type { Book, Genre, Quote, ReadingStatus, RecordField, RecordVisibility } from '@/types/book';
import { GENRES, ONE_LINER_MAX, READING_STATUS_LABEL, RECORD_FIELD_LABEL, TAG_MAX } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { useBookLookup } from '@/hooks/useSocial';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { toDateKey } from '@/lib/date';
import { imageFileToDataUrl, storageHeadroom } from '@/lib/image';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { BookCover, Button, ButtonLink, EmptyState, IconButton, SegmentedControl, Sheet, StarRating, TextArea, TextField, useToast } from '@/components/ui';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { PenLine as PenLineIcon } from 'lucide-react';
import styles from './RecordEditPage.module.scss';

/** 기록 자세히 쓰기 — 별점 외 모든 항목은 선택, 항목별 공개 설정(기본 비공개) */
function RecordEditPageInner() {
  const { bookId = '' } = useParams();
  const book = useBookLookup()(bookId);
  if (!book)
    return (
      <Page>
        <EmptyState title="책을 찾을 수 없어요" description="삭제되었거나 잘못된 주소일 수 있어요." action={<ButtonLink to={paths.library}>서재로</ButtonLink>} />
      </Page>
    );
  return <RecordForm key={book.id} book={book} />;
}

const uid = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function RecordForm({ book }: { book: Book }) {
  const navigate = useNavigate();
  const entry = useLibraryStore((s) => s.entries[book.id]);
  const allEntries = useLibraryStore((s) => s.entries);
  const saveRecord = useLibraryStore((s) => s.saveRecord);
  const showToast = useToast((s) => s.show);
  const today = toDateKey(new Date());

  const initial = useMemo(
    () => ({
      status: entry?.status ?? ('done' as ReadingStatus),
      rating: entry?.rating,
      finishedAt: entry?.finishedAt ?? today,
      readCount: entry?.readCount ?? 1,
      oneLiner: entry?.oneLiner ?? '',
      review: entry?.review ?? '',
      spoiler: Boolean(entry?.spoiler),
      quotes: entry?.quotes ?? [],
      place: entry?.place ?? '',
      occasion: entry?.occasion ?? '',
      tags: entry?.tags ?? [],
      visibility: entry?.visibility ?? {},
      // 책 정보의 장르 (도서 API 책은 '기타'로 들어와 직접 고를 수 있음)
      genre: (book?.genre ?? '기타') as Genre,
    }),
    // 처음 열었을 때 값만 기준으로 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const { blocker, allow } = useUnsavedGuard(dirty);
  const done = form.status === 'done';

  const errors = {
    rating: done && !form.rating ? '다 읽은 책은 별점이 필요해요.' : undefined,
    date: done && !form.finishedAt ? '완독일을 입력해 주세요.' : done && form.finishedAt > today ? '미래 날짜는 고를 수 없어요.' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const vis = (field: RecordField) => ({
    field,
    on: Boolean(form.visibility[field]),
    onToggle: () => set('visibility', { ...form.visibility, [field]: !form.visibility[field] } satisfies RecordVisibility),
  });

  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate(paths.book(book.id), { replace: true }));

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    // 사진은 브라우저 저장공간을 쓰므로 여유를 먼저 확인
    const before = JSON.stringify(entry?.quotes ?? []).length;
    const after = JSON.stringify(form.quotes).length;
    if (after - before > storageHeadroom()) {
      showToast('저장공간이 부족해요. 사진 수를 줄여 주세요.');
      return;
    }
    const { genre, ...record } = form;
    saveRecord(genre !== book.genre ? { ...book, genre } : book, { ...record, rating: done ? record.rating : undefined });
    allow();
    showToast('기록을 저장했어요');
    leave();
  };

  const knownTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of Object.values(allEntries)) for (const t of e.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [allEntries]);

  return (
    <form
      className={styles.shell}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <header className={styles.bar}>
        <IconButton label="닫기" onClick={leave}>
          <X />
        </IconButton>
        <h1 className={styles.title}>{entry ? '기록 고치기' : '기록하기'}</h1>
        <Button type="submit" size="sm">
          저장
        </Button>
      </header>

      <div className={styles.bookHead}>
        <BookCover book={book} size="sm" />
        <div>
          <p className={styles.bookTitle}>{book.title}</p>
          <p className={styles.bookAuthor}>{book.authors.join(', ')}</p>
        </div>
      </div>

      <p className={styles.privacyNote}>모든 항목은 기본으로 나만 볼 수 있어요. ‘공개’로 켠 항목은 친구가 내 서재에 놀러 왔을 때 보이고, 별점·한 줄 평은 친구 홈 피드와 책 상세에도 보여요.</p>

      <div className={styles.body}>
        <SegmentedControl<ReadingStatus>
          label="독서 상태"
          value={form.status}
          onChange={(v) => set('status', v)}
          options={(['done', 'reading', 'want'] as ReadingStatus[]).map((s) => ({ value: s, label: READING_STATUS_LABEL[s] }))}
        />

        <label className={styles.genreField}>
          <span className={styles.sectionTitle}>장르</span>
          <select value={form.genre} onChange={(e) => set('genre', e.target.value as Genre)}>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g === '기타' ? '기타 · 모름' : g}
              </option>
            ))}
          </select>
          <span className={styles.genreHint}>서재 결산의 ‘많이 읽은 장르’에 반영돼요.</span>
        </label>

        {done && (
          <>
            <Section title="별점" required visibility={vis('rating')}>
              <div className={styles.rating}>
                <StarRating value={form.rating} size="lg" onChange={(v) => set('rating', v)} />
                <p className={submitted && errors.rating ? styles.error : styles.hint}>
                  {form.rating ? `${form.rating.toFixed(1)}점` : submitted && errors.rating ? errors.rating : '별을 눌러주세요 (반 개 단위)'}
                </p>
              </div>
            </Section>

            <div className={styles.row2}>
              <TextField label="완독일" type="date" max={today} value={form.finishedAt} onChange={(e) => set('finishedAt', e.target.value)} error={errors.date} />
              <div className={styles.reread}>
                <span className={styles.fieldLabel} id="reread-label">
                  회독
                </span>
                <div className={styles.stepper} role="group" aria-labelledby="reread-label">
                  <IconButton label="회독 수 줄이기" size="sm" disabled={form.readCount <= 1} onClick={() => set('readCount', form.readCount - 1)}>
                    <Minus />
                  </IconButton>
                  <output aria-live="polite">{form.readCount === 1 ? '처음 읽음' : `${form.readCount}회독`}</output>
                  <IconButton label="회독 수 늘리기" size="sm" disabled={form.readCount >= 99} onClick={() => set('readCount', form.readCount + 1)}>
                    <Plus />
                  </IconButton>
                </div>
              </div>
            </div>
          </>
        )}

        <Section title="한 줄 평" visibility={vis('oneLiner')}>
          <TextField label="한 줄 평" hideLabel placeholder="이 책을 한 문장으로 남긴다면?" maxLength={ONE_LINER_MAX} value={form.oneLiner} onChange={(e) => set('oneLiner', e.target.value)} hint={`${form.oneLiner.length}/${ONE_LINER_MAX}`} />
        </Section>

        <Section title="긴 감상" visibility={vis('review')}>
          <TextArea label="긴 감상" hideLabel placeholder="더 하고 싶은 이야기가 있다면" value={form.review} maxLength={3000} onChange={(e) => set('review', e.target.value)} />
          <label className={styles.check}>
            <input type="checkbox" checked={form.spoiler} onChange={(e) => set('spoiler', e.target.checked)} />
            스포일러가 있어요 (공개할 때 가려서 보여요)
          </label>
        </Section>

        <Section title="기억하고 싶은 문장" visibility={vis('quotes')}>
          <QuotesEditor quotes={form.quotes} onChange={(q) => set('quotes', q)} />
        </Section>

        <Section title="읽은 장소·계기" visibility={vis('context')}>
          <div className={styles.row2}>
            <TextField label="장소" placeholder="예: 출근길 지하철" maxLength={40} value={form.place} onChange={(e) => set('place', e.target.value)} />
            <TextField label="계기" placeholder="예: 친구 추천" maxLength={40} value={form.occasion} onChange={(e) => set('occasion', e.target.value)} />
          </div>
        </Section>

        <Section title="태그" visibility={vis('tags')}>
          <TagEditor tags={form.tags} suggestions={knownTags} onChange={(t) => set('tags', t)} />
        </Section>

        <Button type="submit" size="lg" block>
          저장
        </Button>
      </div>

      <Sheet
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="저장하지 않고 나갈까요?"
        description="작성한 내용이 사라져요."
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              계속 쓰기
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

interface VisibilityProps {
  field: RecordField;
  on: boolean;
  onToggle: () => void;
}

function Section({ title, required, visibility, children }: { title: string; required?: boolean; visibility: VisibilityProps; children: ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {title}
          {required ? <span className={styles.required}>필수</span> : <span className={styles.optional}>선택</span>}
        </h2>
        <PublicSwitch {...visibility} />
      </div>
      {children}
    </section>
  );
}

function PublicSwitch({ field, on, onToggle }: VisibilityProps) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${RECORD_FIELD_LABEL[field]} 공개`} className={styles.switch} onClick={onToggle}>
      <span className={styles.switchText}>{on ? '공개' : '비공개'}</span>
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}

const MAX_QUOTES = 20;

function QuotesEditor({ quotes, onChange }: { quotes: Quote[]; onChange: (q: Quote[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const showToast = useToast((s) => s.show);
  const update = (id: string, patch: Partial<Quote>) => onChange(quotes.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const full = quotes.length >= MAX_QUOTES;

  const addPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const image = await imageFileToDataUrl(file);
      onChange([...quotes, { id: uid(), image, createdAt: new Date().toISOString() }]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '사진을 추가하지 못했어요.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={styles.quotes}>
      {quotes.map((q, i) => (
        <div key={q.id} className={styles.quote}>
          {q.image && <img src={q.image} alt={`첨부한 문장 사진 ${i + 1}`} className={styles.quoteImage} />}
          <TextArea
            label={q.image ? `사진 ${i + 1} 메모` : `문장 ${i + 1}`}
            hideLabel
            placeholder={q.image ? '사진 속 문장에 대한 메모 (선택)' : '마음에 남은 문장을 옮겨 적어 주세요'}
            maxLength={500}
            value={q.text ?? ''}
            onChange={(e) => update(q.id, { text: e.target.value })}
          />
          <IconButton label={`문장 ${i + 1} 삭제`} size="sm" className={styles.quoteRemove} onClick={() => onChange(quotes.filter((x) => x.id !== q.id))}>
            <Trash2 />
          </IconButton>
        </div>
      ))}
      <div className={styles.quoteActions}>
        <Button variant="outline" size="sm" disabled={full} leadingIcon={<QuoteIcon aria-hidden />} onClick={() => onChange([...quotes, { id: uid(), text: '', createdAt: new Date().toISOString() }])}>
          문장 쓰기
        </Button>
        <Button variant="outline" size="sm" disabled={full || busy} leadingIcon={<Camera aria-hidden />} onClick={() => fileRef.current?.click()}>
          {busy ? '사진 처리 중…' : '사진으로 추가'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void addPhoto(e.target.files?.[0])} />
      </div>
      <p className={styles.hint}>사진은 이 기기에만 저장돼요. 한 권에 최대 {MAX_QUOTES}개.</p>
    </div>
  );
}

function TagEditor({ tags, suggestions, onChange }: { tags: string[]; suggestions: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const full = tags.length >= TAG_MAX;
  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').slice(0, 20);
    if (!t || tags.includes(t) || full) return;
    onChange([...tags, t]);
  };
  const rest = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);

  return (
    <div className={styles.tags}>
      {tags.length > 0 && (
        <ul role="list" className={styles.chips} aria-label="추가한 태그">
          {tags.map((t) => (
            <li key={t}>
              <button type="button" className={cn(styles.chip, styles.chipOn)} onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`${t} 태그 빼기`}>
                #{t}
                <X aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <TextField
        label="태그 입력"
        hideLabel
        placeholder={full ? `태그는 ${TAG_MAX}개까지 달 수 있어요` : '태그 입력 후 Enter'}
        disabled={full}
        value={input}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) {
            add(v.slice(0, -1));
            setInput('');
          } else setInput(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            add(input);
            setInput('');
          }
        }}
        onBlur={() => {
          if (input.trim()) {
            add(input);
            setInput('');
          }
        }}
      />
      {rest.length > 0 && !full && (
        <div className={styles.suggest}>
          <span className={styles.hint}>자주 쓴 태그</span>
          <ul role="list" className={styles.chips}>
            {rest.map((t) => (
              <li key={t}>
                <button type="button" className={styles.chip} onClick={() => add(t)}>
                  + {t}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 로그인하지 않았으면 로그인 안내, 했으면 본 화면 */
export function RecordEditPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<PenLineIcon aria-hidden />} title="기록하려면 로그인해 주세요" description="별점·한 줄 평·감상·문장을 남기면 계정에 저장돼요." />
      </Page>
    );
  return <RecordEditPageInner />;
}
