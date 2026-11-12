import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Club, ClubSession, Comment, Post, PostKind } from '@/types/social';
import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { cacheBooks, useBookCache } from './bookCache';
import { useLibraryStore } from './libraryStore';
import { fromBookRow, toBookRow } from '@/services/cloudSync';

/**
 * 서버(Supabase)에 저장되는 소셜 데이터 — 로그인한 사용자끼리 공유됩니다.
 * 프로필 · 팔로우 · 공개 후기 · 게시판 글/댓글 · 좋아요 · 독서모임.
 * (테스트용 소규모 사용을 전제로 로그인 시 한 번에 불러오고, 화면 진입 시 새로고침합니다.)
 */
export interface CloudProfile {
  id: string;
  nickname: string;
  bio?: string;
  /** 책장(읽는 중·읽고 싶어요 포함) 공개 */
  libraryPublic: boolean;
}

export interface CloudReview {
  /** 'u:<userId>:<bookId>' */
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  oneLiner?: string;
  spoiler: boolean;
  finishedAt: string;
  updatedAt: string;
}

interface Like {
  kind: 'post' | 'review';
  targetId: string;
  userId: string;
}

interface Follow {
  follower: string;
  followee: string;
}

type LoadStatus = 'off' | 'loading' | 'ready' | 'error';

interface CloudState {
  me: string | null;
  status: LoadStatus;
  error?: string;
  profiles: Record<string, CloudProfile>;
  follows: Follow[];
  reviews: CloudReview[];
  posts: Post[];
  likes: Like[];
  clubs: Club[];
  /** 서버에 모임 테이블이 있는지 (003_clubs.sql 실행 전이면 false → 모임은 기기에 저장) */
  clubsReady: boolean;
}

export interface NewCloudClub {
  name: string;
  bookId: string;
  description: string;
  capacity: number;
  durationMin: number;
  sessions: Array<Pick<ClubSession, 'range' | 'startsAt'>>;
}

interface CloudActions {
  start: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** 화면 이동·앱 복귀 시: 최근 15초 안에 불러왔으면 건너뜀 */
  refreshSoon: () => void;
  clear: () => void;
  isCloudPost: (id: string) => boolean;
  isCloudReview: (id: string) => boolean;
  isCloudMember: (id: string) => boolean;
  toggleFollow: (userId: string) => Promise<void>;
  /** 내 책장 공개 켜기/끄기 */
  setLibraryPublic: (on: boolean) => Promise<void>;
  toggleLike: (kind: 'post' | 'review', id: string) => Promise<void>;
  addPost: (input: { kind: PostKind; body: string; quote?: string; bookId?: string; spoiler: boolean }) => string;
  deletePost: (id: string) => Promise<void>;
  addComment: (postId: string, body: string, spoiler?: boolean) => Promise<void>;
  isCloudClub: (id: string) => boolean;
  /** 모임 만들기: 서버에 저장되면 id, 실패하면 오류 */
  createClub: (input: NewCloudClub) => Promise<string>;
  joinClub: (id: string) => Promise<void>;
  leaveClub: (id: string) => Promise<void>;
  addClubComment: (clubId: string, body: string) => Promise<void>;
}

type ClubRow = {
  id: string;
  host_id: string;
  name: string;
  book_id: string;
  description: string | null;
  capacity: number;
  duration_min: number;
  sessions: ClubSession[] | null;
  created_at: string;
};

let lastRefresh = 0;

/** 이 기기가 모르는 책(도서 API 책)은 서버 books 테이블에서 가져와 캐시 */
export async function ensureBooks(ids: string[]) {
  if (!supabase) return;
  const known = new Set([...SAMPLE_CATALOG.map((b) => b.id), ...Object.keys(useLibraryStore.getState().books), ...Object.keys(useBookCache.getState().books)]);
  const missing = [...new Set(ids)].filter((id) => !known.has(id));
  if (!missing.length) return;
  const { data } = await supabase.from('books').select('*').in('id', missing.slice(0, 200));
  if (data) cacheBooks((data as Parameters<typeof fromBookRow>[0][]).map(fromBookRow));
}

type Db = NonNullable<typeof supabase>;

