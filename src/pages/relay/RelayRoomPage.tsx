import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Copy, Crown, Repeat, Send, Share2, UserPlus } from 'lucide-react';
import { useBookLookup, useMemberLookup, useMyCloudId } from '@/hooks/useSocial';
import { relayError, turnInfo, useRelayStore, type RelayDetail } from '@/store/relayStore';
import { useCloudStore } from '@/store/cloudStore';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { Page, PageHeader } from '@/components/layout/Page';
import { Avatar, BookCover, Button, EmptyState, Sheet, Skeleton, TextArea, TextField, useToast } from '@/components/ui';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/cn';
import styles from './Relay.module.scss';

/** 마감까지 남은 시간 */
function remaining(deadline: Date | undefined, now: number) {
  if (!deadline) return '';
  const ms = deadline.getTime() - now;
  if (ms <= 0) return '마감 시간이 지났어요';
  const h = Math.floor(ms / 3600_000);
  if (h >= 24) return `마감까지 ${Math.floor(h / 24)}일 ${h % 24}시간`;
  if (h >= 1) return `마감까지 ${h}시간`;
  return `마감까지 ${Math.max(1, Math.floor(ms / 60_000))}분`;
}

export function RelayRoomPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<Repeat aria-hidden />} title="릴레이에 참여하려면 로그인해 주세요" description="초대받은 릴레이는 로그인하면 바로 볼 수 있어요." />
      </Page>
    );
  return <RelayRoom />;
}

function RelayRoom() {
  const { relayId = '' } = useParams();
  const relay = useRelayStore((s) => s.details[relayId]);
  const loadDetail = useRelayStore((s) => s.loadDetail);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>(relay ? 'ready' : 'loading');
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    try {
      const d = await loadDetail(relayId);
      setState(d ? 'ready' : 'missing');
      useCloudStore.getState().refreshSoon(); // 새로 들어온 참여자 이름
    } catch (e) {
      setError(relayError(e));
      setState((s) => (s === 'ready' ? s : 'error'));
    }
  }, [loadDetail, relayId]);

  // 처음 + 15초마다(화면이 보일 때만) 새로 불러와 다른 사람의 바통을 반영
  useEffect(() => {
    void reload();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, 15_000);
    return () => clearInterval(t);
  }, [reload]);

  if (state === 'loading')
    return (
      <Page narrow>
        <PageHeader back title="릴레이" />
        <Skeleton height={140} radius="var(--radius-lg)" />
      </Page>
    );
  if (state === 'missing' || !relay)
    return (
      <Page narrow>
        <PageHeader back title="릴레이" />
        <EmptyState
          title={state === 'error' ? '릴레이를 불러오지 못했어요' : '릴레이를 찾을 수 없어요'}
          description={state === 'error' ? error : '참여하지 않았거나 방장이 없앤 릴레이예요. 초대 링크로 다시 들어와 보세요.'}
          action={
            <Link to={paths.relays} className={styles.textLink}>
              릴레이 목록으로
            </Link>
          }
        />
      </Page>
    );
  return <RelayView relay={relay} reload={reload} />;
}

