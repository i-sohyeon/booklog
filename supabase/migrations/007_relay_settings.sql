-- =====================================================================
-- BookLog — 릴레이: 바퀴 2~5, 시작 전 설정 바꾸기 (006_relay_kick.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다. 이미 만든 릴레이는 그대로 둡니다(예전 1바퀴 릴레이도 유지).
--
--   - 새로 만드는 릴레이는 2~5바퀴
--   - update_relay_settings(릴레이, 바퀴, 한 사람당 시간): 방장만, 시작 전(대기 중)에만
-- =====================================================================

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
