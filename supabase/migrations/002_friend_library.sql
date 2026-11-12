-- =====================================================================
-- BookLog — 친구 서재 놀러가기 (schema.sql 실행 후 한 번 실행)
-- 여러 번 실행해도 안전합니다.
--
-- 1) profiles.library_public : "내 서재를 친구에게 보여 주기" (기본 꺼짐)
--    켜면 읽는 중·읽고 싶어요·다 읽은 책 '목록'이 다른 사용자에게 보입니다.
-- 2) public_shelf 뷰 : 다른 사람에게 보여도 되는 기록만 꺼내는 창구
--    · 책장 공개를 켰거나, 별점을 공개한 다 읽은 책만 행으로 나옴
--    · 별점·한 줄 평·감상·문장·장소/계기·태그는 각 항목을 '공개'로 켠 경우에만 값이 채워짐
-- =====================================================================

alter table public.profiles add column if not exists library_public boolean not null default false;

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

revoke all on public.public_shelf from anon;
grant select on public.public_shelf to authenticated;
