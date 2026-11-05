import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Club, ClubSession, Comment, CurationList, Post, PostKind } from '@/types/social';
import { ME_ID, SAMPLE_FOLLOWING, SAMPLE_JOINED_CLUBS } from '@/mocks/social';

/**
 * 소셜 상호작용 (이 기기 로컬 저장).
 * 서버 연결 전이라 내 좋아요·글·댓글·모임 참여는 이 브라우저에만 저장되고
 * 다른 사용자에게 보이지 않습니다.
 */
type LikeKind = 'review' | 'post' | 'list';

interface SocialState {
  liked: Record<LikeKind, string[]>;
  myPosts: Post[];
  /** 샘플 글에 내가 단 댓글 */
  extraComments: Record<string, Comment[]>;
  joinedClubs: string[];
  myClubs: Club[];
  clubThreads: Record<string, Comment[]>;
  myLists: CurationList[];
  following: string[];
}

export interface NewPostInput {
  kind: PostKind;
  body: string;
  quote?: string;
  bookId?: string;
  spoiler: boolean;
}

export interface NewClubInput {
  name: string;
  bookId: string;
  description: string;
  capacity: number;
  durationMin: number;
  sessions: Array<Pick<ClubSession, 'range' | 'startsAt'>>;
}

interface SocialActions {
  toggleLike: (kind: LikeKind, id: string) => void;
  addPost: (input: NewPostInput) => string;
  deletePost: (id: string) => void;
  addComment: (postId: string, body: string, spoiler?: boolean) => void;
  joinClub: (id: string) => void;
  leaveClub: (id: string) => void;
  createClub: (input: NewClubInput) => string;
  addClubComment: (clubId: string, body: string) => void;
  createList: (title: string, description: string, bookIds: string[]) => string;
  toggleBookInList: (listId: string, bookId: string) => void;
  deleteList: (id: string) => void;
  toggleFollow: (memberId: string) => void;
  reset: () => void;
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();

const initial = (): SocialState => ({
  liked: { review: [], post: [], list: [] },
  myPosts: [],
  extraComments: {},
  joinedClubs: [...SAMPLE_JOINED_CLUBS],
  myClubs: [],
  clubThreads: {},
  myLists: [],
  following: [...SAMPLE_FOLLOWING],
});

export const useSocialStore = create<SocialState & SocialActions>()(
  persist(
    (set) => ({
      ...initial(),

      toggleLike: (kind, id) =>
        set((s) => {
          const list = s.liked[kind];
          return { liked: { ...s.liked, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } };
        }),

      addPost: (input) => {
        const id = uid('post');
        set((s) => ({
          myPosts: [
            {
              id,
              memberId: ME_ID,
              kind: input.kind,
              body: input.body.trim(),
              quote: input.quote?.trim() || undefined,
              bookId: input.bookId,
              spoiler: input.spoiler,
              likes: 0,
              comments: [],
              createdAt: nowIso(),
            },
            ...s.myPosts,
          ],
        }));
        return id;
      },

      deletePost: (id) => set((s) => ({ myPosts: s.myPosts.filter((p) => p.id !== id) })),

      addComment: (postId, body, spoiler) =>
        set((s) => {
          const comment: Comment = { id: uid('cmt'), memberId: ME_ID, body: body.trim(), createdAt: nowIso(), spoiler: spoiler || undefined };
          const mine = s.myPosts.find((p) => p.id === postId);
          if (mine) return { myPosts: s.myPosts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)) };
          return { extraComments: { ...s.extraComments, [postId]: [...(s.extraComments[postId] ?? []), comment] } };
        }),

      joinClub: (id) => set((s) => (s.joinedClubs.includes(id) ? s : { joinedClubs: [...s.joinedClubs, id] })),
      leaveClub: (id) => set((s) => ({ joinedClubs: s.joinedClubs.filter((x) => x !== id) })),

      createClub: (input) => {
        const id = uid('club');
        set((s) => ({
          myClubs: [
            {
              id,
              name: input.name.trim(),
              bookId: input.bookId,
              hostId: ME_ID,
              description: input.description.trim(),
              capacity: input.capacity,
              memberIds: [ME_ID],
              durationMin: input.durationMin,
              sessions: input.sessions.map((x, i) => ({ week: i + 1, range: x.range.trim(), startsAt: x.startsAt })),
              thread: [],
              createdAt: nowIso(),
            },
            ...s.myClubs,
          ],
        }));
        return id;
      },

      addClubComment: (clubId, body) =>
        set((s) => ({
          clubThreads: {
            ...s.clubThreads,
            [clubId]: [...(s.clubThreads[clubId] ?? []), { id: uid('t'), memberId: ME_ID, body: body.trim(), createdAt: nowIso() }],
          },
        })),

      createList: (title, description, bookIds) => {
        const id = uid('list');
        set((s) => ({
          myLists: [{ id, ownerId: ME_ID, title: title.trim(), description: description.trim(), bookIds, likes: 0, createdAt: nowIso() }, ...s.myLists],
        }));
        return id;
      },

      toggleBookInList: (listId, bookId) =>
        set((s) => ({
          myLists: s.myLists.map((l) =>
            l.id === listId ? { ...l, bookIds: l.bookIds.includes(bookId) ? l.bookIds.filter((b) => b !== bookId) : [...l.bookIds, bookId] } : l,
          ),
        })),

      deleteList: (id) => set((s) => ({ myLists: s.myLists.filter((l) => l.id !== id) })),

      toggleFollow: (memberId) =>
        set((s) => ({
          following: s.following.includes(memberId) ? s.following.filter((x) => x !== memberId) : [...s.following, memberId],
        })),

      reset: () => set(initial()),
    }),
    {
      name: 'booklog:social',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 → v2: 샘플 기본 참여 모임 추가
      migrate: (persisted) => {
        const s = persisted as SocialState;
        return { ...s, joinedClubs: [...new Set([...SAMPLE_JOINED_CLUBS, ...(s.joinedClubs ?? [])])] };
      },
    },
  ),
);
