-- =====================================================================
-- BookLog — 릴레이: 공부형 토론 + 함께 만드는 용어장 (007_relay_settings.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다. 이미 만든 릴레이는 그대로 '감상형'으로 남습니다.
--
--   - relays.mode: 'talk'(감상형, 기본) | 'study'(공부형 — 경제·인문·과학 같은 책)
--     공부형은 바통마다 용어 → 요약 → 물음표 → 현실 대입 → 내 생각 순서로 질문 카드가 나옴(화면에서 계산)
--   - create_relay(책, 이름, 바퀴, 시간, 방식): 방식을 받는 새 버전 (예전 4개짜리도 그대로 동작)
--   - relay_terms: 릴레이 참여자끼리 함께 채우는 용어장
--       읽기·추가는 참여자 누구나, 고치기·지우기는 쓴 사람만. 같은 용어(대소문자 무시)는 한 번만.
-- =====================================================================

alter table public.relays add column if not exists mode text not null default 'talk';
alter table public.relays drop constraint if exists relays_mode_check;
alter table public.relays add constraint relays_mode_check check (mode in ('talk', 'study'));

create or replace function public.create_relay(p_book_id text, p_title text, p_rounds int, p_turn_hours int, p_mode text)
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
  if p_mode is null or p_mode not in ('talk', 'study') then raise exception '토론 방식을 다시 골라 주세요' using errcode = 'P0001'; end if;
  insert into public.relays (host_id, book_id, title, code, rounds, turn_hours, mode)
  values (me, p_book_id, trim(p_title), public.gen_relay_code(), p_rounds, p_turn_hours, p_mode)
  returning * into r;
  insert into public.relay_members (relay_id, user_id, seat) values (r.id, me, 0);
  return r;
end;
$$;

revoke all on function public.create_relay(text, text, int, int, text) from public, anon;
grant execute on function public.create_relay(text, text, int, int, text) to authenticated;

-- ---------- 용어장 ----------
create table if not exists public.relay_terms (
  id uuid primary key default gen_random_uuid(),
  relay_id uuid not null references public.relays (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null check (char_length(btrim(term)) between 1 and 30),
  meaning text not null check (char_length(btrim(meaning)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists relay_terms_unique_idx on public.relay_terms (relay_id, lower(btrim(term)));
create index if not exists relay_terms_relay_idx on public.relay_terms (relay_id, created_at);

alter table public.relay_terms enable row level security;

drop policy if exists "relay_terms: member read" on public.relay_terms;
create policy "relay_terms: member read" on public.relay_terms
  for select to authenticated using (public.is_relay_member(relay_id));

drop policy if exists "relay_terms: member insert" on public.relay_terms;
create policy "relay_terms: member insert" on public.relay_terms
  for insert to authenticated with check (user_id = auth.uid() and public.is_relay_member(relay_id));

drop policy if exists "relay_terms: author update" on public.relay_terms;
create policy "relay_terms: author update" on public.relay_terms
  for update to authenticated using (user_id = auth.uid() and public.is_relay_member(relay_id))
  with check (user_id = auth.uid() and public.is_relay_member(relay_id));

drop policy if exists "relay_terms: author delete" on public.relay_terms;
create policy "relay_terms: author delete" on public.relay_terms
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.relay_terms to authenticated;
