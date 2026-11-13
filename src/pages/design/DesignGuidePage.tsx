import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ArrowDown, ArrowLeft, ArrowUp, BookCheck, BookMarked, BookOpen, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock,
  CloudDownload, CloudOff, CloudUpload, Compass, EyeOff, FlaskConical, Heart, Home, Info, KeyRound, Library, ListPlus, Lock, LogIn,
  LogOut, MailCheck, MapPin, MessageCircle, MessagesSquare, Minus, PenLine, Pencil, Plus, Quote, RotateCcw, Search, Send, Settings,
  Star, Trash2, UserRound, Users, Video, X, type LucideIcon,
} from 'lucide-react';
import {
  Avatar, Badge, BookCover, Button, EmptyState, ErrorState, IconButton, LikeButton, LoadingRegion, RatingValue, SearchField,
  SectionHeader, SegmentedControl, Sheet, Skeleton, Spoiler, StarRating, StatusBadge, Switch, Tabs, TextArea, TextField,
  ToastViewport, useToast,
} from '@/components/ui';
import type { CoverTone } from '@/types/book';
import type { AvatarTone } from '@/types/social';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { computed, contrast, section, toHex, type Token } from './tokens';
import styles from './DesignGuidePage.module.scss';

const NAV = [
  { id: 'color', label: '컬러' },
  { id: 'type', label: '글자' },
  { id: 'icons', label: '아이콘' },
  { id: 'components', label: '컴포넌트' },
  { id: 'layout', label: '간격·모양' },
  { id: 'brand', label: '로고' },
] as const;

const ICONS: Record<string, LucideIcon> = {
  Plus, Search, X, Heart, Send, Star, Video, Users, BookOpen, BookMarked, BookCheck, Library, Home, Compass, MessagesSquare,
  MessageCircle, UserRound, Settings, Pencil, PenLine, Quote, ListPlus, CalendarDays, Clock, MapPin, Camera, Check, Info, EyeOff,
  Lock, KeyRound, MailCheck, LogIn, LogOut, CloudUpload, CloudDownload, CloudOff, RotateCcw, Trash2, Minus, ChevronLeft,
  ChevronRight, ArrowLeft, ArrowUp, ArrowDown, FlaskConical,
};

const SAMPLE_BOOKS: Array<{ id: string; title: string; authors: string[]; coverTone: CoverTone }> = [
  { id: 'dg-plum', title: '작별하지 않는다', authors: ['한강'], coverTone: 'plum' },
  { id: 'dg-forest', title: '아몬드', authors: ['손원평'], coverTone: 'forest' },
  { id: 'dg-navy', title: '달러구트 꿈 백화점', authors: ['이미예'], coverTone: 'navy' },
  { id: 'dg-clay', title: '불편한 편의점', authors: ['김호연'], coverTone: 'clay' },
  { id: 'dg-mustard', title: '어린 왕자', authors: ['생텍쥐페리'], coverTone: 'mustard' },
  { id: 'dg-charcoal', title: '소년이 온다', authors: ['한강'], coverTone: 'charcoal' },
  { id: 'dg-rose', title: '여름의 빌라', authors: ['백수린'], coverTone: 'rose' },
  { id: 'dg-sea', title: '우리가 빛의 속도로 갈 수 없다면', authors: ['김초엽'], coverTone: 'sea' },
];

const AVATAR_TONES: AvatarTone[] = ['plum', 'ochre', 'sage', 'clay', 'sea', 'ink'];

/** 토큰 계산값은 화면 폭(clamp)에 따라 바뀌므로 크기가 바뀌면 다시 읽음 */
function useResizeTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return tick;
}

