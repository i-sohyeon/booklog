import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronRight, Plus, Settings } from 'lucide-react';
import { SAMPLE_FOLLOWERS } from '@/mocks/social';
import { useSocialStore } from '@/store/socialStore';
import { useCloudStore } from '@/store/cloudStore';
import { useProfile } from '@/hooks/useProfile';
import { useCloudFollowers, useClubs, useFollowing, useLists, useMemberLookup, useMyCloudId, useReviews } from '@/hooks/useSocial';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { Avatar, Badge, Button, ButtonLink, EmptyState, Sheet, Tabs } from '@/components/ui';
import { ReviewCard } from '@/components/social/ReviewCard';
import { ListCard } from '@/components/social/ListCard';
import { ClubCard } from '@/components/social/ClubCard';
import { CreateListSheet } from '@/components/social/ListSheets';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { UserRound as UserRoundIcon } from 'lucide-react';
import styles from './MyPage.module.scss';

type Tab = 'reviews' | 'lists' | 'clubs';
type People = 'followers' | 'following' | 'find' | null;

/** 마이 — 프로필 · 팔로워/팔로잉 · 내 후기 · 내 리스트 · 참여 중인 모임 · 설정 */
function MyPageInner() {
  const profile = useProfile();
  const following = useFollowing();
  const cloudFollowers = useCloudFollowers();
  const signedIn = useMyCloudId() !== null;
  const [tab, setTab] = useState<Tab>('reviews');
  const [params, setParams] = useSearchParams();
  // 홈의 '친구 찾기' 버튼: /me?people=find 로 들어오면 바로 열기
  const [people, setPeopleState] = useState<People>(() => (signedIn && params.get('people') === 'find' ? 'find' : null));
  const setPeople = (p: People) => {
    setPeopleState(p);
    if (!p && params.has('people')) setParams({}, { replace: true });
  };

  const reviews = useReviews().filter((r) => r.isMine);
  const lists = useLists().filter((l) => l.isMine);
  const clubs = useClubs().filter((c) => c.joined);

  return (
    <Page narrow>
      <section className={styles.profile} aria-label="프로필">
        <div className={styles.profileTop}>
          <Avatar name={profile.nickname} size="lg" />
          <Link to={paths.settings} className={styles.settings} aria-label="설정">
            <Settings aria-hidden />
          </Link>
        </div>
        <h1 className={styles.name}>{profile.nickname}</h1>
        <p className={styles.handle}>
          {profile.handle ?? '로그인하지 않은 게스트'}
          {profile.source !== 'account' && <Badge tone="outline">{profile.source === 'sample' ? '샘플 사용자' : '게스트'}</Badge>}
        </p>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        <div className={styles.follow}>
          <button type="button" onClick={() => setPeople('followers')}>
            <strong>{(signedIn ? 0 : SAMPLE_FOLLOWERS.length) + cloudFollowers.length}</strong> 팔로워
          </button>
          <button type="button" onClick={() => setPeople('following')}>
            <strong>{following.length}</strong> 팔로잉
          </button>
          {signedIn && (
            <button type="button" className={styles.findBtn} onClick={() => setPeople('find')}>
              친구 찾기
            </button>
          )}
        </div>
      </section>

      <section className={styles.activity} aria-label="내 활동">
        <Tabs<Tab>
          label="내 활동"
          value={tab}
          onChange={setTab}
          controls="my-panel"
          items={[
            { value: 'reviews', label: '내 후기', count: reviews.length },
            { value: 'lists', label: '내 리스트', count: lists.length },
            { value: 'clubs', label: '참여 모임', count: clubs.length },
          ]}
        />
        <div id="my-panel" role="tabpanel" className={styles.panel}>
          {tab === 'reviews' &&
            (reviews.length === 0 ? (
              <EmptyState compact title="아직 쓴 후기가 없어요" description="다 읽은 책에 한 줄 평을 남기면 여기에 모여요." action={<ButtonLink to={paths.library}>서재로</ButtonLink>} />
            ) : (
              <div className={styles.reviews}>
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} variant="row" />
                ))}
              </div>
            ))}
          {tab === 'lists' && <MyLists lists={lists} />}
          {tab === 'clubs' &&
            (clubs.length === 0 ? (
              <EmptyState compact title="참여 중인 모임이 없어요" action={<ButtonLink to={paths.clubs}>모임 둘러보기</ButtonLink>} />
            ) : (
              <div className={styles.clubs}>
                {clubs.map((c) => (
                  <ClubCard key={c.id} club={c} />
                ))}
              </div>
            ))}
        </div>
      </section>

      <nav className={styles.menu} aria-label="계정 메뉴">
        <Link to={paths.settings} className={styles.menuItem}>
          <Settings aria-hidden />
          <span>설정</span>
          <small>계정 · 동기화 · 데이터 관리</small>
          <ChevronRight aria-hidden />
        </Link>
      </nav>

      <PeopleSheet kind={people} onClose={() => setPeople(null)} />
    </Page>
  );
}

