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

-- ---------- 릴레이 독서 토론 (migrations/004_relay.sql 과 같음) ----------

create table if not exists public.relays (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  title text not null check (char_length(title) between 1 and 40),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'done')),
  rounds int not null default 2 check (rounds between 1 and 3),
  turn_hours int not null default 24 check (turn_hours between 1 and 168),
  -- 지금까지 넘어간 바통 수 = 지금 차례의 번호(0부터). 차례인 사람의 seat = turn % 참여자 수
  turn int not null default 0,
  turn_started_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.relay_members (
  relay_id uuid not null references public.relays (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seat int not null check (seat between 0 and 7),
  joined_at timestamptz not null default now(),
  primary key (relay_id, user_id),
  unique (relay_id, seat)
);

create table if not exists public.relay_posts (
  id uuid primary key default gen_random_uuid(),
  relay_id uuid not null references public.relays (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  turn int not null,
  body text not null check (char_length(body) between 1 and 1000),
  question text check (char_length(question) <= 200),
  created_at timestamptz not null default now(),
  unique (relay_id, turn)
);

create index if not exists relay_members_user_idx on public.relay_members (user_id);
create index if not exists relay_posts_relay_idx on public.relay_posts (relay_id, turn);

-- ---------- 함수 ----------
create or replace function public.is_relay_member(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.relay_members where relay_id = rid and user_id = auth.uid());
$$;

-- 헷갈리는 글자(0·O·1·I)를 뺀 6자리 코드
create or replace function public.gen_relay_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.relays where code = c);
  end loop;
  return c;
end;
$$;

create or replace function public.create_relay(p_book_id text, p_title text, p_rounds int, p_turn_hours int)
returns public.relays
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
begin
  if me is null then raise exception '로그인이 필요해요' using errcode = '42501'; end if;
  insert into public.relays (host_id, book_id, title, code, rounds, turn_hours)
  values (me, p_book_id, trim(p_title), public.gen_relay_code(), p_rounds, p_turn_hours)
  returning * into r;
  insert into public.relay_members (relay_id, user_id, seat) values (r.id, me, 0);
  return r;
end;
$$;

create or replace function public.join_relay(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  n int;
begin
  if me is null then raise exception '로그인이 필요해요' using errcode = '42501'; end if;
  select * into r from public.relays where code = upper(trim(p_code)) for update;
  if not found then raise exception '초대 코드를 찾을 수 없어요' using errcode = 'P0002'; end if;
  if exists (select 1 from public.relay_members where relay_id = r.id and user_id = me) then return r.id; end if;
  if r.status <> 'waiting' then raise exception '이미 시작한 릴레이예요' using errcode = 'P0001'; end if;
  select count(*) into n from public.relay_members where relay_id = r.id;
  if n >= 8 then raise exception '정원(8명)이 찼어요' using errcode = 'P0001'; end if;
  insert into public.relay_members (relay_id, user_id, seat) values (r.id, me, n);
  return r.id;
end;
$$;

create or replace function public.start_relay(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.relays;
  n int;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or r.host_id <> auth.uid() then raise exception '방장만 시작할 수 있어요' using errcode = '42501'; end if;
  if r.status <> 'waiting' then raise exception '이미 시작한 릴레이예요' using errcode = 'P0001'; end if;
  select count(*) into n from public.relay_members where relay_id = p_id;
  if n < 2 then raise exception '2명 이상 모여야 시작할 수 있어요' using errcode = 'P0001'; end if;
  update public.relays set status = 'active', started_at = now(), turn_started_at = now() where id = p_id;
end;
$$;

-- 시작 전 나가기: 방장이 아니면 자리에서 빠지고 뒷사람이 한 칸씩 당겨 앉음. 방장은 방을 없앰.
create or replace function public.leave_relay(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  my_seat int;
begin
  select * into r from public.relays where id = p_id for update;
  if not found then return; end if;
  if r.status <> 'waiting' then raise exception '시작한 뒤에는 나갈 수 없어요' using errcode = 'P0001'; end if;
  if r.host_id = me then
    delete from public.relays where id = p_id;
    return;
  end if;
  delete from public.relay_members where relay_id = p_id and user_id = me returning seat into my_seat;
  if my_seat is not null then
    update public.relay_members set seat = seat - 1 where relay_id = p_id and seat > my_seat;
  end if;
end;
$$;

-- 바통 넘기기: 다음 차례로 (마지막이면 완주)
create or replace function public.advance_relay(r public.relays)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*) into n from public.relay_members where relay_id = r.id;
  if r.turn + 1 >= r.rounds * n then
    update public.relays set turn = r.turn + 1, status = 'done', finished_at = now(), turn_started_at = null where id = r.id;
  else
    update public.relays set turn = r.turn + 1, turn_started_at = now() where id = r.id;
  end if;
end;
$$;

create or replace function public.post_relay(p_id uuid, p_body text, p_question text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  n int;
  my_seat int;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or not public.is_relay_member(p_id) then raise exception '참여한 릴레이가 아니에요' using errcode = '42501'; end if;
  if r.status <> 'active' then raise exception '진행 중인 릴레이가 아니에요' using errcode = 'P0001'; end if;
  select count(*) into n from public.relay_members where relay_id = p_id;
  select seat into my_seat from public.relay_members where relay_id = p_id and user_id = me;
  if my_seat <> r.turn % n then raise exception '지금은 내 차례가 아니에요' using errcode = 'P0001'; end if;
  insert into public.relay_posts (relay_id, user_id, turn, body, question)
  values (p_id, me, r.turn, trim(p_body), nullif(trim(coalesce(p_question, '')), ''));
  perform public.advance_relay(r);
end;
$$;

-- 방장: 응답 없는 차례 넘기기
create or replace function public.skip_relay_turn(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.relays;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or r.host_id <> auth.uid() then raise exception '방장만 차례를 넘길 수 있어요' using errcode = '42501'; end if;
  if r.status <> 'active' then raise exception '진행 중인 릴레이가 아니에요' using errcode = 'P0001'; end if;
  perform public.advance_relay(r);
end;
$$;

-- ---------- 권한 (RLS): 읽기는 참여자만, 쓰기는 위 함수로만 ----------
alter table public.relays enable row level security;
drop policy if exists "relays: member read" on public.relays;
create policy "relays: member read" on public.relays for select to authenticated using (public.is_relay_member(id));

alter table public.relay_members enable row level security;
drop policy if exists "relay_members: member read" on public.relay_members;
create policy "relay_members: member read" on public.relay_members for select to authenticated using (public.is_relay_member(relay_id));

alter table public.relay_posts enable row level security;
drop policy if exists "relay_posts: member read" on public.relay_posts;
create policy "relay_posts: member read" on public.relay_posts for select to authenticated using (public.is_relay_member(relay_id));

revoke all on public.relays, public.relay_members, public.relay_posts from anon, authenticated;
grant select on public.relays, public.relay_members, public.relay_posts to authenticated;

revoke all on function public.is_relay_member(uuid), public.gen_relay_code(), public.advance_relay(public.relays),
  public.create_relay(text, text, int, int), public.join_relay(text), public.start_relay(uuid),
  public.leave_relay(uuid), public.post_relay(uuid, text, text), public.skip_relay_turn(uuid) from public, anon;
grant execute on function public.is_relay_member(uuid), public.create_relay(text, text, int, int), public.join_relay(text),
  public.start_relay(uuid), public.leave_relay(uuid), public.post_relay(uuid, text, text), public.skip_relay_turn(uuid) to authenticated;

-- ---------- 릴레이: 시작한 뒤에도 참여 (migrations/005_relay_join_anytime.sql 과 같음) ----------

alter table public.relays add column if not exists current_seat int not null default 0;
alter table public.relays add column if not exists lap int not null default 1;
alter table public.relay_posts add column if not exists lap int;
alter table public.relay_posts add column if not exists skipped boolean not null default false;

-- 넘긴 차례는 글이 없음
alter table public.relay_posts alter column body drop not null;
alter table public.relay_posts drop constraint if exists relay_posts_body_check;
alter table public.relay_posts drop constraint if exists relay_posts_body_or_skipped;
alter table public.relay_posts add constraint relay_posts_body_or_skipped
  check ((skipped and body is null) or (not skipped and char_length(body) between 1 and 1000));

-- 이미 진행 중이던 릴레이는 예전 계산으로 자리·바퀴를 채움 (한 번만)
update public.relays r
set current_seat = r.turn % greatest(1, m.n),
    lap = least(r.rounds, r.turn / greatest(1, m.n) + 1)
from (select relay_id, count(*)::int as n from public.relay_members group by relay_id) m
where m.relay_id = r.id and r.status = 'active' and r.turn > 0 and r.current_seat = 0 and r.lap = 1;

update public.relay_posts p
set lap = p.turn / greatest(1, m.n) + 1
from (select relay_id, count(*)::int as n from public.relay_members group by relay_id) m
where m.relay_id = p.relay_id and p.lap is null;

-- 참여: 완주 전이면 언제든 (진행 중이면 맨 뒷자리)
create or replace function public.join_relay(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  n int;
begin
  if me is null then raise exception '로그인이 필요해요' using errcode = '42501'; end if;
  select * into r from public.relays where code = upper(trim(p_code)) for update;
  if not found then raise exception '초대 코드를 찾을 수 없어요' using errcode = 'P0002'; end if;
  if exists (select 1 from public.relay_members where relay_id = r.id and user_id = me) then return r.id; end if;
  if r.status = 'done' then raise exception '이미 완주한 릴레이예요' using errcode = 'P0001'; end if;
  select count(*) into n from public.relay_members where relay_id = r.id;
  if n >= 8 then raise exception '정원(8명)이 찼어요' using errcode = 'P0001'; end if;
  insert into public.relay_members (relay_id, user_id, seat) values (r.id, me, n);
  return r.id;
end;
$$;

-- 바통 넘기기: 다음 자리로, 마지막 자리 다음은 1번 자리 + 다음 바퀴, 정한 바퀴를 넘기면 완주
create or replace function public.advance_relay(r public.relays)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  next_seat int := r.current_seat + 1;
  next_lap int := r.lap;
begin
  select count(*) into n from public.relay_members where relay_id = r.id;
  if next_seat >= n then
    next_seat := 0;
    next_lap := r.lap + 1;
  end if;
  if next_lap > r.rounds then
    update public.relays set turn = r.turn + 1, status = 'done', finished_at = now(), turn_started_at = null where id = r.id;
  else
    update public.relays set turn = r.turn + 1, current_seat = next_seat, lap = next_lap, turn_started_at = now() where id = r.id;
  end if;
end;
$$;

create or replace function public.post_relay(p_id uuid, p_body text, p_question text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  my_seat int;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or not public.is_relay_member(p_id) then raise exception '참여한 릴레이가 아니에요' using errcode = '42501'; end if;
  if r.status <> 'active' then raise exception '진행 중인 릴레이가 아니에요' using errcode = 'P0001'; end if;
  select seat into my_seat from public.relay_members where relay_id = p_id and user_id = me;
  if my_seat <> r.current_seat then raise exception '지금은 내 차례가 아니에요' using errcode = 'P0001'; end if;
  insert into public.relay_posts (relay_id, user_id, turn, lap, body, question)
  values (p_id, me, r.turn, r.lap, trim(p_body), nullif(trim(coalesce(p_question, '')), ''));
  perform public.advance_relay(r);
end;
$$;

-- 방장: 응답 없는 차례 넘기기 (누구 차례였는지 기록에 남김)
create or replace function public.skip_relay_turn(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.relays;
  who uuid;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or r.host_id <> auth.uid() then raise exception '방장만 차례를 넘길 수 있어요' using errcode = '42501'; end if;
  if r.status <> 'active' then raise exception '진행 중인 릴레이가 아니에요' using errcode = 'P0001'; end if;
  select user_id into who from public.relay_members where relay_id = p_id and seat = r.current_seat;
  insert into public.relay_posts (relay_id, user_id, turn, lap, body, skipped) values (p_id, who, r.turn, r.lap, null, true);
  perform public.advance_relay(r);
end;
$$;

revoke all on function public.join_relay(text), public.advance_relay(public.relays), public.post_relay(uuid, text, text),
  public.skip_relay_turn(uuid) from public, anon;
grant execute on function public.join_relay(text), public.post_relay(uuid, text, text), public.skip_relay_turn(uuid) to authenticated;

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

-- =====================================================================
-- 릴레이 멤버 내보내기 (migrations/006_relay_kick.sql 과 동일)
create table if not exists public.relay_bans (
  relay_id uuid not null references public.relays (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  banned_at timestamptz not null default now(),
  primary key (relay_id, user_id)
);

alter table public.relay_bans enable row level security;
-- 직접 읽기·쓰기는 막고(정책 없음) 아래 함수에서만 사용
revoke all on public.relay_bans from anon, authenticated;

-- 빈 자리 뒤 사람들을 한 칸씩 앞으로 (앞사람부터 한 명씩 → 자리 번호 중복 없음)
create or replace function public.compact_relay_seats(p_id uuid, p_from_seat int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  for m in select user_id, seat from public.relay_members where relay_id = p_id and seat > p_from_seat order by seat asc loop
    update public.relay_members set seat = m.seat - 1 where relay_id = p_id and user_id = m.user_id;
  end loop;
end;
$$;

-- 시작 전 나가기 (자리 당기기만 위 함수로 바꿈)
create or replace function public.leave_relay(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  my_seat int;
begin
  select * into r from public.relays where id = p_id for update;
  if not found then return; end if;
  if r.status <> 'waiting' then raise exception '시작한 뒤에는 나갈 수 없어요' using errcode = 'P0001'; end if;
  if r.host_id = me then
    delete from public.relays where id = p_id;
    return;
  end if;
  delete from public.relay_members where relay_id = p_id and user_id = me returning seat into my_seat;
  if my_seat is not null then
    perform public.compact_relay_seats(p_id, my_seat);
  end if;
end;
$$;

create or replace function public.kick_relay_member(p_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.relays;
  kicked_seat int;
  n int;
  next_seat int;
  next_lap int;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or r.host_id <> auth.uid() then raise exception '방장만 멤버를 내보낼 수 있어요' using errcode = '42501'; end if;
  if p_user_id = r.host_id then raise exception '방장은 내보낼 수 없어요' using errcode = 'P0001'; end if;
  if r.status = 'done' then raise exception '완주한 릴레이에서는 내보낼 수 없어요' using errcode = 'P0001'; end if;

  delete from public.relay_members where relay_id = p_id and user_id = p_user_id returning seat into kicked_seat;
  if kicked_seat is null then raise exception '이미 릴레이에 없는 멤버예요' using errcode = 'P0002'; end if;
  perform public.compact_relay_seats(p_id, kicked_seat);
  insert into public.relay_bans (relay_id, user_id) values (p_id, p_user_id) on conflict do nothing;

  if r.status <> 'active' then return; end if;

  select count(*) into n from public.relay_members where relay_id = p_id;
  if kicked_seat < r.current_seat then
    -- 앞자리가 빠짐: 같은 사람이 계속 차례
    update public.relays set current_seat = r.current_seat - 1 where id = p_id;
  elsif kicked_seat = r.current_seat then
    -- 차례인 사람이 빠짐: 그 자리로 당겨 앉은 다음 사람에게 바통 (마지막 자리였으면 다음 바퀴)
    next_seat := r.current_seat;
    next_lap := r.lap;
    if next_seat >= n then
      next_seat := 0;
      next_lap := r.lap + 1;
    end if;
    if next_lap > r.rounds or n = 0 then
      update public.relays set status = 'done', finished_at = now(), turn_started_at = null where id = p_id;
    else
      update public.relays set current_seat = next_seat, lap = next_lap, turn_started_at = now() where id = p_id;
    end if;
  end if;
end;
$$;

-- 참여: 내보낸 사람은 다시 들어올 수 없음 (그 외는 005와 같음)
create or replace function public.join_relay(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
  n int;
begin
  if me is null then raise exception '로그인이 필요해요' using errcode = '42501'; end if;
  select * into r from public.relays where code = upper(trim(p_code)) for update;
  if not found then raise exception '초대 코드를 찾을 수 없어요' using errcode = 'P0002'; end if;
  if exists (select 1 from public.relay_members where relay_id = r.id and user_id = me) then return r.id; end if;
  if exists (select 1 from public.relay_bans where relay_id = r.id and user_id = me) then
    raise exception '방장이 내보낸 릴레이에는 다시 들어갈 수 없어요' using errcode = '42501';
  end if;
  if r.status = 'done' then raise exception '이미 완주한 릴레이예요' using errcode = 'P0001'; end if;
  select count(*) into n from public.relay_members where relay_id = r.id;
  if n >= 8 then raise exception '정원(8명)이 찼어요' using errcode = 'P0001'; end if;
  insert into public.relay_members (relay_id, user_id, seat) values (r.id, me, n);
  return r.id;
end;
$$;

revoke all on function public.compact_relay_seats(uuid, int), public.kick_relay_member(uuid, uuid),
  public.leave_relay(uuid), public.join_relay(text) from public, anon;
grant execute on function public.kick_relay_member(uuid, uuid), public.leave_relay(uuid), public.join_relay(text) to authenticated;

-- =====================================================================
-- 릴레이 바퀴 2~5, 시작 전 설정 바꾸기 (migrations/007_relay_settings.sql 과 동일)
alter table public.relays drop constraint if exists relays_rounds_check;
alter table public.relays add constraint relays_rounds_check check (rounds between 1 and 5);

create or replace function public.create_relay(p_book_id text, p_title text, p_rounds int, p_turn_hours int)
returns public.relays
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.relays;
begin
  if me is null then raise exception '로그인이 필요해요' using errcode = '42501'; end if;
  if p_rounds is null or p_rounds not between 2 and 5 then raise exception '바퀴 수는 2~5바퀴로 정해 주세요' using errcode = 'P0001'; end if;
  if p_turn_hours is null or p_turn_hours not between 1 and 168 then raise exception '한 사람당 시간을 다시 골라 주세요' using errcode = 'P0001'; end if;
  insert into public.relays (host_id, book_id, title, code, rounds, turn_hours)
  values (me, p_book_id, trim(p_title), public.gen_relay_code(), p_rounds, p_turn_hours)
  returning * into r;
  insert into public.relay_members (relay_id, user_id, seat) values (r.id, me, 0);
  return r;
end;
$$;

create or replace function public.update_relay_settings(p_id uuid, p_rounds int, p_turn_hours int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.relays;
begin
  select * into r from public.relays where id = p_id for update;
  if not found or r.host_id <> auth.uid() then raise exception '방장만 설정을 바꿀 수 있어요' using errcode = '42501'; end if;
  if r.status <> 'waiting' then raise exception '시작한 뒤에는 설정을 바꿀 수 없어요' using errcode = 'P0001'; end if;
  if p_rounds is null or p_rounds not between 2 and 5 then raise exception '바퀴 수는 2~5바퀴로 정해 주세요' using errcode = 'P0001'; end if;
  if p_turn_hours is null or p_turn_hours not between 1 and 168 then raise exception '한 사람당 시간을 다시 골라 주세요' using errcode = 'P0001'; end if;
  update public.relays set rounds = p_rounds, turn_hours = p_turn_hours where id = p_id;
end;
$$;

revoke all on function public.create_relay(text, text, int, int), public.update_relay_settings(uuid, int, int) from public, anon;
grant execute on function public.create_relay(text, text, int, int), public.update_relay_settings(uuid, int, int) to authenticated;
