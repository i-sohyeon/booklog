import { useMemo, useState } from 'react';
import { useSocialStore } from '@/store/socialStore';
import { useClubs, type ClubView } from '@/hooks/useSocial';
import { paths } from '@/routes/paths';
import { Button, ButtonLink, EmptyState, Tabs, useToast } from '@/components/ui';
import { ClubCard } from '@/components/social/ClubCard';
import { SampleNotice } from '@/components/common/SampleNotice';
import { requireLogin } from '@/store/loginGate';
import styles from './ClubsPanel.module.scss';

type Filter = 'open' | 'mine';

/** 커뮤니티 > 독서모임: 모집 중인 온라인 모임 */
export function ClubsPanel() {
  const clubs = useClubs();
  const [filter, setFilter] = useState<Filter>('open');
  const items = useMemo(() => {
    if (filter === 'mine') return clubs.filter((c) => c.joined);
    // 모집 중 먼저, 마감은 뒤로
    return [...clubs].sort((a, b) => Number(a.full) - Number(b.full));
  }, [clubs, filter]);
  const joinedCount = clubs.filter((c) => c.joined).length;

  return (
    <>
      <SampleNotice>로그인하면 만든 모임과 참여·토론이 계정에 저장돼 다른 사람과 함께 볼 수 있어요. 샘플 모임 참여는 이 기기에만 저장되고, 화상 모임 연결은 준비 중이에요.</SampleNotice>
      <div className={styles.filters}>
        <Tabs<Filter>
          label="모임 보기"
          variant="pill"
          value={filter}
          onChange={setFilter}
          controls="club-list"
          items={[
            { value: 'open', label: '모집 중' },
            { value: 'mine', label: '참여 중', count: joinedCount },
          ]}
        />
      </div>
      <div id="club-list" role="tabpanel" aria-label="모임 목록" className={styles.list}>
        {items.length === 0 ? (
          <EmptyState compact title="참여 중인 모임이 없어요" description="마음에 드는 모임에 참여하거나 직접 만들어 보세요." action={<ButtonLink to={paths.clubNew}>모임 만들기</ButtonLink>} />
        ) : (
          items.map((c) => <ClubCard key={c.id} club={c} action={<JoinButton club={c} />} />)
        )}
      </div>
    </>
  );
}

export function JoinButton({ club }: { club: ClubView }) {
  const join = useSocialStore((s) => s.joinClub);
  const showToast = useToast((s) => s.show);
  if (club.isHost) return <ButtonLink to={paths.club(club.id)} variant="outline" size="sm">내가 만든 모임</ButtonLink>;
  if (club.joined) return <ButtonLink to={paths.club(club.id)} variant="secondary" size="sm">참여 중</ButtonLink>;
  if (club.full) return <Button size="sm" variant="outline" disabled>모집 마감</Button>;
  return (
    <Button
      size="sm"
      onClick={() => {
        if (!requireLogin('모임에 참여하려면 로그인해 주세요.')) return;
        join(club.id);
        showToast(`「${club.name}」에 참여했어요`);
      }}
    >
      참여하기
    </Button>
  );
}
