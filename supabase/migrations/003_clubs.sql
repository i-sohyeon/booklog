-- =====================================================================
-- BookLog — 독서모임을 서버에 저장 (schema.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다. 기존 데이터는 지우거나 바꾸지 않습니다.
--
-- 지금까지 모임은 브라우저에만 저장돼, 로그아웃하거나 다른 기기에서 열면 사라지고
-- 다른 사람에게도 보이지 않았습니다. 이 파일을 실행하면 로그인한 사용자끼리 모임을 함께 씁니다.
--
-- 1) clubs         : 모임 (모임장 = host_id, 회차 일정은 sessions jsonb)
-- 2) club_members  : 참여자 (모임장도 한 줄), 정원이 차면 더 참여할 수 없음
-- 3) club_comments : 모임 토론 글 (참여자만 쓰기)
-- =====================================================================

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

-- ---------- 권한 (RLS) ----------
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
