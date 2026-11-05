import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Plus, Settings } from 'lucide-react';
import { SAMPLE_FOLLOWERS, SAMPLE_MEMBERS } from '@/mocks/social';
import { useSocialStore } from '@/store/socialStore';
import { useProfile } from '@/hooks/useProfile';
import { useClubs, useLists, useReviews } from '@/hooks/useSocial';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { Avatar, Badge, Button, ButtonLink, EmptyState, Sheet, Tabs } from '@/components/ui';
import { ReviewCard } from '@/components/social/ReviewCard';
import { ListCard } from '@/components/social/ListCard';
import { ClubCard } from '@/components/social/ClubCard';
import { CreateListSheet } from '@/components/social/ListSheets';
import styles from './MyPage.module.scss';

type Tab = 'reviews' | 'lists' | 'clubs';
type People = 'followers' | 'following' | null;

/** 마이 — 프로필 · 팔로워/팔로잉 · 내 후기 · 내 리스트 · 참여 중인 모임 · 설정 */
export function MyPage() {
  const profile = useProfile();
  const following = useSocialStore((s) => s.following);
  const [tab, setTab] = useState<Tab>('reviews');
  const [people, setPeople] = useState<People>(null);

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
            <strong>{SAMPLE_FOLLOWERS.length}</strong> 팔로워
          </button>
          <button type="button" onClick={() => setPeople('following')}>
            <strong>{following.length}</strong> 팔로잉
          </button>
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

function PeopleSheet({ kind, onClose }: { kind: People; onClose: () => void }) {
  const following = useSocialStore((s) => s.following);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  // 열려 있는 동안 목록이 바뀌어 사라지지 않도록, 연 순간의 목록을 기준으로 표시
  const ids = useMemo(() => (kind === 'followers' ? SAMPLE_FOLLOWERS : kind === 'following' ? following : []), [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const members = SAMPLE_MEMBERS.filter((m) => ids.includes(m.id));

  return (
    <Sheet open={kind !== null} onClose={onClose} title={kind === 'followers' ? '팔로워' : '팔로잉'} description="샘플 사용자예요. 팔로우는 이 기기에만 저장돼요.">
      {members.length === 0 ? (
        <p className={styles.muted}>아직 아무도 없어요.</p>
      ) : (
        <ul role="list" className={styles.people}>
          {members.map((m) => {
            const on = following.includes(m.id);
            return (
              <li key={m.id}>
                <Avatar name={m.nickname} tone={m.tone} size="md" />
                <span className={styles.personText}>
                  <strong>{m.nickname}</strong>
                  <span>{m.bio ?? `@${m.handle}`}</span>
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
