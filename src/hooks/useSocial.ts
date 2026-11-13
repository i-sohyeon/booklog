import { useCallback, useMemo } from 'react';
import type { Club, CurationList, Member, Post, Review } from '@/types/social';
import { ME_ID, SAMPLE_CLUBS, SAMPLE_LISTS, SAMPLE_MEMBERS, SAMPLE_POSTS, SAMPLE_REVIEWS } from '@/mocks/social';
import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { useSocialStore } from '@/store/socialStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import { useBookCache } from '@/store/bookCache';
import { cloudUserFollowing, useCloudStore } from '@/store/cloudStore';
import type { AvatarTone } from '@/types/social';
import { useProfile } from './useProfile';
import type { Book } from '@/types/book';

const memberMap = new Map(SAMPLE_MEMBERS.map((m) => [m.id, m]));
const catalogMap = new Map(SAMPLE_CATALOG.map((b) => [b.id, b]));

const TONES: AvatarTone[] = ['plum', 'ochre', 'sage', 'clay', 'sea', 'ink'];
const toneFor = (id: string) => TONES[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length]!;

/** 지금 로그인한 계정 id (없으면 null) */
export function useMyCloudId() {
  return useAuthStore((s) => s.user?.id ?? null);
}

/** 나인지: 이 기기의 나(ME_ID) 또는 로그인한 계정 */
export function useIsMe() {
  const myId = useMyCloudId();
  return useCallback((id: string) => id === ME_ID || (myId !== null && id === myId), [myId]);
}

/** 사용자 조회: 나 → 가입한 사용자(서버) → 샘플 사용자 */
export function useMemberLookup() {
  const profile = useProfile();
  const profiles = useCloudStore((s) => s.profiles);
  const isMe = useIsMe();
  return useCallback(
    (id: string): Member => {
      if (isMe(id)) return { id, nickname: profile.nickname, handle: profile.handle ?? 'me', tone: 'plum' };
      const p = profiles[id];
      if (p) return { id, nickname: p.nickname, handle: p.nickname, bio: p.bio, tone: toneFor(id) };
      return memberMap.get(id) ?? { id, nickname: '알 수 없음', handle: 'unknown', tone: 'ink' };
    },
    [profile.nickname, profile.handle, profiles, isMe],
  );
}

/** 내가 팔로우하는 사람: 샘플 사용자(이 기기) + 가입한 친구(서버) */
export function useFollowing(): string[] {
  const local = useSocialStore((s) => s.following);
  const me = useCloudStore((s) => s.me);
  const follows = useCloudStore((s) => s.follows);
  return useMemo(() => [...cloudUserFollowing({ me, follows }), ...local], [me, follows, local]);
}

/** 나를 팔로우하는 가입한 친구(서버) */
export function useCloudFollowers(): string[] {
  const me = useCloudStore((s) => s.me);
  const follows = useCloudStore((s) => s.follows);
  return useMemo(() => (me ? follows.filter((f) => f.followee === me).map((f) => f.follower) : []), [me, follows]);
}



/** 책 조회: 내 서재 → 샘플 카탈로그 → 도서 API로 본 책(캐시) */
export function useBookLookup() {
  const books = useLibraryStore((s) => s.books);
  const cached = useBookCache((s) => s.books);
  return useCallback((id: string): Book | undefined => books[id] ?? catalogMap.get(id) ?? cached[id], [books, cached]);
}

export interface ReviewView extends Review {
  liked: boolean;
  likeCount: number;
  isMine: boolean;
}

/** 모든 후기: 샘플 후기 + 내가 다 읽은 책의 기록 */
export function useReviews(): ReviewView[] {
  const entries = useLibraryStore((s) => s.entries);
  const liked = useSocialStore((s) => s.liked.review);
  const cloudReviews = useCloudStore((s) => s.reviews);
  const cloudLikes = useCloudStore((s) => s.likes);
  const myId = useMyCloudId();
  return useMemo(() => {
    const mine: Review[] = Object.values(entries)
      .filter((e) => e.status === 'done' && e.rating && e.oneLiner)
      .map((e) => ({
        id: `mine-${e.bookId}`,
        memberId: ME_ID,
        bookId: e.bookId,
        rating: e.rating!,
        oneLiner: e.oneLiner!,
        review: e.review,
        spoiler: e.spoiler,
        finishedAt: e.finishedAt ?? e.updatedAt.slice(0, 10),
        createdAt: e.updatedAt,
        likes: 0,
      }));
    // 가입한 다른 사람이 공개한 후기 (내 것은 위의 이 기기 기록으로 표시)
    const friends: ReviewView[] = cloudReviews
      .filter((r) => r.userId !== myId)
      .map((r) => {
        const likers = cloudLikes.filter((l) => l.kind === 'review' && l.targetId === r.id);
        return {
          id: r.id,
          memberId: r.userId,
          bookId: r.bookId,
          rating: r.rating,
          oneLiner: r.oneLiner ?? '',
          spoiler: r.spoiler || undefined,
          finishedAt: r.finishedAt,
          createdAt: r.updatedAt,
          likes: 0,
          liked: myId !== null && likers.some((l) => l.userId === myId),
          likeCount: likers.length,
          isMine: false,
        };
      });
    const local = [...mine, ...SAMPLE_REVIEWS].map((r) => {
      const isLiked = liked.includes(r.id);
      return { ...r, liked: isLiked, likeCount: r.likes + (isLiked ? 1 : 0), isMine: r.memberId === ME_ID };
    });
    return [...friends, ...local];
  }, [entries, liked, cloudReviews, cloudLikes, myId]);
}