function RelayView({ relay, reload }: { relay: RelayDetail; reload: () => Promise<void> }) {
  const me = useMyCloudId();
  const findBook = useBookLookup();
  const findMember = useMemberLookup();
  const book = findBook(relay.bookId);
  const info = turnInfo(relay);
  const isHost = relay.hostId === me;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // 바통 기록: 서버 기록 그대로 (넘긴 차례도 기록됨). 예전 버전에서 넘긴 차례는 기록이 없어 빈 칸으로
  const timeline = useMemo(() => {
    const byTurn = new Map(relay.posts.map((p) => [p.turn, p]));
    let lap = 1;
    return Array.from({ length: relay.turn }, (_, t) => {
      const post = byTurn.get(t);
      lap = post?.lap ?? lap;
      return { turn: t, lap, post: post && !post.skipped ? post : undefined, userId: post?.userId };
    });
  }, [relay.posts, relay.turn]);
  const lastQuestion = [...relay.posts].reverse().find((p) => p.question);

  return (
    <Page narrow>
      <PageHeader back title={relay.title} />

      <section className={styles.roomHead} aria-label="함께 이야기할 책">
        {book && (
          <Link to={paths.book(book.id)} className={styles.roomBook}>
            <BookCover book={book} size="sm" />
            <span>
              <strong>{book.title}</strong>
              {book.authors.join(', ')}
            </span>
          </Link>
        )}
        <p className={styles.roomMeta}>
          {relay.rounds}바퀴 · 한 사람당 {relay.turnHours >= 24 ? `${relay.turnHours / 24}일` : `${relay.turnHours}시간`} · {relay.members.length}명
        </p>
        {relay.status !== 'waiting' && (
          <div className={styles.progress} role="img" aria-label={`바통 ${Math.min(relay.turn, info.total)}/${info.total}개 넘김`}>
            {Array.from({ length: info.total }, (_, t) => (
              <span key={t} className={cn(styles.dot, t < relay.turn && styles.dotDone, t === relay.turn && relay.status === 'active' && styles.dotNow)} />
            ))}
          </div>
        )}
      </section>

      <Seats relay={relay} currentUserId={info.current?.userId} />

      {relay.status === 'waiting' && <WaitingRoom relay={relay} isHost={isHost} />}
      {relay.status === 'active' && relay.members.length < 8 && (
        <details className={styles.moreInvite}>
          <summary>
            <UserPlus aria-hidden />
            친구 더 초대하기
          </summary>
          <p className={styles.inviteText}>지금 들어온 친구는 맨 뒤 차례로 이어서 참여해요.</p>
          <InviteCode relay={relay} />
        </details>
      )}

      {relay.status !== 'waiting' && (
        <section className={styles.thread} aria-labelledby="thread-title">
          <h2 id="thread-title" className={styles.h2}>
            바통 기록
          </h2>
          {timeline.length === 0 && <p className={styles.muted}>첫 바통을 기다리고 있어요.</p>}
          <ol className={styles.posts}>
            {timeline.map(({ turn, lap, post, userId }) => {
              const m = userId ? findMember(userId) : undefined;
              return (
                <li key={turn} className={cn(styles.post, !post && styles.skipped)}>
                  <span className={styles.baton}>
                    바통 {turn + 1} · {lap}바퀴
                  </span>
                  {post ? (
                    <>
                      <p className={styles.who}>
                        <Avatar name={m?.nickname ?? '?'} tone={m?.tone} size="sm" />
                        <strong>{m?.nickname}</strong>
                        <span>{formatRelative(post.createdAt)}</span>
                      </p>
                      <p className={styles.body}>{post.body}</p>
                      {post.question && (
                        <p className={styles.question}>
                          <Send aria-hidden />
                          <span>
                            <em>다음 사람에게</em>
                            {post.question}
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={styles.muted}>{m?.nickname ?? '참여자'}님 차례를 방장이 넘겼어요.</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {relay.status === 'active' && info.current && (
        <CurrentTurn
          relay={relay}
          mine={info.current.userId === me}
          isHost={isHost}
          name={findMember(info.current.userId).nickname}
          question={lastQuestion?.question}
          asker={lastQuestion ? findMember(lastQuestion.userId).nickname : undefined}
          last={info.last}
          deadline={remaining(info.deadline, now)}
          reload={reload}
        />
      )}

      {relay.status === 'done' && (
        <section className={styles.finish} aria-label="완주">
          <strong>완주했어요!</strong>
          <span>
            {relay.members.length}명이 바통 {relay.posts.length}개로 『{book?.title ?? '이 책'}』을 함께 읽었어요.
          </span>
        </section>
      )}
    </Page>
  );
}

function Seats({ relay, currentUserId }: { relay: RelayDetail; currentUserId?: string }) {
  const findMember = useMemberLookup();
  const me = useMyCloudId();
  return (
    <section className={styles.seatsWrap} aria-labelledby="seats-title">
      <h2 id="seats-title" className={styles.h2}>
        차례 <span>{relay.status === 'done' ? `${relay.members.length}명` : `${relay.members.length}/8명`}</span>
      </h2>
      <ol className={styles.seats}>
        {relay.members.map((m) => {
          const p = findMember(m.userId);
          const now = m.userId === currentUserId;
          return (
            <li key={m.userId} className={cn(styles.seat, now && styles.seatNow)} aria-current={now ? 'step' : undefined}>
              <span className={styles.seatNo}>{m.seat + 1}</span>
              <Avatar name={p.nickname} tone={p.tone} size="md" />
              <span className={styles.seatName}>{p.nickname}</span>
              {(m.userId === relay.hostId || m.userId === me) && (
                <span className={styles.host}>
                  {m.userId === relay.hostId && <Crown aria-hidden />}
                  {[m.userId === relay.hostId && '방장', m.userId === me && '나'].filter(Boolean).join(' · ')}
                </span>
              )}
              {now && <span className={styles.nowTag}>차례</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** 초대 코드(눌러서 복사) + 링크 복사 + 공유 */
function InviteCode({ relay }: { relay: RelayDetail }) {
  const showToast = useToast((s) => s.show);
  const link = `${window.location.origin}${paths.relayJoin(relay.code)}`;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(done);
    } catch {
      showToast('복사하지 못했어요. 길게 눌러 직접 복사해 주세요');
    }
  };
  return (
    <>
      <button type="button" className={styles.code} onClick={() => void copy(relay.code, '초대 코드를 복사했어요')} aria-label={`초대 코드 ${relay.code}, 눌러서 복사`}>
        {relay.code.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </button>
      <div className={styles.inviteActions}>
        <Button variant="outline" leadingIcon={<Copy aria-hidden />} onClick={() => void copy(link, '초대 링크를 복사했어요')}>
          링크 복사
        </Button>
        {canShare && (
          <Button
            variant="outline"
            leadingIcon={<Share2 aria-hidden />}
            onClick={() => void navigator.share({ title: relay.title, text: `북로그 릴레이 독서 토론에 초대할게요! 코드: ${relay.code}`, url: link }).catch(() => {})}
          >
            공유하기
          </Button>
        )}
      </div>
    </>
  );
}

function WaitingRoom({ relay, isHost }: { relay: RelayDetail; isHost: boolean }) {
  const start = useRelayStore((s) => s.start);
  const leave = useRelayStore((s) => s.leave);
  const showToast = useToast((s) => s.show);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const enough = relay.members.length >= 2;

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(ok);
    } catch (e) {
      showToast(relayError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.invite} aria-labelledby="invite-title">
      <h2 id="invite-title" className={styles.inviteTitle}>
        친구를 초대해 주세요
      </h2>
      <p className={styles.inviteText}>초대 코드나 링크를 보내면 친구가 바로 들어올 수 있어요. 시작한 뒤에 들어온 친구는 맨 뒤 차례로 이어서 참여해요.</p>
      <InviteCode relay={relay} />
      {isHost ? (
        <>
          <Button block size="lg" disabled={!enough} loading={busy} onClick={() => void run(() => start(relay.id), '릴레이를 시작했어요')}>
            {enough ? '시작하기' : '2명 이상 모이면 시작할 수 있어요'}
          </Button>
          <button type="button" className={styles.textLink} onClick={() => setConfirm(true)}>
            릴레이 없애기
          </button>
        </>
      ) : (
        <>
          <p className={styles.muted}>방장이 시작하면 차례대로 바통이 돌아요.</p>
          <button type="button" className={styles.textLink} onClick={() => setConfirm(true)}>
            릴레이에서 나가기
          </button>
        </>
      )}
      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={isHost ? '릴레이를 없앨까요?' : '릴레이에서 나갈까요?'}
        description={isHost ? '참여한 친구들에게서도 사라져요.' : '초대 코드로 다시 들어올 수 있어요.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await leave(relay.id);
                  navigate(paths.relays, { replace: true });
                }, isHost ? '릴레이를 없앴어요' : '릴레이에서 나왔어요')
              }
            >
              {isHost ? '없애기' : '나가기'}
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </section>
  );
}

function CurrentTurn({
  relay,
  mine,
  isHost,
  name,
  question,
  asker,
  last,
  deadline,
  reload,
}: {
  relay: RelayDetail;
  mine: boolean;
  isHost: boolean;
  name: string;
  question?: string;
  asker?: string;
  last: boolean;
  deadline: string;
  reload: () => Promise<void>;
}) {
  const post = useRelayStore((s) => s.post);
  const skip = useRelayStore((s) => s.skip);
  const showToast = useToast((s) => s.show);
  const [body, setBody] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await post(relay.id, body, last ? '' : next);
      setBody('');
      setNext('');
      showToast(last ? '마지막 바통으로 완주했어요' : '바통을 넘겼어요');
    } catch (err) {
      showToast(relayError(err));
      void reload();
    } finally {
      setBusy(false);
    }
  };

  if (!mine)
    return (
      <section className={styles.turnBox} aria-label="지금 차례">
        <p className={styles.turnTitle}>지금 {name}님 차례예요</p>
        <p className={styles.muted}>{deadline}</p>
        {isHost && (
          <>
            <button type="button" className={styles.textLink} onClick={() => setConfirmSkip(true)}>
              응답이 없으면 차례 넘기기
            </button>
            <Sheet
              open={confirmSkip}
              onClose={() => setConfirmSkip(false)}
              title={`${name}님 차례를 넘길까요?`}
              description="이번 바통은 비워 두고 다음 사람 차례로 넘어가요."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setConfirmSkip(false)}>
                    취소
                  </Button>
                  <Button
                    loading={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await skip(relay.id);
                        showToast('차례를 넘겼어요');
                        setConfirmSkip(false);
                      } catch (err) {
                        showToast(relayError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    넘기기
                  </Button>
                </>
              }
            >
              {null}
            </Sheet>
          </>
        )}
      </section>
    );

  return (
    <form className={cn(styles.turnBox, styles.turnMine)} onSubmit={submit} aria-label="내 차례">
      <p className={styles.turnTitle}>내 차례예요!</p>
      <p className={styles.muted}>{deadline}</p>
      {question ? (
        <p className={styles.question}>
          <Send aria-hidden />
          <span>
            <em>{asker}님의 질문</em>
            {question}
          </span>
        </p>
      ) : (
        <p className={styles.muted}>첫 바통이에요. 책을 읽고 든 생각으로 이야기를 열어 주세요.</p>
      )}
      <TextArea label="내 생각" maxLength={1000} placeholder="질문에 답하거나, 읽으며 든 생각을 자유롭게 써 주세요." value={body} onChange={(e) => setBody(e.target.value)} />
      {!last && (
        <TextField
          label="다음 사람에게 넘길 질문"
          optional
          maxLength={200}
          placeholder="예: 가장 오래 남은 장면은 어디였나요?"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      )}
      <Button type="submit" block size="lg" disabled={!body.trim()} loading={busy} leadingIcon={<Send aria-hidden />}>
        {last ? '마지막 바통으로 완주하기' : '바통 넘기기'}
      </Button>
    </form>
  );
}
