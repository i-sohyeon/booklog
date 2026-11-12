import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Library, Lock, MapPin, Quote as QuoteIcon, RotateCcw } from 'lucide-react';
import type { ReadingStatus } from '@/types/book';
import { READING_STATUS_LABEL } from '@/types/book';
import { useAsync } from '@/hooks/useAsync';
import { useBookLookup, useMemberLookup, useMyCloudId, usePosts } from '@/hooks/useSocial';
import { useCloudStore } from '@/store/cloudStore';
import { useSocialStore } from '@/store/socialStore';
import { useAuthGate } from '@/store/loginGate';
import { fetchFriendShelf, ShelfNotReadyError, type ShelfRecord } from '@/services/friendShelf';
import { byline, knownGenre } from '@/lib/byline';
import { formatDate } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { Avatar, BookCover, Button, EmptyState, ErrorState, LoadingRegion, Sheet, Skeleton, Spoiler, StarRating, Tabs } from '@/components/ui';
import { PostCard } from '@/components/social/PostCard';
import styles from './FriendLibraryPage.module.scss';

/** 친구 서재 놀러가기 — 친구가 공개한 기록만 보여요 */
export function FriendLibraryPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<Library aria-hidden />} title="친구 서재는 로그인 후에 볼 수 있어요" description="친구를 팔로우하고 서로의 책장과 후기를 구경해 보세요." />
      </Page>
    );
  return <FriendLibrary />;
}

