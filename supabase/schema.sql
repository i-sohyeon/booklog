-- =====================================================================
-- BookLog — Supabase 스키마
-- Supabase 대시보드 › SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다(if not exists / drop policy if exists).
--
-- 프로젝트 생성 시 "Automatically expose new tables"를 껐기 때문에
-- 앱이 쓰는 테이블 권한(grant)을 아래에서 직접 엽니다. 로그인한 사용자(authenticated)만 접근하고,
-- 비로그인(anon)에게는 아무 테이블도 열지 않습니다.
-- 모든 테이블은 RLS로 "쓰기는 본인 것만" 제한합니다.
-- =====================================================================

-- ---------- 프로필 (닉네임은 로그인한 사용자끼리 서로 볼 수 있음) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  bio text,
  -- "내 서재를 친구에게 보여 주기" (읽는 중·읽고 싶어요 포함 책장 목록)
  library_public boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists library_public boolean not null default false;

alter table public.profiles enable row level security;
drop policy if exists "profiles: self read" on public.profiles;
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 가입 시 user_metadata.nickname 으로 프로필 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1)), 24))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 도서 (공용 서지 캐시) ----------
create table if not exists public.books (
  id text primary key,
  isbn text,
  title text not null,
  subtitle text,
  authors text[] not null default '{}',
  translators text[],
  publisher text not null default '',
  published_at text not null default '',
  page_count integer not null check (page_count > 0),
  genre text not null,
  description text not null default '',
  cover_url text,
  cover_tone text,
  updated_at timestamptz not null default now()
);

alter table public.books enable row level security;
drop policy if exists "books: read" on public.books;
create policy "books: read" on public.books for select to authenticated using (true);
drop policy if exists "books: upsert" on public.books;
create policy "books: upsert" on public.books for insert to authenticated with check (true);
drop policy if exists "books: update" on public.books;
create policy "books: update" on public.books for update to authenticated using (true);

-- ---------- 내 서재 (본인만 읽고 쓰기) ----------
create table if not exists public.library_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null references public.books (id),
  status text not null check (status in ('want', 'reading', 'done')),
  added_at timestamptz not null,
  updated_at timestamptz not null,
  finished_at date,
  rating numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  one_liner text check (char_length(one_liner) <= 80),
  review text,
  spoiler boolean not null default false,
  -- 기억하고 싶은 문장: [{id, text, createdAt}] (사진은 아직 기기에만 저장)
  quotes jsonb not null default '[]'::jsonb,
  place text,
  occasion text,
  tags text[] not null default '{}',
  read_count smallint not null default 1 check (read_count >= 1),
  -- 항목별 공개 여부 {rating, oneLiner, review, quotes, context, tags} — 기본 비공개
  visibility jsonb not null default '{}'::jsonb,
  primary key (user_id, book_id),
  check (status <> 'done' or (rating is not null and finished_at is not null))
);

alter table public.library_entries enable row level security;
drop policy if exists "library_entries: owner" on public.library_entries;
create policy "library_entries: owner" on public.library_entries for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 공개 후기 (다른 사람에게는 '공개'로 켠 항목만 보임) ----------
-- 별점을 공개한 다 읽은 책만 나오고, 한 줄 평은 따로 공개했을 때만 채워집니다.
-- 뷰가 소유자 권한으로 library_entries를 읽되, 비공개 항목은 여기서 걸러집니다.
create or replace view public.public_reviews as
select
  e.user_id,
  e.book_id,
  e.rating,
  case when coalesce((e.visibility ->> 'oneLiner')::boolean, false) then e.one_liner end as one_liner,
  case when coalesce((e.visibility ->> 'oneLiner')::boolean, false) then e.spoiler else false end as spoiler,
  e.finished_at,
  e.updated_at
from public.library_entries e
where e.status = 'done'
  and coalesce((e.visibility ->> 'rating')::boolean, false);

-- ---------- 공개 책장 (친구 서재) ----------
-- 책장 공개를 켰거나 별점을 공개한 완독 기록만, 항목은 '공개'로 켠 것만 값이 채워짐
create or replace view public.public_shelf as
select
  e.user_id,
  e.book_id,
  e.status,
  e.added_at,
  e.updated_at,
  e.finished_at,
  e.read_count,
  case when coalesce((e.visibility ->> 'rating')::boolean, false) then e.rating end as rating,
  case when coalesce((e.visibility ->> 'oneLiner')::boolean, false) then e.one_liner end as one_liner,
  case when coalesce((e.visibility ->> 'review')::boolean, false) then e.review end as review,
  case when coalesce((e.visibility ->> 'oneLiner')::boolean, false) or coalesce((e.visibility ->> 'review')::boolean, false)
    then e.spoiler else false end as spoiler,
  case when coalesce((e.visibility ->> 'quotes')::boolean, false) then e.quotes else '[]'::jsonb end as quotes,
  case when coalesce((e.visibility ->> 'context')::boolean, false) then e.place end as place,
  case when coalesce((e.visibility ->> 'context')::boolean, false) then e.occasion end as occasion,
  case when coalesce((e.visibility ->> 'tags')::boolean, false) then e.tags else '{}'::text[] end as tags
from public.library_entries e
join public.profiles p on p.id = e.user_id
where p.library_public
   or (e.status = 'done' and coalesce((e.visibility ->> 'rating')::boolean, false));