export function DesignGuidePage() {
  useEffect(() => {
    const prev = document.title;
    document.title = '디자인 가이드 · BookLog';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link to={paths.home} className={styles.brand}>
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>
            BookLog <em>디자인 가이드</em>
          </span>
        </Link>
        <nav aria-label="가이드 목차" className={styles.nav}>
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <p className="t-eyebrow">Design guide</p>
          <h1 className="t-display">표지가 주인공인 독서 앱</h1>
          <p className={styles.lead}>
            표지 → 별점 → 사람들의 말 순서로 보이게 합니다. 중립 오프화이트 바탕, Pretendard 하나, 굵기 두 가지, 장식 없이 넉넉한 여백.
            이 화면의 색과 크기는 <code>src/styles/tokens.scss</code>에서 바로 읽어 와서, 토큰을 고치면 여기도 같이 바뀝니다.
          </p>
        </section>

        <ColorSection />
        <TypeSection />
        <IconSection />
        <ComponentSection />
        <LayoutSection />
        <BrandSection />
      </main>
      <ToastViewport />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHead}>
        <h2 id={`${id}-title`} className="t-title-1">
          {title}
        </h2>
        {description && <p className={styles.sectionDesc}>{description}</p>}
      </header>
      {children}
    </section>
  );
}

function Group({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      {note && <p className={styles.groupNote}>{note}</p>}
      {children}
    </div>
  );
}

/* ---------------------------- 컬러 ---------------------------- */

function ColorSection() {
  useResizeTick();
  const primitives = [section('Primitive: Plum'), section('Primitive: Paper'), section('Primitive: Accent')].filter(Boolean);
  const semantic = [section('Semantic: Surface'), section('Semantic: Text'), section('Semantic: Brand')].filter(Boolean);
  const status = section('Reading status');
  const bg = computed('color-bg');

  return (
    <Section
      id="color"
      title="컬러"
      description="기본 팔레트(Primitive)를 의미 토큰(Semantic)이 가리키는 구조예요. 화면에서는 의미 토큰을 씁니다. 노란색(ochre)은 별점에만 씁니다."
    >
      {primitives.map((s) => (
        <Group key={s!.title} title={s!.title.replace('Primitive: ', '')}>
          <ul role="list" className={styles.swatches}>
            {s!.tokens.map((t) => {
              const value = computed(t.name);
              return (
                <li key={t.name} className={styles.swatch}>
                  <span className={styles.chip} style={{ background: `var(--${t.name})` }} />
                  <strong>{t.name}</strong>
                  <code>{toHex(value)}</code>
                  {t.note && <small>{t.note}</small>}
                </li>
              );
            })}
          </ul>
        </Group>
      ))}

      {semantic.map((s) => (
        <Group key={s!.title} title={s!.title.replace('Semantic: ', '의미 · ')}>
          <ul role="list" className={styles.rows}>
            {s!.tokens.map((t) => (
              <SemanticRow key={t.name} token={t} bg={bg} />
            ))}
          </ul>
        </Group>
      ))}

      {status && (
        <Group title="독서 상태" note="옅은 바탕 + 진한 글자 짝으로만 씁니다.">
          <div className={styles.statusRow}>
            {(['want', 'reading', 'done'] as const).map((st) => {
              const ratio = contrast(computed(`status-${st}`), computed(`status-${st}-bg`));
              return (
                <div key={st} className={styles.statusItem}>
                  <StatusBadge status={st} />
                  <code>
                    status-{st} / -bg
                  </code>
                  <Ratio value={ratio} />
                </div>
              );
            })}
          </div>
        </Group>
      )}
    </Section>
  );
}

function SemanticRow({ token, bg }: { token: Token; bg: string }) {
  const value = computed(token.name);
  const isText = token.name.startsWith('color-text') && token.name !== 'color-text-inverse';
  return (
    <li className={styles.row}>
      <span className={styles.dot} style={{ background: `var(--${token.name})` }} />
      <span className={styles.rowName}>
        <strong>{token.name}</strong>
        {token.note && <small>{token.note}</small>}
      </span>
      <span className={styles.rowMeta}>
        {token.alias ? <code>→ {token.alias}</code> : <code>{token.raw}</code>}
        <code className={styles.hex}>{toHex(value)}</code>
        {isText && <Ratio value={contrast(value, bg)} label="바탕 대비" />}
      </span>
    </li>
  );
}

