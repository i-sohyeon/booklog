-- =====================================================================
-- BookLog — 테스트 계정 2개 + 샘플 데이터 (자동 생성: npm run demo:seed)
-- schema.sql(또는 migrations/002_friend_library.sql 까지) 실행한 뒤, 이 파일 전체를 SQL Editor 에서 Run 하세요.
-- 다시 실행하면 두 테스트 계정의 데이터가 처음 상태로 되돌아갑니다.
-- 로그인 정보는 앱 코드 src/config/demoAccounts.ts 에 있습니다(공개 체험용).
-- =====================================================================
begin;

-- 테스트독자A (demo-a@booklog.test)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values ('00000000-0000-0000-0000-000000000000', 'd0d0a000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'demo-a@booklog.test',
  extensions.crypt('HRUuAq5lZSLhDzUu', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{"nickname":"테스트독자A"}'::jsonb, now(), now(),
  '', '', '', '', '', '', '', '')
on conflict (id) do update set encrypted_password = excluded.encrypted_password, email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data, email_confirmed_at = now(), updated_at = now();

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0a000-0000-4000-8000-00000000000a', '{"sub":"d0d0a000-0000-4000-8000-00000000000a","email":"demo-a@booklog.test","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, nickname, bio, library_public) values ('d0d0a000-0000-4000-8000-00000000000a', '테스트독자A', 'BookLog 테스트 계정이에요', true)
on conflict (id) do update set nickname = excluded.nickname, bio = excluded.bio, library_public = true;

-- 테스트독자B (demo-b@booklog.test)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values ('00000000-0000-0000-0000-000000000000', 'd0d0b000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'demo-b@booklog.test',
  extensions.crypt('7-EOViQ3pq8zHDRm', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{"nickname":"테스트독자B"}'::jsonb, now(), now(),
  '', '', '', '', '', '', '', '')
on conflict (id) do update set encrypted_password = excluded.encrypted_password, email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data, email_confirmed_at = now(), updated_at = now();

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0d0b000-0000-4000-8000-00000000000b', 'd0d0b000-0000-4000-8000-00000000000b', '{"sub":"d0d0b000-0000-4000-8000-00000000000b","email":"demo-b@booklog.test","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, nickname, bio, library_public) values ('d0d0b000-0000-4000-8000-00000000000b', '테스트독자B', 'BookLog 테스트 계정이에요', true)
on conflict (id) do update set nickname = excluded.nickname, bio = excluded.bio, library_public = true;

-- 초기화: 테스트 계정이 남긴 기록·글·좋아요·팔로우 삭제
delete from public.library_entries where user_id in ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b');
delete from public.likes where user_id in ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b');
delete from public.comments where user_id in ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b');
delete from public.posts where user_id in ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b');
delete from public.follows where follower_id in ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b') or followee_id in ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b');

-- 도서
insert into public.books (id, isbn, title, subtitle, authors, translators, publisher, published_at, page_count, genre, description, cover_url, cover_tone)
values
('bk-033', null, '위대한 개츠비', null, array['F. 스콧 피츠제럴드']::text[], null, '민음사', '2010-01', 260, '소설', '재즈 시대 뉴욕, 한 사람을 향한 개츠비의 꿈과 그 끝.', null, 'mustard'),
('bk-012', null, '이처럼 사소한 것들', null, array['클레어 키건']::text[], array['홍한별']::text[], '다산책방', '2023-11', 132, '소설', '1985년 아일랜드의 작은 마을, 크리스마스를 앞둔 한 남자의 조용한 선택.', null, 'charcoal'),
('bk-001', null, '작별하지 않는다', null, array['한강']::text[], null, '문학동네', '2021-09', 332, '소설', '눈이 내리는 섬에서 시작되는, 끝내 작별하지 않으려는 이들의 이야기. 기억과 애도에 관한 깊은 사유를 담은 장편소설.', null, 'navy'),
('bk-032', null, '노인과 바다', null, array['어니스트 헤밍웨이']::text[], null, '민음사', '2012-03', 152, '소설', '거대한 청새치와 사투를 벌이는 늙은 어부의 이야기.', null, 'sea'),
('bk-003', null, '우리가 빛의 속도로 갈 수 없다면', null, array['김초엽']::text[], null, '허블', '2019-06', 344, '소설', '다정하고 쓸쓸한 상상력으로 그려낸 일곱 편의 SF 단편.', null, 'sea'),
('bk-025', null, '언어의 온도', null, array['이기주']::text[], null, '말글터', '2016-08', 304, '에세이', '일상에서 마주친 말과 글에 담긴 온기를 기록한 산문집.', null, 'clay'),
('bk-007', null, '코스모스', null, array['칼 세이건']::text[], array['홍승수']::text[], '사이언스북스', '2006-12', 719, '과학', '우주와 생명, 인간 문명에 관한 가장 아름다운 과학 교양서.', null, 'navy'),
('bk-024', null, '어린 왕자', null, array['앙투안 드 생텍쥐페리']::text[], array['황현산']::text[], '열린책들', '2015-10', 160, '소설', '어른이 된 모든 이에게 건네는 작은 왕자의 이야기.', null, 'sea'),
('bk-028', null, '미움받을 용기', null, array['기시미 이치로','고가 후미타케']::text[], array['전경아']::text[], '인플루엔셜', '2014-11', 336, '자기계발', '철학자와 청년의 대화로 풀어낸 아들러 심리학 입문서.', null, 'sea'),
('bk-005', null, '여행의 이유', null, array['김영하']::text[], null, '문학동네', '2019-04', 216, '에세이', '여행이라는 경험을 통해 삶과 인간을 바라보는 아홉 편의 산문.', null, 'clay'),
('bk-008', null, '아몬드', null, array['손원평']::text[], null, '창비', '2017-03', 264, '소설', '감정을 느끼지 못하는 소년이 세상과 관계 맺는 법을 배워가는 성장소설.', null, 'rose'),
('bk-009', null, '데미안', null, array['헤르만 헤세']::text[], array['전영애']::text[], '민음사', '2000-12', 248, '소설', '자기 자신에게 이르는 길을 찾아가는 한 젊은이의 내면 성장기.', null, 'plum'),
('bk-015', null, '모순', null, array['양귀자']::text[], null, '쓰다', '2013-04', 308, '소설', '스물다섯 살 안진진이 삶의 모순 속에서 자신의 선택을 찾아가는 이야기.', null, 'rose'),
('bk-026', null, '하마터면 열심히 살 뻔했다', null, array['하완']::text[], null, '웅진지식하우스', '2018-04', 260, '에세이', '열심히만 살던 마흔의 작가가 잠시 멈춰 서서 적은 솔직한 이야기.', null, 'mustard'),
('bk-021', null, '이기적 유전자', null, array['리처드 도킨스']::text[], array['홍영남','이상임']::text[], '을유문화사', '2018-10', 632, '과학', '유전자의 관점에서 생명과 진화를 바라본 고전.', null, 'charcoal'),
('bk-002', null, '소년이 온다', null, array['한강']::text[], null, '창비', '2014-05', 216, '소설', '1980년 5월 광주를 살아낸 사람들의 목소리를 따라가는 소설.', null, 'charcoal'),
('bk-011', null, '불편한 편의점', null, array['김호연']::text[], null, '나무옆의자', '2021-04', 268, '소설', '서울역 노숙인이 편의점 야간 알바를 하게 되며 벌어지는 따뜻한 이야기.', null, 'sea'),
('bk-019', null, '서랍에 저녁을 넣어 두었다', null, array['한강']::text[], null, '문학과지성사', '2013-11', 172, '시', '고요하고 단단한 언어로 삶과 죽음, 빛과 어둠을 노래한 시집.', null, 'plum'),
('bk-018', null, '아주 작은 습관의 힘', null, array['제임스 클리어']::text[], array['이한이']::text[], '비즈니스북스', '2019-02', 360, '자기계발', '매일 1%씩 나아지는 작은 습관이 만드는 큰 변화.', null, 'sea'),
('bk-013', null, '총, 균, 쇠', null, array['재레드 다이아몬드']::text[], array['김진준']::text[], '문학사상', '2005-12', 752, '역사', '왜 어떤 문명은 다른 문명을 정복할 수 있었는가에 대한 지리학적 탐구.', null, 'clay'),
('bk-004', null, '물고기는 존재하지 않는다', null, array['룰루 밀러']::text[], array['정지인']::text[], '곰출판', '2021-12', 300, '과학', '혼돈 속에서 질서를 찾으려 했던 한 과학자의 삶을 따라가며, 분류와 상실, 그리고 사랑을 이야기한다.', null, 'mustard'),
('bk-022', null, '파친코', null, array['이민진']::text[], array['신승미']::text[], '인플루엔셜', '2022-07', 440, '소설', '4대에 걸친 재일 조선인 가족의 삶을 그린 대서사.', null, 'forest'),
('bk-030', null, '그릿', null, array['앤절라 더크워스']::text[], array['김미정']::text[], '비즈니스북스', '2016-10', 416, '자기계발', '재능보다 끈기가 성취를 만든다는 연구를 쉽게 풀어낸 책.', null, 'forest'),
('bk-006', null, '사피엔스', '유인원에서 사이보그까지, 인간 역사의 대담하고 위대한 질문', array['유발 하라리']::text[], array['조현욱']::text[], '김영사', '2015-11', 636, '역사', '인지혁명, 농업혁명, 과학혁명을 거쳐온 호모 사피엔스의 역사를 거시적으로 조망한다.', null, 'forest'),
('bk-014', null, '도둑맞은 집중력', null, array['요한 하리']::text[], array['김하현']::text[], '어크로스', '2023-04', 504, '인문', '우리가 집중하지 못하게 된 진짜 이유를 추적하는 논픽션.', null, 'mustard'),
('bk-010', null, '미드나잇 라이브러리', null, array['매트 헤이그']::text[], array['노진선']::text[], '인플루엔셜', '2021-04', 408, '소설', '삶과 죽음 사이의 도서관에서, 살아보지 못한 인생의 책을 펼쳐보는 이야기.', null, 'plum'),
('bk-029', null, '원씽', null, array['게리 켈러','제이 파파산']::text[], array['구세희']::text[], '비즈니스북스', '2013-08', 280, '자기계발', '가장 중요한 단 하나에 집중하는 법에 관한 책.', null, 'charcoal'),
('bk-027', null, '아무튼, 떡볶이', null, array['요조']::text[], null, '위고', '2019-06', 160, '에세이', '떡볶이 한 접시에 얽힌 기억과 사람들을 다정하게 꺼내놓는 에세이.', null, 'rose'),
('bk-020', null, '방구석 미술관', null, array['조원재']::text[], null, '블랙피쉬', '2018-08', 356, '예술', '명화 뒤에 숨겨진 화가들의 삶을 흥미롭게 풀어낸 미술 교양서.', null, 'clay'),
('bk-031', null, '타이탄의 도구들', null, array['팀 페리스']::text[], array['박선령','정지현']::text[], '토네이도', '2017-04', 452, '자기계발', '각 분야 정상에 선 사람들의 습관과 생각을 모은 책.', null, 'navy')
on conflict (id) do nothing;

-- 서재
insert into public.library_entries (user_id, book_id, status, added_at, updated_at, finished_at, rating, one_liner, review, spoiler, quotes, place, occasion, tags, read_count, visibility)
values
('d0d0a000-0000-4000-8000-00000000000a', 'bk-033', 'done', now() - interval '1766936 seconds', now() - interval '125336 seconds', current_date - 1, 4.5, '반짝이는 파티 뒤에 남은 쓸쓸함. 마지막 문단을 세 번 읽었다.', null, false, '[{"id":"bk-033-q1","text":"그렇게 우리는 물결을 거슬러 나아간다. 쉼 없이 과거로 떠밀려 가면서도.","createdAt":"2026-11-11T03:00:00.000Z"},{"id":"bk-033-q2","text":"그는 그 초록 불빛을 믿었다.","createdAt":"2026-11-11T03:00:00.000Z"}]'::jsonb, '퇴근길 지하철', '독서모임 다음 책', array['고전','여름']::text[], 1, '{"rating":true,"oneLiner":true,"quotes":true,"review":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-012', 'done', now() - interval '730136 seconds', now() - interval '298136 seconds', current_date - 3, 5, '짧지만 오래 남는 소설. 사소한 선택이 얼마나 큰 용기인지.', null, false, '[]'::jsonb, '동네 카페', '친구 추천', array['얇은책','겨울']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-001', 'done', now() - interval '3494936 seconds', now() - interval '557336 seconds', current_date - 6, 5, '읽는 내내 눈이 내렸다. 천천히, 아껴 읽은 책.', '한 문장 한 문장이 무거워서 하루에 몇 쪽씩만 읽었다. 다 읽고 나서도 한동안 다른 책을 펼치지 못했다. 기억한다는 것, 작별하지 않는다는 것이 어떤 의미인지 오래 생각했다.', false, '[]'::jsonb, '집, 새벽', null, array['인생책','겨울']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-032', 'done', now() - interval '1075736 seconds', now() - interval '816536 seconds', current_date - 9, 4, '스무 살에 읽을 땐 몰랐던 노인의 고집이 이제야 보인다.', null, false, '[{"id":"bk-032-q1","text":"인간은 파멸할 수는 있어도 패배하지는 않는다.","createdAt":"2026-11-03T03:00:00.000Z"}]'::jsonb, null, '다시 읽고 싶어서', array['고전','다시읽기']::text[], 2, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-003', 'done', now() - interval '2630936 seconds', now() - interval '1162136 seconds', current_date - 13, 4.5, '다정한 SF. 「관내분실」이 가장 좋았다.', null, false, '[]'::jsonb, null, null, array['SF','단편']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-025', 'done', now() - interval '2198936 seconds', now() - interval '1507736 seconds', current_date - 17, 3.5, null, null, false, '[]'::jsonb, '도서관', null, array['에세이']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-007', 'done', now() - interval '5222936 seconds', now() - interval '1939736 seconds', current_date - 22, 5, '밤하늘을 다시 보게 되는 책.', '두껍지만 한 장씩 넘길수록 우주가 가까워지는 느낌. 과학책인데 문장이 아름답다.', false, '[]'::jsonb, '캠핑장', '별 보러 가기 전에', array['과학','인생책']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-024', 'done', now() - interval '2630936 seconds', now() - interval '2371736 seconds', current_date - 27, 5, '어른이 되어 다시 만난 어린 왕자.', null, false, '[{"id":"bk-024-q1","text":"가장 중요한 것은 눈에 보이지 않아.","createdAt":"2026-10-16T03:00:00.000Z"},{"id":"bk-024-q2","text":"네 장미를 그토록 소중하게 만든 건 네가 장미에게 쏟은 시간이야.","createdAt":"2026-10-16T03:00:00.000Z"}]'::jsonb, null, null, array['고전','다시읽기','인생책']::text[], 3, '{"rating":true,"oneLiner":true,"quotes":true,"tags":true,"review":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-028', 'done', now() - interval '3494936 seconds', now() - interval '2890136 seconds', current_date - 33, 3.5, '불편한 질문을 던지는 대화체 철학 입문.', null, false, '[]'::jsonb, null, null, array['자기계발']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-005', 'done', now() - interval '5222936 seconds', now() - interval '3926936 seconds', current_date - 45, 4, '떠나는 이유보다 돌아오는 이유가 궁금해졌다.', null, false, '[]'::jsonb, '제주행 비행기', null, array['에세이','여행']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-008', 'done', now() - interval '6086936 seconds', now() - interval '5222936 seconds', current_date - 60, 4, '감정을 배워가는 소년의 이야기.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-009', 'done', now() - interval '8678936 seconds', now() - interval '6950936 seconds', current_date - 80, 4.5, '다시 읽어도 새로운 고전.', null, false, '[{"id":"bk-009-q1","text":"새는 알에서 나오려고 투쟁한다. 알은 세계다.","createdAt":"2026-08-24T03:00:00.000Z"},{"id":"bk-009-q2","text":"태어나려는 자는 하나의 세계를 깨뜨려야 한다.","createdAt":"2026-08-24T03:00:00.000Z"}]'::jsonb, null, null, array['고전','다시읽기']::text[], 2, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-015', 'done', now() - interval '10406936 seconds', now() - interval '8678936 seconds', current_date - 100, 3.5, '스물다섯의 선택에 대해.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-026', 'done', now() - interval '12134936 seconds', now() - interval '11270936 seconds', current_date - 130, 3, '쉬어가도 괜찮다는 말이 필요했던 날.', null, false, '[]'::jsonb, null, null, array['에세이']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-021', 'done', now() - interval '16454936 seconds', now() - interval '13862936 seconds', current_date - 160, 4, null, null, false, '[]'::jsonb, null, null, array['과학']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-002', 'done', now() - interval '19046936 seconds', now() - interval '17318936 seconds', current_date - 200, 5, '쉽게 추천할 수 없지만 꼭 읽어야 하는 책.', null, false, '[]'::jsonb, null, null, array['인생책']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-011', 'done', now() - interval '21638936 seconds', now() - interval '20774936 seconds', current_date - 240, 3.5, '따뜻한 주말 소설.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-019', 'done', now() - interval '25958936 seconds', now() - interval '24230936 seconds', current_date - 280, 4.5, '잠들기 전 한 편씩.', null, false, '[]'::jsonb, null, null, array['시','겨울']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-018', 'done', now() - interval '29414936 seconds', now() - interval '28550936 seconds', current_date - 330, 4, '작은 습관 하나부터.', null, false, '[]'::jsonb, null, null, array['자기계발']::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-013', 'done', now() - interval '36326936 seconds', now() - interval '34598936 seconds', current_date - 400, 3.5, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true,"review":true,"quotes":true,"tags":true,"context":true}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-004', 'reading', now() - interval '557336 seconds', now() - interval '557336 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-022', 'reading', now() - interval '902936 seconds', now() - interval '902936 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-030', 'reading', now() - interval '1248536 seconds', now() - interval '1248536 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-006', 'reading', now() - interval '2630936 seconds', now() - interval '2630936 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-014', 'want', now() - interval '211736 seconds', now() - interval '211736 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-010', 'want', now() - interval '470936 seconds', now() - interval '470936 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-029', 'want', now() - interval '816536 seconds', now() - interval '816536 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-027', 'want', now() - interval '1421336 seconds', now() - interval '1421336 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0a000-0000-4000-8000-00000000000a', 'bk-020', 'want', now() - interval '2458136 seconds', now() - interval '2458136 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-012', 'done', now() - interval '38936 seconds', now() - interval '38936 seconds', current_date - 0, 5, '짧은데 오래 남는다. 조용한 용기에 대한 이야기.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-001', 'done', now() - interval '125336 seconds', now() - interval '125336 seconds', current_date - 1, 5, '읽는 내내 눈이 내렸다. 천천히 읽어야 하는 책.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-004', 'done', now() - interval '211736 seconds', now() - interval '211736 seconds', current_date - 2, 4.5, '과학책인 줄 알았는데 결국 사람에 관한 책이었다.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-008', 'done', now() - interval '557336 seconds', now() - interval '557336 seconds', current_date - 6, 4, '감정을 배우는 소년의 성장. 마지막 장면에서 울컥.', null, true, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-005', 'done', now() - interval '643736 seconds', now() - interval '643736 seconds', current_date - 7, 4, '여행보다 여행을 생각하는 시간이 더 좋았다.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-007', 'done', now() - interval '730136 seconds', now() - interval '730136 seconds', current_date - 8, 5, '밤하늘을 다시 보게 되는 책. 인생 과학책.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-015', 'done', now() - interval '1248536 seconds', now() - interval '1248536 seconds', current_date - 14, 4, '스물다섯의 선택. 나이마다 다르게 읽힐 것 같다.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-021', 'done', now() - interval '1334936 seconds', now() - interval '1334936 seconds', current_date - 15, 4, '유명한 이유가 있다. 비유가 정말 탁월하다.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-002', 'done', now() - interval '1421336 seconds', now() - interval '1421336 seconds', current_date - 16, 5, '쉽게 추천할 수 없지만 꼭 읽어야 하는 책.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-003', 'done', now() - interval '2371736 seconds', now() - interval '2371736 seconds', current_date - 27, 5, '「관내분실」 하나로 별 다섯.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-033', 'done', now() - interval '211736 seconds', now() - interval '211736 seconds', current_date - 2, 4.5, '파티가 끝난 뒤의 정적까지 들리는 소설.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-032', 'done', now() - interval '470936 seconds', now() - interval '470936 seconds', current_date - 5, 4, '짧고 단단하다. 바다 냄새가 나는 문장들.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-030', 'done', now() - interval '557336 seconds', now() - interval '557336 seconds', current_date - 6, 3.5, '연구 사례가 풍부하다. 끝까지 읽는 것 자체가 그릿.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-024', 'done', now() - interval '125336 seconds', now() - interval '125336 seconds', current_date - 1, 4.5, '여우와의 장면은 언제 읽어도 좋다.', null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{"rating":true,"oneLiner":true}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-028', 'reading', now() - interval '172800 seconds', now() - interval '172800 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-031', 'reading', now() - interval '518400 seconds', now() - interval '518400 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb),
('d0d0b000-0000-4000-8000-00000000000b', 'bk-026', 'want', now() - interval '345600 seconds', now() - interval '345600 seconds', null, null, null, null, false, '[]'::jsonb, null, null, '{}'::text[], 1, '{}'::jsonb);

-- 서로 팔로우
insert into public.follows (follower_id, followee_id) values ('d0d0a000-0000-4000-8000-00000000000a', 'd0d0b000-0000-4000-8000-00000000000b'), ('d0d0b000-0000-4000-8000-00000000000b', 'd0d0a000-0000-4000-8000-00000000000a');

-- 게시판
insert into public.posts (id, user_id, kind, body, quote, book_id, spoiler, created_at)
values
('d0d0c000-0000-4000-8000-000000000001', 'd0d0b000-0000-4000-8000-00000000000b', 'request', '요즘 잠들기 전에 읽을 잔잔한 에세이 찾고 있어요. 추천해 주실 분!', null, null, false, now() - interval '50 minutes'),
('d0d0c000-0000-4000-8000-000000000002', 'd0d0a000-0000-4000-8000-00000000000a', 'quote', '테스트 계정 A의 문장 공유 글이에요. 오랜만에 다시 펼쳐봤어요.', '가장 중요한 것은 눈에 보이지 않아.', 'bk-024', false, now() - interval '180 minutes'),
('d0d0c000-0000-4000-8000-000000000003', 'd0d0b000-0000-4000-8000-00000000000b', 'free', '이번 주에 다 읽은 책 이야기 나눠요. 다들 무슨 책 읽고 계세요?', null, 'bk-001', false, now() - interval '1500 minutes');

insert into public.comments (post_id, user_id, body, created_at)
values
('d0d0c000-0000-4000-8000-000000000001', 'd0d0a000-0000-4000-8000-00000000000a', '「언어의 온도」 추천해요. 한 꼭지씩 짧게 읽기 좋아요.', now() - interval '40 minutes'),
('d0d0c000-0000-4000-8000-000000000002', 'd0d0b000-0000-4000-8000-00000000000b', '저도 이 문장 좋아해요!', now() - interval '150 minutes'),
('d0d0c000-0000-4000-8000-000000000003', 'd0d0a000-0000-4000-8000-00000000000a', '저는 「이처럼 사소한 것들」 다 읽었어요. 짧은데 여운이 길어요.', now() - interval '1400 minutes');

-- 좋아요
insert into public.likes (kind, target_id, user_id)
values
('review', 'u:d0d0b000-0000-4000-8000-00000000000b:bk-012', 'd0d0a000-0000-4000-8000-00000000000a'),
('review', 'u:d0d0b000-0000-4000-8000-00000000000b:bk-001', 'd0d0a000-0000-4000-8000-00000000000a'),
('review', 'u:d0d0b000-0000-4000-8000-00000000000b:bk-004', 'd0d0a000-0000-4000-8000-00000000000a'),
('review', 'u:d0d0b000-0000-4000-8000-00000000000b:bk-008', 'd0d0a000-0000-4000-8000-00000000000a'),
('review', 'u:d0d0a000-0000-4000-8000-00000000000a:bk-033', 'd0d0b000-0000-4000-8000-00000000000b'),
('review', 'u:d0d0a000-0000-4000-8000-00000000000a:bk-012', 'd0d0b000-0000-4000-8000-00000000000b'),
('review', 'u:d0d0a000-0000-4000-8000-00000000000a:bk-001', 'd0d0b000-0000-4000-8000-00000000000b'),
('review', 'u:d0d0a000-0000-4000-8000-00000000000a:bk-032', 'd0d0b000-0000-4000-8000-00000000000b'),
('review', 'u:d0d0a000-0000-4000-8000-00000000000a:bk-003', 'd0d0b000-0000-4000-8000-00000000000b'),
('post', 'd0d0c000-0000-4000-8000-000000000001', 'd0d0a000-0000-4000-8000-00000000000a'),
('post', 'd0d0c000-0000-4000-8000-000000000002', 'd0d0b000-0000-4000-8000-00000000000b')
on conflict do nothing;

commit;