function FriendLibrary() {
  const { userId = '' } = useParams();
  const myId = useMyCloudId();
  const member = useMemberLookup()(userId);
  const profile = useCloudStore((s) => s.profiles[userId]);
  const loaded = useCloudStore((s) => s.status === 'ready');
  const follows = useCloudStore((s) => s.follows);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const shelf = useAsync(() => fetchFriendShelf(userId), [userId]);
  const posts = usePosts().filter((p) => p.memberId === userId);
  const isMe = userId === myId;

  const followers = follows.filter((f) => f.followee === userId).length;
  const following = follows.filter((f) => f.follower === userId).length;
  const iFollow = follows.some((f) => f.follower === myId && f.followee === userId);

  if (loaded && !profile)
    return (
      <Page narrow>
        <PageHeader back title="친구 서재" />
        <EmptyState title="사용자를 찾을 수 없어요" description="탈퇴했거나 잘못된 주소일 수 있어요." />
      </Page>
    );

  return (
    <Page narrow>
      <PageHeader back title={isMe ? '친구에게 보이는 내 서재' : `${member.nickname}님의 서재`} />

      {isMe && (
        <p className={styles.preview}>
          친구가 내 서재에 들어오면 이렇게 보여요. 공개 범위는 <Link to={paths.settings}>설정</Link>과 기록마다의 ‘공개’ 스위치에서 바꿀 수 있어요.
        </p>
      )}

      <section className={styles.profile} aria-label="프로필">
        <Avatar name={member.nickname} tone={member.tone} size="lg" />
        <div className={styles.who}>
          <h1 className={styles.name}>{member.nickname}</h1>
          {member.bio && <p className={styles.bio}>{member.bio}</p>}
          <p className={styles.counts}>
            팔로워 <strong>{followers}</strong> · 팔로잉 <strong>{following}</strong>
          </p>
        </div>
        {!isMe && profile && (
          <Button size="sm" variant={iFollow ? 'outline' : 'primary'} aria-pressed={iFollow} onClick={() => toggleFollow(userId)}>
            {iFollow ? '팔로잉' : '팔로우'}
          </Button>
        )}
      </section>

      {shelf.status === 'loading' || shelf.status === 'idle' ? (
        <LoadingRegion label="서재를 불러오는 중">
          <div className={styles.grid}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} variant="cover" />
            ))}
          </div>
        </LoadingRegion>
      ) : shelf.status === 'error' ? (
        shelf.error instanceof ShelfNotReadyError ? (
          <EmptyState title="친구 서재 기능을 준비 중이에요" description="서버 설정(002_friend_library.sql)이 아직 적용되지 않았어요." />
        ) : (
          <ErrorState onRetry={shelf.retry} />
        )
      ) : (
        <Shelf records={shelf.data} libraryPublic={Boolean(profile?.libraryPublic)} nickname={isMe ? '나' : member.nickname} isMe={isMe} />
      )}

      {posts.length > 0 && (
        <section className={styles.section} aria-labelledby="posts-title">
          <h2 id="posts-title" className={styles.h2}>
            게시판에 쓴 글 <span>{posts.length}</span>
          </h2>
          <div className={styles.posts}>
            {posts.slice(0, 10).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

type Tab = ReadingStatus;

function Shelf({ records, libraryPublic, nickname, isMe }: { records: ShelfRecord[]; libraryPublic: boolean; nickname: string; isMe: boolean }) {
  const findBook = useBookLookup();
  const [tab, setTab] = useState<Tab>('done');
  const [open, setOpen] = useState<ShelfRecord | null>(null);

  const byStatus = useMemo(() => {
    const g: Record<Tab, ShelfRecord[]> = { done: [], reading: [], want: [] };
    for (const r of records) g[r.status].push(r);
    g.done.sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));
    return g;
  }, [records]);

  const summary = useMemo(() => {
    const year = String(new Date().getFullYear());
    const thisYear = byStatus.done.filter((r) => r.finishedAt?.startsWith(year)).length;
    const rated = byStatus.done.filter((r) => r.rating !== undefined);
    const avg = rated.length ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : null;
    const genres = new Map<string, number>();
    for (const r of byStatus.done) {
      const g = findBook(r.bookId)?.genre;
      if (g && knownGenre(g)) genres.set(g, (genres.get(g) ?? 0) + 1);
    }
    const top = [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
    return { thisYear, avg, top };
  }, [byStatus, findBook]);

  if (records.length === 0)
    return (
      <EmptyState
        compact
        title={isMe ? '아직 친구에게 보이는 기록이 없어요' : '아직 공개한 기록이 없어요'}
        description={
          isMe
            ? '설정에서 ‘내 서재를 친구에게 보여 주기’를 켜거나, 기록할 때 별점을 공개해 보세요.'
            : `${nickname}님이 서재를 공개하거나 별점을 공개하면 여기에 보여요.`
        }
      />
    );

  const tabs: Tab[] = libraryPublic ? ['done', 'reading', 'want'] : ['done'];
  const list = byStatus[tab];

  return (
    <>
      <dl className={styles.summary}>
        <div>
          <dt>올해 다 읽은 책</dt>
          <dd>{summary.thisYear}권</dd>
        </div>
        <div>
          <dt>평균 별점</dt>
          <dd>{summary.avg !== null ? summary.avg.toFixed(1) : '–'}</dd>
        </div>
        <div>
          <dt>많이 읽은 장르</dt>
          <dd>{summary.top.length ? summary.top.join(' · ') : '–'}</dd>
        </div>
      </dl>

      {libraryPublic ? (
        <Tabs<Tab>
          label="책장"
          variant="pill"
          value={tab}
          onChange={setTab}
          controls="shelf-panel"
          items={tabs.map((t) => ({ value: t, label: READING_STATUS_LABEL[t], count: byStatus[t].length }))}
        />
      ) : (
        <p className={styles.note}>
          <Lock aria-hidden />
          {isMe ? '책장 목록은 비공개예요. 별점을 공개한 다 읽은 책만 보여요.' : `${nickname}님은 별점을 공개한 다 읽은 책만 보여 주고 있어요.`}
        </p>
      )}

      <div id="shelf-panel" role={libraryPublic ? 'tabpanel' : undefined}>
        {list.length === 0 ? (
          <p className={styles.muted}>이 책장은 비어 있어요.</p>
        ) : (
          <ul role="list" className={styles.grid}>
            {list.map((r) => {
              const book = findBook(r.bookId);
              if (!book) return null;
              return (
                <li key={r.bookId}>
                  <button type="button" className={styles.item} onClick={() => setOpen(r)} aria-label={`${book.title} 기록 보기`}>
                    <BookCover book={book} size="fluid" />
                    <span className={styles.itemTitle}>{book.title}</span>
                    {r.rating !== undefined && <StarRating value={r.rating} size="sm" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <RecordSheet record={open} onClose={() => setOpen(null)} />
    </>
  );
}

function RecordSheet({ record, onClose }: { record: ShelfRecord | null; onClose: () => void }) {
  const book = useBookLookup()(record?.bookId ?? '');
  const r = record;
  const hasContent = r && (r.rating !== undefined || r.oneLiner || r.review || r.quotes.length || r.tags.length || r.place || r.occasion);
  return (
    <Sheet open={Boolean(r && book)} onClose={onClose} title={book?.title ?? ''} description={book ? byline(book) : undefined}>
      {r && book && (
        <div className={styles.record}>
          <div className={styles.recordTop}>
            <Link to={paths.book(book.id)} className={styles.recordCover} onClick={onClose}>
              <BookCover book={book} size="fluid" />
            </Link>
            <div className={styles.recordMeta}>
              <span className={styles.status}>{READING_STATUS_LABEL[r.status]}</span>
              {r.rating !== undefined && <StarRating value={r.rating} size="md" />}
              {r.finishedAt && <span className={styles.muted}>{formatDate(r.finishedAt)} 완독</span>}
              {r.readCount > 1 && (
                <span className={styles.muted}>
                  <RotateCcw aria-hidden /> {r.readCount}회독
                </span>
              )}
            </div>
          </div>

          {!hasContent && <p className={styles.muted}>공개한 기록 내용이 없어요.</p>}

          {(r.oneLiner || r.review) && (
            <Spoiler active={r.spoiler}>
              {r.oneLiner && <p className={styles.oneLiner}>{r.oneLiner}</p>}
              {r.review && <p className={styles.review}>{r.review}</p>}
            </Spoiler>
          )}

          {r.quotes.length > 0 && (
            <ul role="list" className={styles.quotes}>
              {r.quotes.map((q) => (
                <li key={q.id}>
                  <QuoteIcon aria-hidden />
                  <p>{q.text}</p>
                </li>
              ))}
            </ul>
          )}

          {(r.place || r.occasion) && (
            <p className={styles.context}>
              <MapPin aria-hidden />
              {[r.place, r.occasion].filter(Boolean).join(' · ')}
            </p>
          )}

          {r.tags.length > 0 && (
            <p className={styles.tags}>
              {r.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </p>
          )}

          <Link to={paths.book(book.id)} className={styles.bookLink} onClick={onClose}>
            책 정보 보기
          </Link>
        </div>
      )}
    </Sheet>
  );
}