-- ---------- 팔로우 ----------
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;
drop policy if exists "follows: read" on public.follows;
create policy "follows: read" on public.follows for select to authenticated using (true);
drop policy if exists "follows: insert own" on public.follows;
create policy "follows: insert own" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "follows: delete own" on public.follows;
create policy "follows: delete own" on public.follows for delete to authenticated using (auth.uid() = follower_id);

-- ---------- 게시판 ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('free', 'request', 'quote')),
  body text not null check (char_length(body) between 1 and 2000),
  quote text check (char_length(quote) <= 500),
  book_id text,
  spoiler boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  spoiler boolean not null default false,
  created_at timestamptz not null default now()
);

-- 좋아요(공감): 게시글(post) · 후기(review, target_id = 'u:<user_id>:<book_id>')
create table if not exists public.likes (
  kind text not null check (kind in ('post', 'review')),
  target_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kind, target_id, user_id)
);

do $$
declare t text;
begin
  foreach t in array array['posts', 'comments', 'likes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: read" on public.%I', t, t);
    execute format('create policy "%s: read" on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "%s: insert own" on public.%I', t, t);
    execute format('create policy "%s: insert own" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s: delete own" on public.%I', t, t);
    execute format('create policy "%s: delete own" on public.%I for delete to authenticated using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------- 독서모임 (migrations/003_clubs.sql 과 같음) ----------

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  book_id text not null,
  description text not null default '' check (char_length(description) <= 300),
  capacity int not null check (capacity between 2 and 30),
  duration_min int not null check (duration_min between 15 and 240),
  -- [{ "week": 1, "range": "1~3장", "startsAt": "2026-11-20T12:00:00.000Z" }, ...]
  sessions jsonb not null default '[]'::jsonb check (jsonb_typeof(sessions) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.club_comments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists clubs_created_idx on public.clubs (created_at desc);
create index if not exists club_comments_club_idx on public.club_comments (club_id, created_at);

-- 정원 확인: 꽉 찬 모임에는 참여할 수 없음 (동시에 눌러도 넘치지 않게 모임 행을 잠금)
create or replace function public.club_capacity_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap int;
  cnt int;
begin
  select capacity into cap from public.clubs where id = new.club_id for update;
  select count(*) into cnt from public.club_members where club_id = new.club_id;
  if cap is not null and cnt >= cap then
    raise exception '모집이 마감된 모임이에요' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists club_members_capacity on public.club_members;
create trigger club_members_capacity before insert on public.club_members
  for each row execute function public.club_capacity_check();

-- 참여자인지 (RLS 안에서 쓰기 위해 security definer)
create or replace function public.is_club_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.club_members where club_id = cid and user_id = auth.uid());
$$;

alter table public.clubs enable row level security;
drop policy if exists "clubs: read" on public.clubs;
create policy "clubs: read" on public.clubs for select to authenticated using (true);
drop policy if exists "clubs: insert own" on public.clubs;
create policy "clubs: insert own" on public.clubs for insert to authenticated with check (auth.uid() = host_id);
drop policy if exists "clubs: update own" on public.clubs;
create policy "clubs: update own" on public.clubs for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);
drop policy if exists "clubs: delete own" on public.clubs;
create policy "clubs: delete own" on public.clubs for delete to authenticated using (auth.uid() = host_id);

alter table public.club_members enable row level security;
drop policy if exists "club_members: read" on public.club_members;
create policy "club_members: read" on public.club_members for select to authenticated using (true);
drop policy if exists "club_members: insert own" on public.club_members;
create policy "club_members: insert own" on public.club_members for insert to authenticated with check (auth.uid() = user_id);
-- 모임장은 나갈 수 없음(모임을 지워야 함)
drop policy if exists "club_members: delete own" on public.club_members;
create policy "club_members: delete own" on public.club_members for delete to authenticated
  using (auth.uid() = user_id and not exists (select 1 from public.clubs c where c.id = club_id and c.host_id = auth.uid()));

alter table public.club_comments enable row level security;
drop policy if exists "club_comments: read" on public.club_comments;
create policy "club_comments: read" on public.club_comments for select to authenticated using (true);
drop policy if exists "club_comments: insert member" on public.club_comments;
create policy "club_comments: insert member" on public.club_comments for insert to authenticated
  with check (auth.uid() = user_id and public.is_club_member(club_id));
drop policy if exists "club_comments: delete own" on public.club_comments;
create policy "club_comments: delete own" on public.club_comments for delete to authenticated using (auth.uid() = user_id);

revoke all on public.clubs, public.club_members, public.club_comments from anon;
revoke all on function public.club_capacity_check() from public, anon;
revoke all on function public.is_club_member(uuid) from public, anon;
grant execute on function public.is_club_member(uuid) to authenticated;
grant select, insert, update, delete on public.clubs to authenticated;
grant select, insert, delete on public.club_members to authenticated;
grant select, insert, delete on public.club_comments to authenticated;

-- 큐레이션 리스트는 아직 기기에만 저장됩니다(다음 단계에서 추가).

-- ---------- 권한 (Data API) ----------
revoke all on public.profiles, public.books, public.library_entries, public.follows,
  public.posts, public.comments, public.likes, public.public_reviews, public.public_shelf from anon;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.books to authenticated;
grant select, insert, update, delete on public.library_entries to authenticated;
grant select on public.public_reviews to authenticated;
grant select on public.public_shelf to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.posts to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, delete on public.likes to authenticated;