function Ratio({ value, label }: { value: number | null; label?: string }) {
  if (value == null) return null;
  const pass = value >= 4.5;
  return (
    <span className={cn(styles.ratio, !pass && styles.ratioLow)} title={label}>
      {value.toFixed(1)}:1 {pass ? 'AA' : '낮음'}
    </span>
  );
}

/* ---------------------------- 글자 ---------------------------- */

const TYPE_SAMPLES: Array<{ token: string; name: string; weight: 'bold' | 'medium'; leading: string; tracking: string; use: string; text: string }> = [
  { token: 'text-display', name: 'Display', weight: 'bold', leading: 'leading-tight', tracking: 'tracking-tight', use: '화면당 하나뿐인 큰 제목', text: '올해 읽은 책 24권' },
  { token: 'text-title-1', name: 'Title 1', weight: 'bold', leading: 'leading-tight', tracking: 'tracking-tight', use: '페이지 제목', text: '작별하지 않는다' },
  { token: 'text-title-2', name: 'Title 2', weight: 'bold', leading: 'leading-tight', tracking: 'tracking-snug', use: '섹션 제목', text: '친구들이 다 읽은 책' },
  { token: 'text-title-3', name: 'Title 3', weight: 'bold', leading: 'leading-snug', tracking: 'tracking-snug', use: '카드·시트 제목', text: '이번 주 독서모임' },
  { token: 'text-body-lg', name: 'Body L', weight: 'medium', leading: 'leading-body', tracking: 'tracking-snug', use: '긴 감상, lg 버튼', text: '한 줄 평을 남겨 보세요.' },
  { token: 'text-body', name: 'Body', weight: 'medium', leading: 'leading-body', tracking: 'tracking-snug', use: '기본 본문', text: '기억하고 싶은 문장을 모아 두는 곳이에요.' },
  { token: 'text-label', name: 'Label', weight: 'bold', leading: 'leading-snug', tracking: 'tracking-snug', use: '버튼, 입력 레이블, 탭', text: '다 읽었어요' },
  { token: 'text-caption', name: 'Caption', weight: 'medium', leading: 'leading-snug', tracking: 'tracking-snug', use: '메타 정보, 도움말', text: '3일 전 · 공감 12' },
  { token: 'text-micro', name: 'Micro', weight: 'medium', leading: 'leading-snug', tracking: 'tracking-snug', use: '배지, 출처 표기', text: '도서 정보 제공: 카카오' },
];

function TypeSection() {
  useResizeTick();
  const typo = section('Typography');
  const raw = (name: string) => typo?.tokens.find((t) => t.name === name)?.raw ?? '';
  return (
    <Section id="type" title="글자" description="Pretendard 하나만 씁니다. 굵기는 700과 500 두 가지, 위계는 굵기보다 크기와 색으로 만들어요.">
      <div className={styles.specimen}>
        <p className={styles.specimenBig} aria-hidden>
          가나다 Aa 123
        </p>
        <div className={styles.specimenMeta}>
          <strong>Pretendard</strong>
          <code>--font-sans</code>
          <div className={styles.weights}>
            <span style={{ fontWeight: 'var(--font-bold)' }}>Bold 700 · 제목·버튼·강조 숫자</span>
            <span style={{ fontWeight: 'var(--font-medium)' }}>Medium 500 · 본문·보조·캡션</span>
          </div>
          <p className={styles.dont}>400·600 굵기는 쓰지 않아요.</p>
        </div>
      </div>

      <ul role="list" className={styles.scale}>
        {TYPE_SAMPLES.map((s) => (
          <TypeRow key={s.token} sample={s} raw={raw(s.token)} />
        ))}
      </ul>
    </Section>
  );
}

