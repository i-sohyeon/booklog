import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PenLine, Plus } from 'lucide-react';
import type { PostKind } from '@/types/social';
import { POST_KIND_LABEL } from '@/types/social';
import { useMyCloudId, usePosts } from '@/hooks/useSocial';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { ButtonLink, EmptyState, Tabs } from '@/components/ui';
import { PostCard } from '@/components/social/PostCard';
import { SampleNotice } from '@/components/common/SampleNotice';
import { ClubsPanel } from '@/pages/clubs/ClubsPanel';
import styles from './CommunityPage.module.scss';

type Segment = 'board' | 'clubs';

/** 커뮤니티 — 상단 세그먼트: 게시판 | 독서모임 (?tab=clubs) */
export function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const segment: Segment = params.get('tab') === 'clubs' ? 'clubs' : 'board';
  const setSegment = (s: Segment) => setParams(s === 'clubs' ? { tab: 'clubs' } : {}, { replace: true });

  return (
    <Page narrow>
      <PageHeader
        title="커뮤니티"
        actions={
          // 모바일은 하단 플로팅 버튼으로 대신해요
          <span className={styles.desktopAction}>
            {segment === 'board' ? (
              <ButtonLink to={paths.postNew} size="sm" leadingIcon={<PenLine aria-hidden />}>
                글쓰기
              </ButtonLink>
            ) : (
              <ButtonLink to={paths.clubNew} size="sm" leadingIcon={<Plus aria-hidden />}>
                모임 만들기
              </ButtonLink>
            )}
          </span>
        }
      />
      <Tabs<Segment>
        label="커뮤니티 메뉴"
        variant="segment"
        value={segment}
        onChange={setSegment}
        controls="community-panel"
        items={[
          { value: 'board', label: '게시판' },
          { value: 'clubs', label: '독서모임' },
        ]}
      />
      <div id="community-panel" role="tabpanel" className={styles.panel}>
        {segment === 'board' ? <Board /> : <ClubsPanel />}
      </div>
    </Page>
  );
}

type Filter = PostKind | 'all';

function Board() {
  const posts = usePosts();
  const signedIn = useMyCloudId() !== null;
  const [filter, setFilter] = useState<Filter>('all');
  const items = useMemo(() => (filter === 'all' ? posts : posts.filter((p) => p.kind === filter)), [posts, filter]);

  return (
    <>
      <SampleNotice>
        {signedIn
          ? '가입한 사람들의 글과 샘플 글이 함께 보여요. 내가 쓴 글·댓글·좋아요는 계정에 저장돼 친구에게도 보여요.'
          : '샘플 게시판이에요. 로그인하지 않으면 내가 쓴 글·댓글·좋아요는 이 기기에만 저장되고 다른 사람에게 보이지 않아요.'}
      </SampleNotice>
      <div className={styles.filters}>
        <Tabs<Filter>
          label="글 카테고리"
          variant="pill"
          bleed
          value={filter}
          onChange={setFilter}
          controls="post-list"
          items={[{ value: 'all', label: '전체' }, ...(Object.keys(POST_KIND_LABEL) as PostKind[]).map((k) => ({ value: k, label: POST_KIND_LABEL[k] }))]}
        />
      </div>
      <div id="post-list" role="tabpanel" aria-label="글 목록" className={styles.posts}>
        {items.length === 0 ? (
          <EmptyState compact title="아직 글이 없어요" description="첫 이야기를 남겨보세요." action={<ButtonLink to={paths.postNew}>글쓰기</ButtonLink>} />
        ) : (
          items.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </>
  );
}
