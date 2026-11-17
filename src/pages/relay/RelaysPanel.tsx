import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Repeat } from 'lucide-react';
import { useBookLookup, useMemberLookup, useMyCloudId } from '@/hooks/useSocial';
import { relayError, turnInfo, useRelayStore, type Relay } from '@/store/relayStore';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { paths } from '@/routes/paths';
import { Avatar, BookCover, Button, EmptyState, Skeleton, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import styles from './Relay.module.scss';

/** 커뮤니티 › 릴레이: 내가 참여한 릴레이 독서 토론 + 코드로 참여 */
export function RelaysPanel() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <GuestScreen
        icon={<Repeat aria-hidden />}
        title="릴레이 토론은 로그인 후에 할 수 있어요"
        description="친구를 초대해 한 권의 책을 두고 차례대로 바통을 넘기며 이야기해요."
      />
    );
  return <RelaysInner />;
}

function RelaysInner() {
  const me = useMyCloudId();
  const list = useRelayStore((s) => s.list);
  const status = useRelayStore((s) => s.listStatus);
  const error = useRelayStore((s) => s.listError);
  const loadList = useRelayStore((s) => s.loadList);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const groups = useMemo(() => {
    const myTurn = list.filter((r) => r.status === 'active' && turnInfo(r).current?.userId === me);
    const active = list.filter((r) => r.status === 'active' && !myTurn.includes(r));
    return [
      { key: 'mine', title: '내 차례예요', items: myTurn },
      { key: 'active', title: '진행 중', items: active },
      { key: 'waiting', title: '친구를 기다리는 중', items: list.filter((r) => r.status === 'waiting') },
      { key: 'done', title: '완주한 릴레이', items: list.filter((r) => r.status === 'done') },
    ].filter((g) => g.items.length);
  }, [list, me]);

  return (
    <div className={styles.panel}>
      <section className={styles.intro} aria-labelledby="relay-intro">
        <h2 id="relay-intro" className={styles.introTitle}>
          릴레이 독서 토론
        </h2>
        <p className={styles.introText}>친구를 초대해 한 권의 책을 두고 차례대로 이야기해요. 내 생각을 쓰고, 다음 사람에게 질문으로 바통을 넘겨요.</p>
        <JoinByCode />
      </section>

      {status === 'loading' && (
        <div className={styles.cards} aria-busy>
          <Skeleton height={112} radius="var(--radius-lg)" />
          <Skeleton height={112} radius="var(--radius-lg)" />
        </div>
      )}
      {status === 'error' && <p className={styles.error}>{error}</p>}
      {status === 'ready' && list.length === 0 && (
        <EmptyState compact title="아직 참여한 릴레이가 없어요" description="릴레이를 만들어 친구에게 초대 링크를 보내 보세요." />
      )}
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`relay-${g.key}`} className={styles.group}>
          <h3 id={`relay-${g.key}`} className={styles.groupTitle}>
            {g.title} <span>{g.items.length}</span>
          </h3>
          <ul role="list" className={styles.cards}>
            {g.items.map((r) => (
              <li key={r.id}>
                <RelayCard relay={r} mine={g.key === 'mine'} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function JoinByCode() {
  const join = useRelayStore((s) => s.join);
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const valid = /^[A-Za-z0-9]{6}$/.test(code.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(undefined);
    try {
      const id = await join(code.trim());
      showToast('릴레이에 참여했어요');
      navigate(paths.relay(id));
    } catch (err) {
      setError(relayError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className={styles.join} onSubmit={submit} noValidate>
      <label htmlFor="relay-code" className={styles.joinLabel}>
        초대 코드가 있나요?
      </label>
      <div className={styles.joinRow}>
        <input
          id="relay-code"
          className={styles.codeInput}
          placeholder="6자리 코드"
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? 'relay-code-error' : undefined}
        />
        <Button type="submit" variant="secondary" disabled={!valid} loading={pending}>
          참여하기
        </Button>
      </div>
      {error && (
        <p id="relay-code-error" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}

function RelayCard({ relay, mine }: { relay: Relay; mine: boolean }) {
  const findBook = useBookLookup();
  const findMember = useMemberLookup();
  const book = findBook(relay.bookId);
  const { total, current, lap } = turnInfo(relay);
  const status =
    relay.status === 'waiting'
      ? `${relay.members.length}명 모임 · 시작 전`
      : relay.status === 'done'
        ? `${total}개의 바통으로 완주`
        : `${lap}/${relay.rounds}바퀴 · 지금 ${!current ? '—' : mine ? '내' : `${findMember(current.userId).nickname}님`} 차례`;
  return (
    <Link to={paths.relay(relay.id)} className={cn(styles.card, mine && styles.cardMine)}>
      {book ? <BookCover book={book} size="sm" /> : <span className={styles.coverStub} aria-hidden />}
      <span className={styles.cardBody}>
        {mine && <span className={styles.myTurn}>내 차례</span>}
        <strong className={styles.cardTitle}>{relay.title}</strong>
        <span className={styles.cardMeta}>{status}</span>
        <span className={styles.avatars} aria-label={`참여자 ${relay.members.length}명`}>
          {relay.members.slice(0, 6).map((m) => {
            const p = findMember(m.userId);
            return <Avatar key={m.userId} name={p.nickname} tone={p.tone} size="xs" />;
          })}
          {relay.members.length > 6 && <span className={styles.more}>+{relay.members.length - 6}</span>}
        </span>
      </span>
    </Link>
  );
}
