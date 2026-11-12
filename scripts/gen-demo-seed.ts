/**
 * 테스트 계정 시드 SQL 생성기 → supabase/demo_seed.sql
 * 실행: npm run demo:seed
 *
 * 날짜는 "실행한 날" 기준 상대값(now() - interval)으로 넣어, 언제 SQL을 돌려도 최근 기록처럼 보입니다.
 */
import { writeFileSync } from 'node:fs';
import { DEMO_ACCOUNTS } from '@/config/demoAccounts';
import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { createSampleLibrary } from '@/mocks/library';
import { SAMPLE_REVIEWS } from '@/mocks/social';
import type { Book, LibraryEntry } from '@/types/book';

const [A, B] = DEMO_ACCOUNTS as [(typeof DEMO_ACCOUNTS)[0], (typeof DEMO_ACCOUNTS)[0]];
const now = Date.now();

const q = (v: string | null | undefined) => (v === null || v === undefined ? 'null' : `'${v.replace(/'/g, "''")}'`);
const arr = (v: string[] | undefined) => (v?.length ? `array[${v.map(q).join(',')}]::text[]` : `'{}'::text[]`);
const json = (v: unknown) => `${q(JSON.stringify(v ?? null))}::jsonb`;
const ago = (iso: string) => `now() - interval '${Math.max(0, Math.round((now - Date.parse(iso)) / 1000))} seconds'`;
const dayAgo = (key: string) => `current_date - ${Math.max(0, Math.round((now - Date.parse(`${key}T12:00:00`)) / 86_400_000))}`;

const bookRow = (b: Book) =>
  `(${[q(b.id), q(b.isbn), q(b.title), q(b.subtitle), arr(b.authors), b.translators ? arr(b.translators) : 'null', q(b.publisher), q(b.publishedAt), b.pageCount, q(b.genre), q(b.description), q(b.coverUrl), q(b.coverTone)].join(', ')})`;

const entryRow = (userId: string, e: LibraryEntry) =>
  `(${[
    q(userId),
    q(e.bookId),
    q(e.status),
    ago(e.addedAt),
    ago(e.updatedAt),
    e.finishedAt ? dayAgo(e.finishedAt) : 'null',
    e.rating ?? 'null',
    q(e.oneLiner),
    q(e.review),
    e.spoiler ? 'true' : 'false',
    json((e.quotes ?? []).filter((x) => x.text).map(({ id, text, createdAt }) => ({ id, text, createdAt }))),
    q(e.place),
    q(e.occasion),
    arr(e.tags),
    e.readCount ?? 1,
    json(e.visibility ?? {}),
  ].join(', ')})`;

// ---- A: 샘플 서재 전체, 다 읽은 책은 별점·한 줄 평 공개 ----
const libA = createSampleLibrary();
const entriesA = Object.values(libA.entries).map((e) =>
  e.status === 'done' ? { ...e, visibility: { ...e.visibility, rating: true, oneLiner: true } } : e,
);

// ---- B: 샘플 사용자 몇 명의 후기를 B의 완독 기록으로 + 읽는 중·읽고 싶어요 ----
const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
const reviewsB = SAMPLE_REVIEWS.filter((r) => ['m1', 'm4', 'm6'].includes(r.memberId));
const seenB = new Set<string>();
const entriesB: LibraryEntry[] = [];
for (const r of reviewsB) {
  if (seenB.has(r.bookId)) continue;
  seenB.add(r.bookId);
  entriesB.push({
    bookId: r.bookId,
    status: 'done',
    addedAt: r.createdAt,
    updatedAt: r.createdAt,
    finishedAt: r.finishedAt,
    rating: r.rating,
    oneLiner: r.oneLiner,
    spoiler: r.spoiler,
    visibility: { rating: true, oneLiner: true },
  });
}
const extraB: Array<[string, LibraryEntry['status'], number]> = [
  ['bk-028', 'reading', 2],
  ['bk-031', 'reading', 6],
  ['bk-026', 'want', 4],
  ['bk-033', 'want', 12],
];
for (const [bookId, status, d] of extraB) {
  if (seenB.has(bookId)) continue;
  seenB.add(bookId);
  entriesB.push({ bookId, status, addedAt: iso(d), updatedAt: iso(d) });
}

