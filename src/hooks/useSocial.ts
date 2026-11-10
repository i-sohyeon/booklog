import { useCallback, useMemo } from 'react';
import type { Club, CurationList, Member, Post, Review } from '@/types/social';
import { ME_ID, SAMPLE_CLUBS, SAMPLE_LISTS, SAMPLE_MEMBERS, SAMPLE_POSTS, SAMPLE_REVIEWS } from '@/mocks/social';
import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { useSocialStore } from '@/store/socialStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useProfile } from './useProfile';
import type { Book } from '@/types/book';

const memberMap = new Map(SAMPLE_MEMBERS.map((m) => [m.id, m]));
const catalogMap = new Map(SAMPLE_CATALOG.map((b) => [b.id, b]));

/** 사용자 조회 (나 포함) */
export function useMemberLookup() {
  const profile = useProfile();
  return useCallback(
    (id: string): Member =>
      id === ME_ID
        ? { id: ME_ID, nickname: profile.nickname, handle: profile.handle ?? 'me', tone: 'plum' }
        : (memberMap.get(id) ?? { id, nickname: '알 수 없음', handle: 'unknown', tone: 'ink' }),
    [profile.nickname, profile.handle],
  );
}

/** 책 조회: 내 서재 → 샘플 카탈로그 */
export function useBookLookup() {
  const books = useLibraryStore((s) => s.books);
  return useCallback((id: string): Book | undefined => books[id] ?? catalogMap.get(id), [books]);
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
    return [...mine, ...SAMPLE_REVIEWS].map((r) => {
      const isLiked = liked.includes(r.id);
      return { ...r, liked: isLiked, likeCount: r.likes + (isLiked ? 1 : 0), isMine: r.memberId === ME_ID };
    });
  }, [entries, liked]);
}

export interface PostView extends Post {
  liked: boolean;
  likeCount: number;
  isMine: boolean;
}

export function usePosts(): PostView[] {
  const myPosts = useSocialStore((s) => s.myPosts);
  const extra = useSocialStore((s) => s.extraComments);
  const liked = useSocialStore((s) => s.liked.post);
  return useMemo(
    () =>
      [...myPosts, ...SAMPLE_POSTS]
        .map((p) => {
          const isLiked = liked.includes(p.id);
          return {
            ...p,
            comments: [...p.comments, ...(extra[p.id] ?? [])],
            liked: isLiked,
            likeCount: p.likes + (isLiked ? 1 : 0),
            isMine: p.memberId === ME_ID,
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [myPosts, extra, liked],
  );
}

export interface ClubView extends Club {
  joined: boolean;
  isHost: boolean;
  full: boolean;
}

export function useClubs(): ClubView[] {
  const myClubs = useSocialStore((s) => s.myClubs);
  const joined = useSocialStore((s) => s.joinedClubs);
  const threads = useSocialStore((s) => s.clubThreads);
  return useMemo(
    () =>
      [...myClubs, ...SAMPLE_CLUBS].map((c) => {
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
      }),
    [myClubs, joined, threads],
  );
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
