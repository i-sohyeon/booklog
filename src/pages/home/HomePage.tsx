import { useMemo } from 'react';
import { Link } from 'react-router';
import { BookMarked, BookOpen, CalendarDays, Check, Users, Video } from 'lucide-react';
import type { Genre } from '@/types/book';
import { SAMPLE_DAILY_PICKS } from '@/mocks/social';
import { useLibraryStore } from '@/store/libraryStore';
import { finishedBooks, ratingSummary, readingProfile } from '@/store/selectors';
import { useShelf } from '@/hooks/useShelf';
import { useProfile } from '@/hooks/useProfile';
import { useBookLookup, useClubs, useFollowing, useMemberLookup, useMyCloudId, useReviews } from '@/hooks/useSocial';
import { useRecord } from '@/components/record/recordStore';
import { formatRelative, formatToday, getGreeting } from '@/lib/date';
import { formatSchedule, sessionPhase, untilLabel } from '@/lib/time';
import { josa } from '@/lib/josa';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { Avatar, BookCover, Button, ButtonLink, RatingValue, SectionHeader, Spoiler, StarRating, useToast } from '@/components/ui';
import { nextSession } from '@/components/social/ClubCard';
import { byline } from '@/lib/byline';
import styles from './HomePage.module.scss';

function dayIndex(d = new Date()) {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
}

/** 홈 — 나를 위한 화면 (개인화된 콘텐츠만) */
export function HomePage() {
  const profile = useProfile();
  const now = new Date();

  return (
    <Page>
      <header className={styles.greeting}>
        <p className={styles.date}>{formatToday(now)}</p>
        <h1 className={styles.hello}>
          {getGreeting(now)}, {profile.nickname} 님
        </h1>
      </header>

      <TodayPick />
      <ReadingNow />
      <FriendsFinished />
      <MyClubSchedule />
    </Page>
  );
}

/** 내가 많이 읽은 장르를 기준으로, 아직 서재에 없는 책 한 권 */
function useTastePick() {
  const shelf = useShelf();
  const findBook = useBookLookup();
  return useMemo(() => {
    const top = readingProfile(finishedBooks(shelf)).genres.slice(0, 2).map((g) => g.name);
    // 이미 읽었거나 읽는 중인 책은 제외 (읽고 싶은 책은 다시 추천해도 괜찮아요)
    const owned = new Set(shelf.filter((i) => i.entry.status !== 'want').map((i) => i.book.id));
    const candidates = SAMPLE_DAILY_PICKS.filter((p) => !owned.has(p.bookId));
    const pool = candidates.length ? candidates : SAMPLE_DAILY_PICKS;
    const matched = pool.filter((p) => {
      const g = findBook(p.bookId)?.genre;
      return g && top.includes(g);
    });
    const list = matched.length ? matched : pool;
    const pick = list[dayIndex() % list.length]!;
    const genre = findBook(pick.bookId)?.genre;
    return { ...pick, reason: genre && top.includes(genre) ? (genre as Genre) : null };
  }, [shelf, findBook]);
}

function TodayPick() {
  const pick = useTastePick();
  const book = useBookLookup()(pick.bookId);
  const entry = useLibraryStore((s) => (book ? s.entries[book.id] : undefined));
  const setStatus = useLibraryStore((s) => s.setStatus);
  const showToast = useToast((s) => s.show);
  if (!book) return null;
  const summary = ratingSummary(book.id, entry?.rating);

  return (
    <section className={styles.pick} data-tone={book.coverTone} aria-labelledby="pick-title">
      <p className={styles.eyebrow}>{pick.reason ? `${pick.reason}${josa(pick.reason, "을/를")} 자주 읽는 당신에게` : '오늘의 추천'}</p>
      <Link to={paths.book(book.id)} className={styles.pickCover} aria-label={`${book.title} 자세히 보기`}>
        <BookCover book={book} size="fluid" />
      </Link>
      <div className={styles.pickText}>
        <h2 id="pick-title" className={styles.pickTitle}>
          <Link to={paths.book(book.id)}>{book.title}</Link>
        </h2>
        <p className={styles.pickAuthor}>{byline(book)}</p>
        <p className={styles.pickLine}>{pick.line}</p>
        <RatingValue value={summary.average} count={summary.count} size="md" />
      </div>
      <div className={styles.pickActions}>
        {entry ? (
          <span className={styles.inShelf}>
            <Check aria-hidden /> {entry.status === 'done' ? '다 읽은 책' : entry.status === 'reading' ? '읽는 중' : '읽고 싶은 책에 담겼어요'}
          </span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<BookMarked aria-hidden />}
            onClick={() => {
              setStatus(book, 'want');
              showToast('읽고 싶은 책에 담았어요');
            }}
          >
            읽고 싶어요
          </Button>
        )}
      </div>
    </section>
  );
}