export interface PostView extends Post {
  liked: boolean;
  likeCount: number;
  isMine: boolean;
}

/** 게시판: 로그인하면 서버 글(친구와 공유) + 샘플 글, 아니면 이 기기 글 + 샘플 글 */
export function usePosts(): PostView[] {
  const myPosts = useSocialStore((s) => s.myPosts);
  const extra = useSocialStore((s) => s.extraComments);
  const liked = useSocialStore((s) => s.liked.post);
  const cloudPosts = useCloudStore((s) => s.posts);
  const cloudLikes = useCloudStore((s) => s.likes);
  const myId = useMyCloudId();
  return useMemo(() => {
    const server: PostView[] = myId
      ? cloudPosts.map((p) => {
          const likers = cloudLikes.filter((l) => l.kind === 'post' && l.targetId === p.id);
          return { ...p, liked: likers.some((l) => l.userId === myId), likeCount: likers.length, isMine: p.memberId === myId };
        })
      : [];
    const local: PostView[] = [...(myId ? [] : myPosts), ...SAMPLE_POSTS].map((p) => {
      const isLiked = liked.includes(p.id);
      return {
        ...p,
        comments: [...p.comments, ...(extra[p.id] ?? [])],
        liked: isLiked,
        likeCount: p.likes + (isLiked ? 1 : 0),
        isMine: p.memberId === ME_ID,
      };
    });
    return [...server, ...local].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [myPosts, extra, liked, cloudPosts, cloudLikes, myId]);
}

export interface ClubView extends Club {
  joined: boolean;
  isHost: boolean;
  full: boolean;
}

/** 독서모임: 로그인하면 서버 모임(다른 사용자와 공유) + 이 기기 모임 + 샘플 모임 */
export function useClubs(): ClubView[] {
  const myClubs = useSocialStore((s) => s.myClubs);
  const joined = useSocialStore((s) => s.joinedClubs);
  const threads = useSocialStore((s) => s.clubThreads);
  const cloudClubs = useCloudStore((s) => s.clubs);
  const myId = useMyCloudId();
  return useMemo(() => {
    const server: ClubView[] = myId
      ? cloudClubs.map((c) => {
          const isHost = c.hostId === myId;
          const isJoined = isHost || c.memberIds.includes(myId);
          return { ...c, joined: isJoined, isHost, full: c.memberIds.length >= c.capacity };
        })
      : [];
    const local: ClubView[] = [...myClubs, ...SAMPLE_CLUBS].map((c) => {
      const isHost = c.hostId === ME_ID;
      const isJoined = isHost || joined.includes(c.id);
      const memberIds = isJoined && !c.memberIds.includes(ME_ID) ? [...c.memberIds, ME_ID] : c.memberIds;
      return {
        ...c,
        memberIds,
        thread: [...c.thread, ...(threads[c.id] ?? [])],
        joined: isJoined,
        isHost,
        full: memberIds.length >= c.capacity,
      };
    });
    return [...server, ...local];
  }, [myClubs, joined, threads, cloudClubs, myId]);
}

export interface ListView extends CurationList {
  liked: boolean;
  likeCount: number;
  isMine: boolean;
}

export function useLists(): ListView[] {
  const myLists = useSocialStore((s) => s.myLists);
  const liked = useSocialStore((s) => s.liked.list);
  return useMemo(
    () =>
      [...myLists, ...SAMPLE_LISTS].map((l) => {
        const isLiked = liked.includes(l.id);
        return { ...l, liked: isLiked, likeCount: l.likes + (isLiked ? 1 : 0), isMine: l.ownerId === ME_ID };
      }),
    [myLists, liked],
  );
}
