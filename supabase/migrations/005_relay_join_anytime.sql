-- =====================================================================
-- BookLog — 릴레이: 시작한 뒤에도 참여할 수 있게 (004_relay.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다. 기존 릴레이와 바통 기록은 그대로 유지됩니다.
--
-- 지금까지는 '지금 차례 = 바통 수 % 참여자 수'로 계산해서, 중간에 사람이 늘면 차례가 엉켰습니다.
-- 이제 '지금 차례인 자리(current_seat)'와 '몇 바퀴째(lap)'를 따로 저장합니다.
--   - 진행 중에 들어온 사람은 맨 뒷자리에 앉고, 바통이 그 자리에 오면 차례가 됩니다.
--   - 마지막 자리 다음은 다시 1번 자리, 바퀴 수가 하나 늘어남. 정한 바퀴를 넘기면 완주.
--   - 넘긴 차례도 바통 기록에 남깁니다(누구 차례였는지 보이게).
-- =====================================================================

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