/** 읽는 중 — 표지와 제목만 (진도 정보 없음) */
function ReadingNow() {
  const shelf = useShelf();
  const reading = useMemo(
    () => shelf.filter((i) => i.entry.status === 'reading').sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt)),
    [shelf],
  );
  const start = useRecord((s) => s.start);
  return (
    <section className={styles.section} aria-labelledby="reading-title">
      <SectionHeader id="reading-title" title="읽는 중" more={reading.length ? { to: paths.library, label: '서재' } : undefined} />
      {reading.length === 0 ? (
        <div className={styles.emptyCard}>
          <BookOpen aria-hidden className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>지금 읽고 있는 책이 없어요</p>
          <p className={styles.muted}>읽기 시작한 책을 담아두면 여기에서 바로 볼 수 있어요.</p>
          <Button size="sm" variant="outline" onClick={() => start()}>
            책 담기
          </Button>
        </div>
      ) : (
      <ul role="list" className={styles.rail}>
        {reading.map(({ book }) => (
          <li key={book.id} className={styles.readingItem}>
            <Link to={paths.book(book.id)} className={styles.readingLink}>
              <BookCover book={book} size="fluid" />
              <span className={styles.readingTitle}>{book.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}

function FriendsFinished() {
  const reviews = useReviews();
  const following = useFollowing();
  const signedIn = useMyCloudId() !== null;
  const findMember = useMemberLookup();
  const findBook = useBookLookup();
  const feed = useMemo(
    () => reviews.filter((r) => following.includes(r.memberId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [reviews, following],
  );

  return (
    <section className={styles.section} aria-labelledby="friends-title">
      <SectionHeader id="friends-title" title="친구들이 다 읽은 책" />
      {feed.length === 0 ? (
        <div className={styles.emptyCard}>
          <Users aria-hidden className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{following.length ? '아직 친구의 완독 소식이 없어요' : '아직 팔로우한 친구가 없어요'}</p>
          <p className={styles.muted}>
            {following.length
              ? '친구가 다 읽은 책에 별점을 공개하면 여기에 보여요.'
              : signedIn
                ? '친구를 팔로우하면, 친구가 공개한 별점과 한 줄 평이 여기에 보여요.'
                : '로그인하고 친구를 팔로우하면 친구의 완독 소식이 여기에 보여요.'}
          </p>
          {!following.length && (
            <ButtonLink to={signedIn ? `${paths.me}?people=find` : paths.login} size="sm" variant="outline">
              {signedIn ? '친구 찾기' : '로그인'}
            </ButtonLink>
          )}
        </div>
      ) : (
        <ul role="list" className={styles.feed}>
          {feed.map((r) => {
            const m = findMember(r.memberId);
            const book = findBook(r.bookId);
            if (!book) return null;
            return (
              <li key={r.id} className={styles.feedItem}>
                <p className={styles.feedWho}>
                  <Avatar name={m.nickname} tone={m.tone} size="sm" />
                  <span className={styles.feedName}>
                    <strong>{m.nickname}</strong>
                    <span className={styles.feedWhen}>{formatRelative(r.createdAt)}</span>
                  </span>
                </p>
                <div className={styles.feedRow}>
                  <Link to={paths.book(book.id)} className={styles.feedCover} aria-label={book.title}>
                    <BookCover book={book} size="fluid" />
                  </Link>
                  <div className={styles.feedBody}>
                    <Link to={paths.book(book.id)} className={styles.feedTitle}>
                      {book.title}
                    </Link>
                    <StarRating value={r.rating} size="sm" />
                    {r.oneLiner && (
                      <Spoiler active={r.spoiler}>
                        <p className={styles.feedLine}>{r.oneLiner}</p>
                      </Spoiler>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** 참여 중인 독서모임의 다음 일정 */
function MyClubSchedule() {
  const clubs = useClubs();
  const findBook = useBookLookup();
  const upcoming = useMemo(
    () =>
      clubs
        .filter((c) => c.joined)
        .map((c) => ({ club: c, session: nextSession(c) }))
        .filter((x): x is { club: typeof x.club; session: NonNullable<typeof x.session> } => x.session !== null)
        .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))
        .slice(0, 3),
    [clubs],
  );

  return (
    <section className={styles.section} aria-labelledby="club-title">
      <SectionHeader id="club-title" title="내 독서모임 일정" more={{ to: paths.clubs, label: '모임' }} />
      {upcoming.length === 0 ? (
        <div className={styles.emptyCard}>
          <CalendarDays aria-hidden className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>참여 중인 모임이 없어요</p>
          <p className={styles.muted}>모임에 참여하면 다음 일정이 여기에 보여요.</p>
          <ButtonLink to={paths.clubs} size="sm" variant="outline">
            모임 둘러보기
          </ButtonLink>
        </div>
      ) : (
        <ul role="list" className={styles.clubs}>
          {upcoming.map(({ club, session }) => {
            const book = findBook(club.bookId);
            const phase = sessionPhase(session.startsAt, club.durationMin);
            const canEnter = phase === 'live' || phase === 'open';
            return (
              <li key={club.id} className={styles.clubCard} data-live={canEnter || undefined}>
                {book && (
                  <Link to={paths.club(club.id)} className={styles.clubCover} aria-hidden tabIndex={-1}>
                    <BookCover book={book} size="fluid" />
                  </Link>
                )}
                <div className={styles.clubBody}>
                  <p className={styles.clubWhen}>
                    {phase === 'live' ? (
                      <span className={styles.liveDot}>지금 진행 중</span>
                    ) : (
                      <>
                        <CalendarDays aria-hidden />
                        {untilLabel(session.startsAt)}
                      </>
                    )}
                  </p>
                  <Link to={paths.club(club.id)} className={styles.clubName}>
                    {club.name}
                  </Link>
                  <p className={styles.clubMeta}>
                    {session.week}주차 · {session.range}
                  </p>
                  <p className={styles.clubMeta}>{formatSchedule(session.startsAt)}</p>
                </div>
                {canEnter && (
                  <ButtonLink to={paths.club(club.id)} size="sm" leadingIcon={<Video aria-hidden />} className={styles.clubEnter}>
                    입장하기
                  </ButtonLink>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
