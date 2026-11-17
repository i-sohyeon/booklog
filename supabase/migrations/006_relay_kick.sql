-- =====================================================================
-- BookLog — 릴레이: 방장이 멤버 내보내기 (005_relay_join_anytime.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다. 기존 릴레이와 바통 기록은 그대로 유지됩니다.
--
-- kick_relay_member(릴레이, 사용자)
--   - 방장만, 방장 자신은 내보낼 수 없음, 완주한 릴레이는 그대로 둠
--   - 내보낸 사람은 자리에서 빠지고 뒷사람이 한 칸씩 당겨 앉음
--   - 진행 중이면 차례를 맞춰 줌
--       · 앞자리 사람이 빠지면 → 지금 차례인 사람이 그대로 차례 (자리 번호만 하나 줄어듦)
--       · 지금 차례인 사람이 빠지면 → 바로 다음 사람에게 바통 (마지막 자리였으면 다음 바퀴, 정한 바퀴를 넘기면 완주)
--   - 내보낸 사람은 이 릴레이를 볼 수 없고, 초대 코드로 다시 들어올 수 없음 (relay_bans)
--   - 그 사람이 남긴 바통 글은 기록에 그대로 남음
-- 함께: 자리 당기기를 한 명씩 순서대로 하도록 고쳐, 같은 자리 번호가 잠깐 겹치는 오류를 막음 (나가기도 동일)
-- =====================================================================

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
