import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Clock, Send, Video } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { useBookLookup, useClubs, useMemberLookup } from '@/hooks/useSocial';
import { formatRelative } from '@/lib/date';
import { formatSchedule, sessionPhase, untilLabel } from '@/lib/time';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { Avatar, BookCover, Button, ButtonLink, EmptyState, Sheet, useToast } from '@/components/ui';
import { nextSession } from '@/components/social/ClubCard';
import { cn } from '@/lib/cn';
import { JoinButton } from './ClubsPanel';
import { requireLogin } from '@/store/loginGate';
import styles from './ClubDetailPage.module.scss';

/** 1분마다 다시 그려 입장 가능 여부를 갱신 */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function ClubDetailPage() {
  const { clubId = '' } = useParams();
  const club = useClubs().find((c) => c.id === clubId);
  const findBook = useBookLookup();
  const findMember = useMemberLookup();
  const addComment = useSocialStore((s) => s.addClubComment);
  const leave = useSocialStore((s) => s.leaveClub);
  const showToast = useToast((s) => s.show);
  const now = useNow();
  const [body, setBody] = useState('');
  const [enterOpen, setEnterOpen] = useState(false);

  if (!club)
    return (
      <Page narrow>
        <EmptyState title="모임을 찾을 수 없어요" action={<ButtonLink to={paths.clubs}>독서모임으로</ButtonLink>} />
      </Page>
    );

  const book = findBook(club.bookId);
  const host = findMember(club.hostId);
  const next = nextSession(club);
  const phase = next ? sessionPhase(next.startsAt, club.durationMin, now) : 'ended';
  const canEnter = club.joined && (phase === 'open' || phase === 'live');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (!requireLogin('모임 글을 남기려면 로그인해 주세요. 쓰던 내용은 그대로 남아 있어요.')) return;
    addComment(club.id, body);
    setBody('');
  };

  return (
    <Page narrow>
      <PageHeader back title={club.name} />

      <section className={styles.intro}>
        {book && (
          <Link to={paths.book(book.id)} className={styles.book}>
            <BookCover book={book} size="md" />
            <span>
              <em>함께 읽을 책</em>
              <strong>{book.title}</strong>
              {book.authors.join(', ')}
            </span>
          </Link>
        )}
        <p className={styles.desc}>{club.description}</p>
        <p className={styles.host}>
          <Avatar name={host.nickname} tone={host.tone} size="xs" /> 모임장 <strong>{host.nickname}</strong> · {club.memberIds.length}/{club.capacity}명
        </p>
        <JoinButton club={club} />
      </section>

      {/* 다음 온라인 모임 */}
      <section className={cn(styles.next, phase === 'live' && styles.live)} aria-labelledby="next-title">
        <h2 id="next-title" className={styles.nextLabel}>
          {phase === 'live' ? '지금 온라인 모임 진행 중' : next ? `다음 모임 · ${next.week}주차` : '모임 일정'}
        </h2>
        {next ? (
          <>
            <p className={styles.nextTime}>
              <Clock aria-hidden />
              {formatSchedule(next.startsAt)} · {club.durationMin}분
            </p>
            <p className={styles.nextRange}>읽을 범위: {next.range}</p>
            <Button
              block
              leadingIcon={<Video aria-hidden />}
              disabled={!canEnter}
              onClick={() => setEnterOpen(true)}
              variant={phase === 'live' ? 'primary' : 'secondary'}
            >
              입장하기
            </Button>
            <p className={styles.enterHint}>
              {!club.joined
                ? '모임에 참여하면 입장할 수 있어요.'
                : canEnter
                  ? '지금 입장할 수 있어요.'
                  : `시작 10분 전부터 입장할 수 있어요 · ${untilLabel(next.startsAt, now)}`}
            </p>
          </>
        ) : (
          <p className={styles.nextRange}>모든 일정이 끝났어요.</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="schedule-title">
        <h2 id="schedule-title" className={styles.h2}>
          진행 일정
        </h2>
        <ol className={styles.schedule}>
          {club.sessions.map((s) => {
            const p = sessionPhase(s.startsAt, club.durationMin, now);
            return (
              <li key={s.week} className={cn(styles.week, p === 'ended' && styles.done, s === next && styles.current)}>
                <span className={styles.weekNo}>{s.week}주차</span>
                <span className={styles.weekBody}>
                  <strong>{s.range}</strong>
                  {formatSchedule(s.startsAt)}
                </span>
                {p === 'ended' && <span className={styles.weekState}>완료</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="members-title">
        <h2 id="members-title" className={styles.h2}>
          참여자 {club.memberIds.length}
        </h2>
        <ul role="list" className={styles.members}>
          {club.memberIds.map((id) => {
            const m = findMember(id);
            return (
              <li key={id}>
                <Avatar name={m.nickname} tone={m.tone} size="md" />
                <span>{m.nickname}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="thread-title">
        <h2 id="thread-title" className={styles.h2}>
          모임 토론
        </h2>
        {club.thread.length === 0 && <p className={styles.muted}>아직 이야기가 없어요.</p>}
        <ul role="list" className={styles.thread}>
          {club.thread.map((c) => {
            const m = findMember(c.memberId);
            return (
              <li key={c.id}>
                <Avatar name={m.nickname} tone={m.tone} size="sm" />
                <div>
                  <p className={styles.who}>
                    <strong>{m.nickname}</strong> {formatRelative(c.createdAt)}
                  </p>
                  <p className={styles.body}>{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {club.joined ? (
          <form className={styles.form} onSubmit={submit}>
            <label htmlFor="club-input" className="sr-only">
              토론 글
            </label>
            <input id="club-input" maxLength={500} placeholder="모임 사람들과 이야기해 보세요" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button type="submit" size="sm" disabled={!body.trim()} aria-label="등록">
              <Send aria-hidden />
            </Button>
          </form>
        ) : (
          <p className={styles.muted}>모임에 참여하면 토론에 글을 남길 수 있어요.</p>
        )}
        {club.joined && !club.isHost && (
          <button
            type="button"
            className={styles.leave}
            onClick={() => {
              leave(club.id);
              showToast('모임에서 나왔어요');
            }}
          >
            모임 나가기
          </button>
        )}
      </section>

      <Sheet
        open={enterOpen}
        onClose={() => setEnterOpen(false)}
        title="화상 모임 연결 준비 중"
        description="정식 버전에서는 이 버튼으로 온라인 모임방에 바로 입장해요."
        footer={<Button onClick={() => setEnterOpen(false)}>확인</Button>}
      >
        <p className={styles.muted}>지금은 샘플 모임이라 실제 화상 회의로 연결되지 않아요.</p>
      </Sheet>
    </Page>
  );
}