/** 모임 + 참여자 + 토론. 003_clubs.sql 실행 전(테이블 없음)이면 null */
async function loadClubs(db: Db): Promise<Club[] | null> {
  const [clubs, members, comments] = await Promise.all([
    db.from('clubs').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('club_members').select('club_id, user_id, joined_at').order('joined_at', { ascending: true }),
    db.from('club_comments').select('*').order('created_at', { ascending: true }).limit(2000),
  ]);
  if (clubs.error || members.error || comments.error) return null;
  const memberIds = new Map<string, string[]>();
  for (const m of members.data as { club_id: string; user_id: string }[]) memberIds.set(m.club_id, [...(memberIds.get(m.club_id) ?? []), m.user_id]);
  const threads = new Map<string, Comment[]>();
  for (const c of comments.data as { id: string; club_id: string; user_id: string; body: string; created_at: string }[])
    threads.set(c.club_id, [...(threads.get(c.club_id) ?? []), { id: c.id, memberId: c.user_id, body: c.body, createdAt: c.created_at }]);
  return (clubs.data as ClubRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    bookId: c.book_id,
    hostId: c.host_id,
    description: c.description ?? '',
    capacity: c.capacity,
    durationMin: c.duration_min,
    sessions: Array.isArray(c.sessions) ? c.sessions : [],
    memberIds: memberIds.get(c.id) ?? [],
    thread: threads.get(c.id) ?? [],
    createdAt: c.created_at,
  }));
}

export const reviewKey = (userId: string, bookId: string) => `u:${userId}:${bookId}`;

const empty = (): CloudState => ({ me: null, status: 'off', profiles: {}, follows: [], reviews: [], posts: [], likes: [], clubs: [], clubsReady: false });

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