function TypeRow({ sample, raw }: { sample: (typeof TYPE_SAMPLES)[number]; raw: string }) {
  const [px, setPx] = useState('');
  const [el, ref] = useState<HTMLParagraphElement | null>(null);
  const tick = useResizeTick();
  // 실제로 그려진 크기 (clamp 토큰은 화면 폭에 따라 달라짐)
  useEffect(() => {
    if (el) setPx(getComputedStyle(el).fontSize);
  }, [el, tick]);
  return (
    <li className={styles.typeRow}>
      <div className={styles.typeMeta}>
        <strong>{sample.name}</strong>
        <code>--{sample.token}</code>
        <span>
          {px} · {sample.weight === 'bold' ? '700' : '500'} · {sample.leading.replace('leading-', '')}
        </span>
        {raw.startsWith('clamp') && <small>화면 폭에 따라 커져요</small>}
        <small>{sample.use}</small>
      </div>
      <p
        ref={ref}
        className={styles.typeSample}
        style={{
          fontSize: `var(--${sample.token})`,
          fontWeight: `var(--font-${sample.weight})`,
          lineHeight: `var(--${sample.leading})`,
          letterSpacing: `var(--${sample.tracking})`,
        }}
      >
        {sample.text}
      </p>
    </li>
  );
}

/* ---------------------------- 아이콘 ---------------------------- */

