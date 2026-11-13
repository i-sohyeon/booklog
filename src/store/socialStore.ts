import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCloudStore } from './cloudStore';
import type { Club, ClubSession, Comment, CurationList, Post, PostKind } from '@/types/social';
import { requireLogin } from './loginGate';
import { ME_ID, SAMPLE_FOLLOWING, SAMPLE_JOINED_CLUBS } from '@/mocks/social';

/**
 * 소셜 상호작용 (이 기기 로컬 저장).
 * 로그인한 사용자의 글·댓글·좋아요·독서모임은 서버(cloudStore)로 보내고,
 * 여기에는 샘플 콘텐츠에 대한 반응과 서버를 쓸 수 없을 때의 기록만 남습니다.
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
  /** 로그인 중이고 서버에 모임 테이블이 있으면 서버에, 아니면 이 기기에 저장 */
  createClub: (input: NewClubInput) => Promise<string>;
  addClubComment: (clubId: string, body: string) => void;
  createList: (title: string, description: string, bookIds: string[]) => string;
  toggleBookInList: (listId: string, bookId: string) => void;
  deleteList: (id: string) => void;
  toggleFollow: (memberId: string) => void;
  reset: () => void;
  /** 계정으로 처음 로그인할 때: 샘플 사용자 팔로우·샘플 모임 참여를 비움 */
  clearSampleRelations: () => void;
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

      toggleLike: (kind, id) => {
        if (!requireLogin('공감하려면 로그인해 주세요.')) return;
        // 가입한 사람의 글·후기는 서버에 저장 (친구와 공유)
        const cloud = useCloudStore.getState();
        if ((kind === 'post' && cloud.isCloudPost(id)) || (kind === 'review' && cloud.isCloudReview(id))) {
          void cloud.toggleLike(kind, id);
          return;
        }
        set((s) => {
          const list = s.liked[kind];
          return { liked: { ...s.liked, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } };
        });
      },

      addPost: (input) => {
        // 로그인 중이면 서버에 올려 친구와 공유
        const cloud = useCloudStore.getState();
        if (cloud.me) return cloud.addPost(input);
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

      deletePost: (id) => {
        const cloud = useCloudStore.getState();
        if (cloud.isCloudPost(id)) {
          void cloud.deletePost(id);
          return;
        }
        set((s) => ({ myPosts: s.myPosts.filter((p) => p.id !== id) }));
      },

      addComment: (postId, body, spoiler) => {
        if (!requireLogin('댓글을 남기려면 로그인해 주세요.')) return;
        const cloud = useCloudStore.getState();
        if (cloud.isCloudPost(postId)) {
          void cloud.addComment(postId, body, spoiler);
          return;
        }
        set((s) => {
          const comment: Comment = { id: uid('cmt'), memberId: ME_ID, body: body.trim(), createdAt: nowIso(), spoiler: spoiler || undefined };
          const mine = s.myPosts.find((p) => p.id === postId);
          if (mine) return { myPosts: s.myPosts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)) };
          return { extraComments: { ...s.extraComments, [postId]: [...(s.extraComments[postId] ?? []), comment] } };
        });
      },

      joinClub: (id) => {
        if (!requireLogin('모임에 참여하려면 로그인해 주세요.')) return;
        const cloud = useCloudStore.getState();
        if (cloud.isCloudClub(id)) {
          void cloud.joinClub(id);
          return;
        }
        set((s) => (s.joinedClubs.includes(id) ? s : { joinedClubs: [...s.joinedClubs, id] }));
      },
      leaveClub: (id) => {
        const cloud = useCloudStore.getState();
        if (cloud.isCloudClub(id)) {
          void cloud.leaveClub(id);
          return;
        }
        set((s) => ({ joinedClubs: s.joinedClubs.filter((x) => x !== id) }));
      },

      createClub: async (input) => {
        const cloud = useCloudStore.getState();
        if (cloud.me && cloud.clubsReady) return cloud.createClub(input);
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

      addClubComment: (clubId, body) => {
        if (!requireLogin('모임 글을 남기려면 로그인해 주세요.')) return;
        const cloud = useCloudStore.getState();
        if (cloud.isCloudClub(clubId)) {
          void cloud.addClubComment(clubId, body);
          return;
        }
        set((s) => ({
          clubThreads: {
            ...s.clubThreads,
            [clubId]: [...(s.clubThreads[clubId] ?? []), { id: uid('t'), memberId: ME_ID, body: body.trim(), createdAt: nowIso() }],
          },
        }));
      },

      createList: (title, description, bookIds) => {
        const id = uid('list');
        set((s) => ({
          myLists: [{ id, ownerId: ME_ID, title: title.trim(), description: description.trim(), bookIds, likes: 0, createdAt: nowIso() }, ...s.myLists],
        }));
        return id;
      },

      toggleBookInList: (listId, bookId) => {
        if (!requireLogin('리스트에 담으려면 로그인해 주세요.')) return;
        set((s) => ({
          myLists: s.myLists.map((l) =>
            l.id === listId ? { ...l, bookIds: l.bookIds.includes(bookId) ? l.bookIds.filter((b) => b !== bookId) : [...l.bookIds, bookId] } : l,
          ),
        }));
      },

      deleteList: (id) => set((s) => ({ myLists: s.myLists.filter((l) => l.id !== id) })),

      toggleFollow: (memberId) => {
        if (!requireLogin('팔로우하려면 로그인해 주세요.')) return;
        const cloud = useCloudStore.getState();
        if (cloud.isCloudMember(memberId)) {
          void cloud.toggleFollow(memberId);
          return;
        }
        set((s) => ({
          following: s.following.includes(memberId) ? s.following.filter((x) => x !== memberId) : [...s.following, memberId],
        }));
      },

      reset: () => set(initial()),
      clearSampleRelations: () => set({ following: [], joinedClubs: [] }),
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

/**
 * 서버 저장 전에 이 기기에만 만들어 둔 모임을 계정으로 옮깁니다(로그인 후 서버 준비가 끝나면 한 번).
 * 옮긴 모임은 기기 목록에서 지우고, 내가 남긴 토론 글도 함께 옮깁니다.
 */
let uploadingClubs = false;
export async function uploadLocalClubs() {
  const cloud = useCloudStore.getState();
  if (uploadingClubs || !cloud.me || !cloud.clubsReady) return;
  uploadingClubs = true;
  try {
    await uploadEach();
  } finally {
    uploadingClubs = false;
  }
}

async function uploadEach() {
  const cloud = useCloudStore.getState();
  const { myClubs, clubThreads } = useSocialStore.getState();
  for (const club of [...myClubs].reverse()) {
    try {
      const id = await cloud.createClub({
        name: club.name,
        bookId: club.bookId,
        description: club.description,
        capacity: club.capacity,
        durationMin: club.durationMin,
        sessions: club.sessions,
      });
      for (const c of clubThreads[club.id] ?? []) await useCloudStore.getState().addClubComment(id, c.body);
      useSocialStore.setState((s) => {
        const threads = { ...s.clubThreads };
        delete threads[club.id];
        return { myClubs: s.myClubs.filter((x) => x.id !== club.id), clubThreads: threads };
      });
    } catch {
      // 실패한 모임은 기기에 남겨 두고 다음 로그인 때 다시 시도
    }
  }
}