export const useCloudStore = create<CloudState & CloudActions>()((set, get) => {
  /** 실패하면 되돌리고 오류를 남깁니다 */
  async function mutate(optimistic: Partial<CloudState>, rollback: Partial<CloudState>, run: () => PromiseLike<{ error: { message: string } | null }>) {
    set(optimistic);
    const { error } = await run();
    if (error) set({ ...rollback, error: error.message });
  }

  return {
    ...empty(),

    start: async (userId) => {
      if (get().me === userId && get().status !== 'error') return;
      set({ ...empty(), me: userId });
      await get().refresh();
    },

    refresh: async () => {
      const db = supabase;
      const me = get().me;
      if (!db || !me) return;
      lastRefresh = Date.now();
      set({ status: get().status === 'ready' ? 'ready' : 'loading' });
      try {
        const [profiles, follows, reviews, posts, comments, likes, clubs] = await Promise.all([
          // 002_friend_library.sql 실행 전이면 library_public 컬럼이 없어 기본 필드로 다시 요청
          db
            .from('profiles')
            .select('id, nickname, bio, library_public')
            .then((r) => (r.error ? db.from('profiles').select('id, nickname, bio') : r)),
          db.from('follows').select('follower_id, followee_id'),
          db.from('public_reviews').select('*').order('updated_at', { ascending: false }).limit(500),
          db.from('posts').select('*').order('created_at', { ascending: false }).limit(200),
          db.from('comments').select('*').order('created_at', { ascending: true }).limit(2000),
          db.from('likes').select('kind, target_id, user_id'),
          loadClubs(db),
        ]);
        if (get().me !== me) return;
        const commentRows = check(comments) as { id: string; post_id: string; user_id: string; body: string; spoiler: boolean; created_at: string }[];
        const byPost = new Map<string, Comment[]>();
        for (const c of commentRows) {
          const list = byPost.get(c.post_id) ?? [];
          list.push({ id: c.id, memberId: c.user_id, body: c.body, createdAt: c.created_at, spoiler: c.spoiler || undefined });
          byPost.set(c.post_id, list);
        }
        set({
          status: 'ready',
          error: undefined,
          profiles: Object.fromEntries(
            (check(profiles) as { id: string; nickname: string; bio: string | null; library_public?: boolean }[]).map((p) => [
              p.id,
              { id: p.id, nickname: p.nickname, bio: p.bio ?? undefined, libraryPublic: Boolean(p.library_public) },
            ]),
          ),
          follows: (check(follows) as { follower_id: string; followee_id: string }[]).map((f) => ({ follower: f.follower_id, followee: f.followee_id })),
          reviews: (
            check(reviews) as { user_id: string; book_id: string; rating: number; one_liner: string | null; spoiler: boolean; finished_at: string; updated_at: string }[]
          ).map((r) => ({
            id: reviewKey(r.user_id, r.book_id),
            userId: r.user_id,
            bookId: r.book_id,
            rating: Number(r.rating),
            oneLiner: r.one_liner ?? undefined,
            spoiler: r.spoiler,
            finishedAt: r.finished_at,
            updatedAt: r.updated_at,
          })),
          posts: (
            check(posts) as { id: string; user_id: string; kind: PostKind; body: string; quote: string | null; book_id: string | null; spoiler: boolean; created_at: string }[]
          ).map((p) => ({
            id: p.id,
            memberId: p.user_id,
            kind: p.kind,
            body: p.body,
            quote: p.quote ?? undefined,
            bookId: p.book_id ?? undefined,
            spoiler: p.spoiler,
            likes: 0,
            comments: byPost.get(p.id) ?? [],
            createdAt: p.created_at,
          })),
          likes: (check(likes) as { kind: 'post' | 'review'; target_id: string; user_id: string }[]).map((l) => ({ kind: l.kind, targetId: l.target_id, userId: l.user_id })),
          clubs: clubs ?? [],
          clubsReady: clubs !== null,
        });
        // 친구 기록·글에 나온 책 중 이 기기가 모르는 책(도서 API 책)은 서버 books 테이블에서 가져옴
        const st = get();
        await ensureBooks([
          ...st.reviews.map((r) => r.bookId),
          ...st.posts.map((p) => p.bookId).filter((x): x is string => Boolean(x)),
          ...st.clubs.map((c) => c.bookId),
        ]);
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },

    refreshSoon: () => {
      if (!get().me || Date.now() - lastRefresh < 15_000) return;
      void get().refresh();
    },

    clear: () => set(empty()),

    isCloudPost: (id) => get().posts.some((p) => p.id === id),
    isCloudReview: (id) => id.startsWith('u:'),
    isCloudMember: (id) => Boolean(get().profiles[id]),

    toggleFollow: async (userId) => {
      const { me, follows } = get();
      if (!supabase || !me || userId === me) return;
      const on = follows.some((f) => f.follower === me && f.followee === userId);
      const next = on ? follows.filter((f) => !(f.follower === me && f.followee === userId)) : [...follows, { follower: me, followee: userId }];
      await mutate({ follows: next }, { follows }, () =>
        on ? supabase!.from('follows').delete().eq('follower_id', me).eq('followee_id', userId) : supabase!.from('follows').insert({ follower_id: me, followee_id: userId }),
      );
    },

    setLibraryPublic: async (on) => {
      const { me, profiles } = get();
      const mine = me ? profiles[me] : undefined;
      if (!supabase || !me || !mine) return;
      await mutate({ profiles: { ...profiles, [me]: { ...mine, libraryPublic: on } } }, { profiles }, () =>
        supabase!.from('profiles').update({ library_public: on }).eq('id', me),
      );
    },

    toggleLike: async (kind, id) => {
      const { me, likes } = get();
      if (!supabase || !me) return;
      const on = likes.some((l) => l.kind === kind && l.targetId === id && l.userId === me);
      const next = on ? likes.filter((l) => !(l.kind === kind && l.targetId === id && l.userId === me)) : [...likes, { kind, targetId: id, userId: me }];
      await mutate({ likes: next }, { likes }, () =>
        on
          ? supabase!.from('likes').delete().eq('kind', kind).eq('target_id', id).eq('user_id', me)
          : supabase!.from('likes').insert({ kind, target_id: id, user_id: me }),
      );
    },

    addPost: (input) => {
      const { me, posts } = get();
      const id = uuid();
      if (!supabase || !me) return id;
      const post: Post = {
        id,
        memberId: me,
        kind: input.kind,
        body: input.body.trim(),
        quote: input.quote?.trim() || undefined,
        bookId: input.bookId,
        spoiler: input.spoiler,
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString(),
      };
      // 도서 API에서 고른 책이면 친구도 볼 수 있게 서버 books 에 저장
      const book = input.bookId ? (useLibraryStore.getState().books[input.bookId] ?? useBookCache.getState().books[input.bookId]) : undefined;
      if (book && !SAMPLE_CATALOG.some((b) => b.id === book.id)) void supabase.from('books').upsert(toBookRow(book));
      void mutate({ posts: [post, ...posts] }, { posts }, () =>
        supabase!.from('posts').insert({
          id,
          user_id: me,
          kind: post.kind,
          body: post.body,
          quote: post.quote ?? null,
          book_id: post.bookId ?? null,
          spoiler: post.spoiler,
          created_at: post.createdAt,
        }),
      );
      return id;
    },

    deletePost: async (id) => {
      const { posts } = get();
      if (!supabase) return;
      await mutate({ posts: posts.filter((p) => p.id !== id) }, { posts }, () => supabase!.from('posts').delete().eq('id', id));
    },

    addComment: async (postId, body, spoiler) => {
      const { me, posts } = get();
      if (!supabase || !me) return;
      const comment: Comment = { id: uuid(), memberId: me, body: body.trim(), createdAt: new Date().toISOString(), spoiler: spoiler || undefined };
      const next = posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
      await mutate({ posts: next }, { posts }, () =>
        supabase!.from('comments').insert({ id: comment.id, post_id: postId, user_id: me, body: comment.body, spoiler: Boolean(spoiler), created_at: comment.createdAt }),
      );
    },

    isCloudClub: (id) => get().clubs.some((c) => c.id === id),

    createClub: async (input) => {
      const { me } = get();
      if (!supabase || !me) throw new Error('로그인이 필요해요');
      const club: Club = {
        id: uuid(),
        name: input.name.trim(),
        bookId: input.bookId,
        hostId: me,
        description: input.description.trim(),
        capacity: input.capacity,
        memberIds: [me],
        durationMin: input.durationMin,
        sessions: input.sessions.map((x, i) => ({ week: i + 1, range: x.range.trim(), startsAt: x.startsAt })),
        thread: [],
        createdAt: new Date().toISOString(),
      };
      // 도서 API에서 고른 책이면 다른 사람도 볼 수 있게 서버 books 에 저장
      const book = useLibraryStore.getState().books[input.bookId] ?? useBookCache.getState().books[input.bookId];
      if (book && !SAMPLE_CATALOG.some((b) => b.id === book.id)) await supabase.from('books').upsert(toBookRow(book));
      const r1 = await supabase.from('clubs').insert({
        id: club.id,
        host_id: me,
        name: club.name,
        book_id: club.bookId,
        description: club.description,
        capacity: club.capacity,
        duration_min: club.durationMin,
        sessions: club.sessions,
        created_at: club.createdAt,
      });
      if (r1.error) throw new Error(r1.error.message);
      const r2 = await supabase.from('club_members').insert({ club_id: club.id, user_id: me });
      if (r2.error) {
        await supabase.from('clubs').delete().eq('id', club.id);
        throw new Error(r2.error.message);
      }
      set({ clubs: [club, ...get().clubs] });
      return club.id;
    },

    joinClub: async (id) => {
      const { me, clubs } = get();
      if (!supabase || !me) return;
      const next = clubs.map((c) => (c.id === id && !c.memberIds.includes(me) ? { ...c, memberIds: [...c.memberIds, me] } : c));
      await mutate({ clubs: next }, { clubs }, () => supabase!.from('club_members').insert({ club_id: id, user_id: me }));
    },

    leaveClub: async (id) => {
      const { me, clubs } = get();
      if (!supabase || !me) return;
      const next = clubs.map((c) => (c.id === id ? { ...c, memberIds: c.memberIds.filter((x) => x !== me) } : c));
      await mutate({ clubs: next }, { clubs }, () => supabase!.from('club_members').delete().eq('club_id', id).eq('user_id', me));
    },

    addClubComment: async (clubId, body) => {
      const { me, clubs } = get();
      if (!supabase || !me) return;
      const comment: Comment = { id: uuid(), memberId: me, body: body.trim(), createdAt: new Date().toISOString() };
      const next = clubs.map((c) => (c.id === clubId ? { ...c, thread: [...c.thread, comment] } : c));
      await mutate({ clubs: next }, { clubs }, () =>
        supabase!.from('club_comments').insert({ id: comment.id, club_id: clubId, user_id: me, body: comment.body, created_at: comment.createdAt }),
      );
    },
  };
});

/** 내가 팔로우한 실제 사용자 id */
export function cloudUserFollowing(state: Pick<CloudState, 'me' | 'follows'>): string[] {
  return state.me ? state.follows.filter((f) => f.follower === state.me).map((f) => f.followee) : [];
}