function IconSection() {
  const [q, setQ] = useState('');
  const list = useMemo(() => Object.entries(ICONS).filter(([name]) => name.toLowerCase().includes(q.trim().toLowerCase())), [q]);
  const showToast = useToast((s) => s.show);
  return (
    <Section
      id="icons"
      title="아이콘"
      description={
        <>
          lucide-react 아이콘을 기본 선 굵기로 씁니다. 버튼 안 20px, 작은 버튼 18px. 아이콘은 <code>aria-hidden</code>, 이름은 글자나 <code>label</code>이
          맡아요. 아래는 앱에서 실제로 쓰는 아이콘이에요. 누르면 이름이 복사돼요.
        </>
      }
    >
      <div className={styles.iconSearch}>
        <SearchField label="아이콘 찾기" placeholder="이름으로 찾기 (예: book)" value={q} onValueChange={setQ} />
      </div>
      <ul role="list" className={styles.icons}>
        {list.map(([name, Icon]) => (
          <li key={name}>
            <button
              type="button"
              className={styles.icon}
              onClick={() => {
                void navigator.clipboard?.writeText(name).then(
                  () => showToast(`${name} 이름을 복사했어요`),
                  () => showToast(name),
                );
              }}
            >
              <Icon aria-hidden />
              <span>{name}</span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className={styles.groupNote}>“{q}”와 맞는 아이콘이 없어요.</p>}
    </Section>
  );
}

/* ---------------------------- 컴포넌트 ---------------------------- */

function Demo({ name, use, children, wide }: { name: string; use: string; children: ReactNode; wide?: boolean }) {
  return (
    <article className={cn(styles.demo, wide && styles.demoWide)}>
      <header>
        <h3>{name}</h3>
        <p>{use}</p>
      </header>
      <div className={styles.demoBody}>{children}</div>
    </article>
  );
}

function ComponentSection() {
  const showToast = useToast((s) => s.show);
  const [rating, setRating] = useState<number | undefined>(3.5);
  const [liked, setLiked] = useState(true);
  const [tab, setTab] = useState('done');
  const [seg, setSeg] = useState('board');
  const [pill, setPill] = useState('open');
  const [time, setTime] = useState('60');
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);

  return (
    <Section
      id="components"
      title="컴포넌트"
      description={
        <>
          <code>src/components/ui</code>의 실제 컴포넌트예요. 눌러 보고 입력해 볼 수 있어요.
        </>
      }
    >
      <div className={styles.demos}>
        <Demo name="Button" use="주 동작은 primary 하나. 크기 sm 36 / md 44 / lg 52px." wide>
          <div className={styles.stack}>
            <div className={styles.wrap}>
              <Button>기록하기</Button>
              <Button variant="secondary">읽고 싶어요</Button>
              <Button variant="outline">리스트에 담기</Button>
              <Button variant="ghost">취소</Button>
              <Button variant="danger">삭제</Button>
            </div>
            <div className={styles.wrap}>
              <Button size="sm">참여하기</Button>
              <Button leadingIcon={<Plus aria-hidden />}>책 기록</Button>
              <Button size="lg">저장하기</Button>
              <Button loading>저장 중</Button>
              <Button disabled>모집 마감</Button>
            </div>
          </div>
        </Demo>

        <Demo name="IconButton" use="아이콘만으로 뜻이 분명할 때. label 필수.">
          <div className={styles.wrap}>
            <IconButton label="닫기">
              <X />
            </IconButton>
            <IconButton label="검색" variant="soft">
              <Search />
            </IconButton>
            <IconButton label="책 기록" variant="solid">
              <Plus />
            </IconButton>
            <IconButton label="보내기" size="sm">
              <Send />
            </IconButton>
          </div>
        </Demo>

        <Demo name="LikeButton" use="후기·글 공감. 누르면 바로 바뀌어요.">
          <LikeButton liked={liked} count={liked ? 13 : 12} onToggle={() => setLiked(!liked)} label="예시 후기" />
        </Demo>

        <Demo name="BookCover" use="표지가 주인공. 실제 표지가 없으면 제목으로 만든 표지(톤 8가지)." wide>
          <div className={styles.covers}>
            {SAMPLE_BOOKS.map((b) => (
              <figure key={b.id}>
                <BookCover book={b} size="md" />
                <figcaption>{b.coverTone}</figcaption>
              </figure>
            ))}
          </div>
        </Demo>

        <Demo name="StarRating" use="0.5 단위. 다 읽은 책은 별점 필수. 노란색은 별점에만.">
          <div className={styles.stack}>
            <div className={styles.wrap}>
              <StarRating value={4.5} />
              <StarRating value={4} size="md" />
            </div>
            <div className={styles.wrap}>
              <StarRating value={rating} size="lg" onChange={setRating} />
              <strong className={styles.num}>{rating ? rating.toFixed(1) : '선택 안 함'}</strong>
            </div>
          </div>
        </Demo>

        <Demo name="RatingValue" use="평균 별점과 참여 수.">
          <div className={styles.wrap}>
            <RatingValue value={4.3} count={128} />
            <RatingValue value={3.8} size="md" />
          </div>
        </Demo>

        <Demo name="StatusBadge · Badge" use="독서 상태는 StatusBadge, 장르·태그·샘플은 Badge.">
          <div className={styles.stack}>
            <div className={styles.wrap}>
              <StatusBadge status="want" />
              <StatusBadge status="reading" />
              <StatusBadge status="done" />
            </div>
            <div className={styles.wrap}>
              <Badge>소설</Badge>
              <Badge tone="brand">샘플</Badge>
              <Badge tone="outline">#여름에읽은책</Badge>
            </div>
          </div>
        </Demo>

        <Demo name="Avatar" use="사진이 없으면 첫 글자. 나는 plum, 다른 사람은 id로 톤 고정.">
          <div className={styles.stack}>
            <div className={styles.wrap}>
              {AVATAR_TONES.map((t, i) => (
                <Avatar key={t} name={['책갈피', '오후', '수풀', '노을', '바다', '먹'][i]!} tone={t} />
              ))}
            </div>
            <div className={styles.wrap}>
              <Avatar name="책갈피" size="xs" />
              <Avatar name="책갈피" size="sm" />
              <Avatar name="책갈피" size="md" />
              <Avatar name="책갈피" size="lg" />
            </div>
          </div>
        </Demo>

        <Demo name="Tabs" use="보기 전환. underline / segment / pill." wide>
          <div className={styles.stack}>
            <Tabs
              label="서재 상태"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'done', label: '다 읽은 책', count: 24 },
                { value: 'reading', label: '읽는 중', count: 3 },
                { value: 'want', label: '읽고 싶어요', count: 11 },
              ]}
            />
            <Tabs label="커뮤니티" variant="segment" value={seg} onChange={setSeg} items={[{ value: 'board', label: '게시판' }, { value: 'clubs', label: '독서모임' }]} />
            <Tabs label="모임 보기" variant="pill" value={pill} onChange={setPill} items={[{ value: 'open', label: '모집 중' }, { value: 'mine', label: '참여 중', count: 2 }]} />
          </div>
        </Demo>

        <Demo name="SegmentedControl" use="폼 안에서 2~4개 중 하나 고르기.">
          <SegmentedControl
            label="모임 시간"
            value={time}
            onChange={setTime}
            options={[
              { value: '45', label: '45분' },
              { value: '60', label: '1시간' },
              { value: '90', label: '1시간 반' },
            ]}
          />
        </Demo>

        <Demo name="Switch" use="바로 적용되는 설정.">
          <div className={styles.stack}>
            <Switch label="내 서재를 친구에게 보여 주기" description="읽는 중·읽고 싶어요 책장도 보여요." checked={on} onChange={setOn} />
            <Switch label="한 줄 평 공개" checked={off} onChange={setOff} />
          </div>
        </Demo>

        <Demo name="TextField · TextArea" use="레이블은 항상 보이게. 오류는 무엇+어떻게." wide>
          <div className={styles.fields}>
            <TextField label="모임 이름" defaultValue="한 달에 한 권, 한강 읽기" maxLength={30} />
            <TextField label="한 줄 평" optional placeholder="80자 안에서 남겨 주세요" hint="공개로 켠 경우에만 다른 사람에게 보여요." />
            <TextField label="닉네임" defaultValue="책" error="2~12자로 입력해 주세요." />
            <TextArea label="감상" optional maxLength={300} placeholder="어떤 장면이 오래 남았나요?" />
          </div>
        </Demo>

        <Demo name="SearchField" use="무엇으로 찾는지 플레이스홀더로 알려요.">
          <SearchField label="책 검색" placeholder="제목, 저자로 찾기" value={q} onValueChange={setQ} />
        </Demo>

        <Demo name="SectionHeader" use="섹션 제목 줄. eyebrow·설명·더 보기.">
          <div className={styles.stack}>
            <SectionHeader title="친구들이 다 읽은 책" more={{ to: paths.discover }} />
            <SectionHeader eyebrow="TODAY'S PICK" title="오늘의 한 권" description="최근 별점을 준 책과 비슷한 분위기예요." />
          </div>
        </Demo>

        <Demo name="Spoiler" use="스포일러를 켠 글은 흐리게 가리고 누르면 보여요.">
          <Spoiler active>
            <p>마지막 장에서 인선이 꿈속의 새를 놓아주는 장면이 오래 남았다.</p>
          </Spoiler>
        </Demo>

        <Demo name="Skeleton" use="불러오는 동안 자리 잡기. 스피너 대신.">
          <LoadingRegion label="예시 불러오는 중">
            <div className={styles.skel}>
              <Skeleton variant="cover" width={64} />
              <div className={styles.stack}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" width="65%" />
              </div>
            </div>
          </LoadingRegion>
        </Demo>

        <Demo name="EmptyState" use="무엇이 없는지 + 어떻게 채우는지.">
          <EmptyState compact title="참여 중인 모임이 없어요" description="마음에 드는 모임에 참여하거나 직접 만들어 보세요." action={<Button size="sm">모임 만들기</Button>} />
        </Demo>

        <Demo name="ErrorState" use="실패하면 다음 행동을. 사과보다 다시 시도.">
          <ErrorState compact onRetry={() => showToast('다시 불러왔어요')} />
        </Demo>

        <Demo name="Sheet · Toast" use="확인·짧은 선택은 시트, 끝난 일 알림은 토스트(과거형 해요체).">
          <div className={styles.wrap}>
            <Button variant="outline" onClick={() => setSheet(true)}>
              시트 열기
            </Button>
            <Button variant="outline" onClick={() => showToast('기록을 저장했어요')}>
              토스트 띄우기
            </Button>
          </div>
          <Sheet
            open={sheet}
            onClose={() => setSheet(false)}
            title="모임에서 나갈까요?"
            description="나가면 토론에 글을 남길 수 없어요."
            footer={
              <>
                <Button variant="ghost" onClick={() => setSheet(false)}>
                  취소
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setSheet(false);
                    showToast('모임에서 나왔어요');
                  }}
                >
                  나가기
                </Button>
              </>
            }
          >
            <p>다시 참여하려면 정원이 남아 있어야 해요.</p>
          </Sheet>
        </Demo>
      </div>
    </Section>
  );
}

