-- =====================================================================
-- BookLog — Supabase 스키마 (2차)
-- Supabase 대시보드 › SQL Editor 에 붙여넣어 한 번 실행하세요.
-- 모든 사용자 데이터는 RLS로 "본인만" 읽고 쓸 수 있습니다.
-- 공개 범위(visibility) 컬럼은 3차 소셜 기능에서 읽기 정책을 확장할 때 사용합니다.
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

-- ---------- 내 서재 ----------
create table if not exists public.library_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null references public.books (id),
  status text not null check (status in ('want', 'reading', 'done', 'paused')),
  added_at timestamptz not null,
  updated_at timestamptz not null,
  started_at date,
  finished_at date,
  current_page integer not null default 0 check (current_page >= 0),
  rating numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  review text,
  review_visibility text check (review_visibility in ('public', 'friends', 'private')),
  primary key (user_id, book_id)
);

-- ---------- 메모 · 문장 ----------
create table if not exists public.reading_notes (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null references public.books (id),
  kind text not null check (kind in ('memo', 'quote')),
  content text not null check (char_length(content) between 1 and 2000),
  page integer check (page > 0),
  visibility text not null default 'private' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null,
  updated_at timestamptz,
  primary key (user_id, id)
);
create index if not exists reading_notes_user_created on public.reading_notes (user_id, created_at desc);

-- ---------- 하루 독서 기록 ----------
create table if not exists public.reading_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  book_id text not null references public.books (id),
  pages integer not null check (pages > 0),
  primary key (user_id, date, book_id)
);

-- ---------- 연간 목표 ----------
create table if not exists public.reading_goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null,
  target_books integer not null check (target_books between 1 and 365),
  primary key (user_id, year)
);

-- ---------- RLS: 본인 데이터만 ----------
do $$
declare t text;
begin
  foreach t in array array['library_entries', 'reading_notes', 'reading_sessions', 'reading_goals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: owner" on public.%I', t, t);
    execute format(
      'create policy "%s: owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;