// ---- 게시판: 테스트용으로 새로 쓴 짧은 글 ----
const posts = [
  { id: 'd0d0c000-0000-4000-8000-000000000001', by: B.id, kind: 'request', book: null, spoiler: false, mins: 50, body: '요즘 잠들기 전에 읽을 잔잔한 에세이 찾고 있어요. 추천해 주실 분!' },
  { id: 'd0d0c000-0000-4000-8000-000000000002', by: A.id, kind: 'quote', book: 'bk-024', spoiler: false, mins: 180, quote: '가장 중요한 것은 눈에 보이지 않아.', body: '테스트 계정 A의 문장 공유 글이에요. 오랜만에 다시 펼쳐봤어요.' },
  { id: 'd0d0c000-0000-4000-8000-000000000003', by: B.id, kind: 'free', book: 'bk-001', spoiler: false, mins: 1500, body: '이번 주에 다 읽은 책 이야기 나눠요. 다들 무슨 책 읽고 계세요?' },
];
const comments = [
  { post: posts[0]!.id, by: A.id, mins: 40, body: '「언어의 온도」 추천해요. 한 꼭지씩 짧게 읽기 좋아요.' },
  { post: posts[1]!.id, by: B.id, mins: 150, body: '저도 이 문장 좋아해요!' },
  { post: posts[2]!.id, by: A.id, mins: 1400, body: '저는 「이처럼 사소한 것들」 다 읽었어요. 짧은데 여운이 길어요.' },
];
const reviewLikes = [
  ...entriesB.filter((e) => e.status === 'done').slice(0, 4).map((e) => ({ by: A.id, target: `u:${B.id}:${e.bookId}` })),
  ...entriesA.filter((e) => e.status === 'done').slice(0, 5).map((e) => ({ by: B.id, target: `u:${A.id}:${e.bookId}` })),
];

const ids = `(${q(A.id)}, ${q(B.id)})`;
const usedBooks = new Map<string, Book>();
for (const e of [...entriesA, ...entriesB]) {
  const b = SAMPLE_CATALOG.find((x) => x.id === e.bookId);
  if (b) usedBooks.set(b.id, b);
}

const user = (a: typeof A) => `
-- ${a.nickname} (${a.email})
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values ('00000000-0000-0000-0000-000000000000', ${q(a.id)}, 'authenticated', 'authenticated', ${q(a.email)},
  extensions.crypt(${q(a.password)}, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, ${json({ nickname: a.nickname })}, now(), now(),
  '', '', '', '', '', '', '', '')
on conflict (id) do update set encrypted_password = excluded.encrypted_password, email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data, email_confirmed_at = now(), updated_at = now();

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (${q(a.id)}, ${q(a.id)}, ${json({ sub: a.id, email: a.email, email_verified: true })}, 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, nickname, bio) values (${q(a.id)}, ${q(a.nickname)}, ${q('BookLog 테스트 계정이에요')})
on conflict (id) do update set nickname = excluded.nickname, bio = excluded.bio;
`;

const sql = `-- =====================================================================
-- BookLog — 테스트 계정 2개 + 샘플 데이터 (자동 생성: npm run demo:seed)
-- schema.sql 을 먼저 실행한 뒤, 이 파일 전체를 SQL Editor 에서 Run 하세요.
-- 다시 실행하면 두 테스트 계정의 데이터가 처음 상태로 되돌아갑니다.
-- 로그인 정보는 앱 코드 src/config/demoAccounts.ts 에 있습니다(공개 체험용).
-- =====================================================================
begin;
${user(A)}${user(B)}
-- 초기화: 테스트 계정이 남긴 기록·글·좋아요·팔로우 삭제
delete from public.library_entries where user_id in ${ids};
delete from public.likes where user_id in ${ids};
delete from public.comments where user_id in ${ids};
delete from public.posts where user_id in ${ids};
delete from public.follows where follower_id in ${ids} or followee_id in ${ids};

-- 도서
insert into public.books (id, isbn, title, subtitle, authors, translators, publisher, published_at, page_count, genre, description, cover_url, cover_tone)
values
${[...usedBooks.values()].map(bookRow).join(',\n')}
on conflict (id) do nothing;

-- 서재
insert into public.library_entries (user_id, book_id, status, added_at, updated_at, finished_at, rating, one_liner, review, spoiler, quotes, place, occasion, tags, read_count, visibility)
values
${[...entriesA.map((e) => entryRow(A.id, e)), ...entriesB.map((e) => entryRow(B.id, e))].join(',\n')};

-- 서로 팔로우
insert into public.follows (follower_id, followee_id) values (${q(A.id)}, ${q(B.id)}), (${q(B.id)}, ${q(A.id)});

-- 게시판
insert into public.posts (id, user_id, kind, body, quote, book_id, spoiler, created_at)
values
${posts.map((p) => `(${q(p.id)}, ${q(p.by)}, ${q(p.kind)}, ${q(p.body)}, ${q('quote' in p ? (p.quote as string) : null)}, ${q(p.book)}, ${p.spoiler}, now() - interval '${p.mins} minutes')`).join(',\n')};

insert into public.comments (post_id, user_id, body, created_at)
values
${comments.map((c) => `(${q(c.post)}, ${q(c.by)}, ${q(c.body)}, now() - interval '${c.mins} minutes')`).join(',\n')};

-- 좋아요
insert into public.likes (kind, target_id, user_id)
values
${[
  ...reviewLikes.map((l) => `('review', ${q(l.target)}, ${q(l.by)})`),
  `('post', ${q(posts[0]!.id)}, ${q(A.id)})`,
  `('post', ${q(posts[1]!.id)}, ${q(B.id)})`,
].join(',\n')}
on conflict do nothing;

commit;
`;

writeFileSync(`${process.cwd()}/supabase/demo_seed.sql`, sql);
console.log(`demo_seed.sql: A ${entriesA.length}권, B ${entriesB.length}권, 글 ${posts.length}개`);