const PEOPLE_TITLE = { followers: '팔로워', following: '팔로잉', find: '친구 찾기' } as const;

function PeopleSheet({ kind, onClose }: { kind: People; onClose: () => void }) {
  const following = useFollowing();
  const cloudFollowers = useCloudFollowers();
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const findMember = useMemberLookup();
  const myId = useMyCloudId();
  const profiles = useCloudStore((s) => s.profiles);
  const [q, setQ] = useState('');
  // 열려 있는 동안 목록이 바뀌어 사라지지 않도록, 연 순간의 목록을 기준으로 표시
  const ids = useMemo(
    () =>
      kind === 'followers'
        ? [...cloudFollowers, ...(myId ? [] : SAMPLE_FOLLOWERS)]
        : kind === 'following'
          ? following
          : kind === 'find'
            ? Object.keys(profiles).filter((id) => id !== myId)
            : [],
    [kind, profiles], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const members = ids
    .map(findMember)
    .filter((m) => kind !== 'find' || !q.trim() || m.nickname.toLowerCase().includes(q.trim().toLowerCase()));
  const isFriend = (id: string) => Boolean(profiles[id]);

  return (
    <Sheet
      open={kind !== null}
      onClose={() => {
        setQ('');
        onClose();
      }}
      title={kind ? PEOPLE_TITLE[kind] : ''}
      description={
        kind === 'find'
          ? 'BookLog에 가입한 사람들이에요. 팔로우하면 공개한 후기가 홈에 보여요.'
          : myId
            ? '‘가입’ 표시가 없는 사람은 샘플 사용자예요. 샘플 팔로우는 이 기기에만 저장돼요.'
            : '샘플 사용자예요. 로그인하면 가입한 친구를 찾아 팔로우할 수 있어요.'
      }
    >
      {kind === 'find' && (
        <input
          type="search"
          className={styles.findInput}
          placeholder="닉네임으로 찾기"
          aria-label="닉네임으로 찾기"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      {members.length === 0 ? (
        <p className={styles.muted}>
          {kind === 'find'
            ? '아직 가입한 다른 사람이 없어요. 친구에게 가입을 부탁해 보세요.'
            : kind === 'followers'
              ? '아직 나를 팔로우한 사람이 없어요.'
              : '아직 팔로우한 사람이 없어요. ‘친구 찾기’에서 찾아보세요.'}
        </p>
      ) : (
        <ul role="list" className={styles.people}>
          {members.map((m) => {
            const on = following.includes(m.id);
            return (
              <li key={m.id}>
                <Avatar name={m.nickname} tone={m.tone} size="md" />
                <span className={styles.personText}>
                  <strong>
                    {m.nickname} {isFriend(m.id) && <Badge tone="outline">가입</Badge>}
                  </strong>
                  <span>{m.bio ?? (isFriend(m.id) ? 'BookLog 사용자' : `@${m.handle}`)}</span>
                </span>
                <Button size="sm" variant={on ? 'outline' : 'primary'} aria-pressed={on} onClick={() => toggleFollow(m.id)}>
                  {on ? '팔로잉' : '팔로우'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

function MyLists({ lists }: { lists: ReturnType<typeof useLists> }) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className={styles.listGrid}>
        {lists.map((l) => (
          <ListCard key={l.id} list={l} />
        ))}
        <button type="button" className={styles.newList} onClick={() => setCreating(true)}>
          <Plus aria-hidden />새 리스트
        </button>
      </div>
      <CreateListSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

/** 로그인하지 않았으면 로그인 안내, 했으면 본 화면 */
export function MyPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<UserRoundIcon aria-hidden />} title="마이 페이지는 로그인 후에 볼 수 있어요" description="내 후기·리스트·참여 모임과 팔로워를 한곳에서 볼 수 있어요." />
        <p style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Link to={paths.settings} style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>
            설정 열기
          </Link>
        </p>
      </Page>
    );
  return <MyPageInner />;
}