/* ---------------------------- 간격·모양 ---------------------------- */

function LayoutSection() {
  useResizeTick();
  const spacing = section('Spacing')?.tokens.filter((t) => /^space-\d+$/.test(t.name)) ?? [];
  const radius = section('Radius')?.tokens ?? [];
  const shadows = section('Elevation')?.tokens ?? [];
  const motion = section('Motion')?.tokens ?? [];
  const layout = [...(section('Spacing')?.tokens.filter((t) => t.name.startsWith('page-')) ?? []), ...(section('Layout')?.tokens ?? [])];

  return (
    <Section id="layout" title="간격·모양" description="4px 단위 간격, 알약·둥근 모서리, 아주 옅은 그림자. 카드는 그림자 대신 1px 테두리로 구분해요.">
      <Group title="간격" note="SCSS에서는 sp(n) = n × 4px. 카드 목록 간격 12px, 카드 안쪽 20px.">
        <ul role="list" className={styles.spaces}>
          {spacing.map((t) => (
            <li key={t.name}>
              <code>{t.name}</code>
              <span className={styles.spaceBar} style={{ width: `var(--${t.name})` }} />
              <span className={styles.num}>{computed(t.name)}</span>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="모서리">
        <ul role="list" className={styles.radii}>
          {radius.map((t) => (
            <li key={t.name}>
              <span className={styles.radiusBox} style={{ borderRadius: `var(--${t.name})` }} />
              <code>{t.name}</code>
              <span className={styles.num}>{t.raw}</span>
              {t.note && <small>{t.note}</small>}
            </li>
          ))}
        </ul>
      </Group>

      <Group title="그림자">
        <ul role="list" className={styles.shadows}>
          {shadows.map((t) => (
            <li key={t.name}>
              <span className={styles.shadowBox} style={{ boxShadow: `var(--${t.name})` }} />
              <code>{t.name}</code>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="움직임" note="짧고 조용하게. 마우스를 올리거나 눌러 보세요. 동작 줄이기 설정이면 모두 0ms.">
        <ul role="list" className={styles.motion}>
          {motion.map((t) => (
            <li key={t.name}>
              <code>{t.name}</code>
              <span className={styles.num}>{t.raw.startsWith('cubic') ? t.raw.replace('cubic-bezier', '') : t.raw}</span>
              {t.name.startsWith('duration') && (
                <span className={styles.track}>
                  <span className={styles.runner} style={{ transitionDuration: `var(--${t.name})` }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </Group>

      <Group title="레이아웃" note="모바일 하단 탭 5개, 1024px부터 왼쪽 사이드바. 브레이크포인트 480 / 768 / 1024 / 1280.">
        <ul role="list" className={styles.rows}>
          {layout.map((t) => (
            <li key={t.name} className={styles.row}>
              <span className={styles.rowName}>
                <strong>{t.name}</strong>
                {t.note && <small>{t.note}</small>}
              </span>
              <span className={styles.rowMeta}>
                <code className={styles.hex}>{computed(t.name)}</code>
              </span>
            </li>
          ))}
        </ul>
      </Group>
    </Section>
  );
}

/* ---------------------------- 로고 ---------------------------- */

function BrandSection() {
  return (
    <Section id="brand" title="로고" description="B 마크 하나. 색을 바꾸지 않고 그대로 써요. 워드마크는 Pretendard Bold로 조판합니다.">
      <div className={styles.brandRow}>
        <figure className={styles.logoTile}>
          <img src="/favicon.svg" alt="BookLog 마크" width={96} height={96} />
          <figcaption>
            <code>public/favicon.svg</code>
          </figcaption>
        </figure>
        <figure className={styles.ogTile}>
          <img src="/og-image.png" alt="링크 공유 미리보기 이미지" width={1200} height={630} />
          <figcaption>
            <code>public/og-image.png</code> · 링크 공유 미리보기 1200×630
          </figcaption>
        </figure>
      </div>
      <p className={styles.footer}>
        <Link to={paths.home}>북로그로 돌아가기</Link>
      </p>
    </Section>
  );
}
