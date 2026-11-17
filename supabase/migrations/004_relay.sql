-- =====================================================================
-- BookLog — 릴레이 독서 토론 (schema.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다. 기존 데이터는 지우거나 바꾸지 않습니다.
--
-- 게임방처럼 초대 코드로 친구를 모아, 한 권의 책을 두고 차례대로 바통을 넘기며 이야기합니다.
--   1) 방장이 방을 만들면 6자리 초대 코드가 생김 (create_relay)
--   2) 친구가 코드나 링크로 참여 (join_relay, 최대 8명, 시작 전까지만)
--   3) 방장이 시작 (start_relay, 2명 이상) → 참여한 순서대로 차례
--   4) 차례인 사람만 글 + 다음 사람에게 넘길 질문을 남김 (post_relay)
--   5) 정한 바퀴 수만큼 돌면 완주. 방장은 응답 없는 차례를 넘길 수 있음 (skip_relay_turn)
-- 모든 변경은 아래 함수로만 하고(차례·정원 규칙을 서버에서 지킴), 표는 참여자만 읽을 수 있습니다.
-- =====================================================================

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
