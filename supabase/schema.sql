-- =====================================================================
-- BookLog — Supabase 스키마 (리디자인: 별점·한 줄 평 중심)
-- Supabase 대시보드 › SQL Editor 에 붙여넣어 한 번 실행하세요.
-- 모든 사용자 데이터는 RLS로 "본인만" 읽고 쓸 수 있습니다.
-- =====================================================================

-- ---------- 프로필 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update using (auth.uid() = id);

-- 가입 시 user_metadata.nickname 으로 프로필 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1)))
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

-- ---------- 내 서재 (진도 기록 없음: 상태 + 다 읽은 책의 별점·한 줄 평) ----------
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
  -- 다 읽은 책은 별점·완독일 필수 (나머지는 선택)
  check (status <> 'done' or (rating is not null and finished_at is not null))
);

-- 커뮤니티(posts, comments, likes)·독서모임(clubs, club_members, club_sessions)·
-- 큐레이션 리스트 테이블은 소셜 서버 연동 단계에서 추가합니다.

-- ---------- RLS: 본인 데이터만 ----------
do $$
declare t text;
begin
  foreach t in array array['library_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: owner" on public.%I', t, t);
    execute format(
      'create policy "%s: owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;
