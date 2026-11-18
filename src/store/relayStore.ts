import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/book';
import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { toBookRow } from '@/services/cloudSync';
import { ensureBooks } from './cloudStore';

/**
 * 릴레이 독서 토론 (서버 저장, 참여자만 볼 수 있음).
 * 방 만들기·참여·시작·바통 넘기기는 모두 서버 함수(supabase/migrations/004_relay.sql)로 해서
 * 차례·정원 규칙을 서버가 지킵니다.
 */
export type RelayStatus = 'waiting' | 'active' | 'done';
/** 토론 방식: 감상형(소설·에세이) / 공부형(경제·인문·과학 — 바통마다 질문 카드) */
export type RelayMode = 'talk' | 'study';

/** 함께 만드는 용어장 (008_relay_study.sql) */
export interface RelayTerm {
  id: string;
  userId: string;
  term: string;
  meaning: string;
  createdAt: string;
}

export interface RelayMember {
  userId: string;
  seat: number;
}

export interface RelayPost {
  id: string;
  userId: string;
  turn: number;
  /** 몇 바퀴째 바통인지 (005 이전 기록은 없을 수 있음) */
  lap?: number;
  /** 방장이 넘긴 차례 (글 없음) */
  skipped: boolean;
  body: string;
  question?: string;
  createdAt: string;
}

export interface Relay {
  id: string;
  hostId: string;
  bookId: string;
  title: string;
  code: string;
  status: RelayStatus;
  /** 008 이전 서버면 항상 감상형 */
  mode: RelayMode;
  rounds: number;
  turnHours: number;
  turn: number;
  /** 지금 차례인 자리 (005_relay_join_anytime.sql 이후) */
  currentSeat?: number;
  /** 지금 몇 바퀴째 */
  lap?: number;
  turnStartedAt?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  members: RelayMember[];
}

export interface RelayDetail extends Relay {
  posts: RelayPost[];
  /** 공부형만 불러옴 */
  terms: RelayTerm[];
}

type RelayRow = {
  id: string;
  host_id: string;
  book_id: string;
  title: string;
  code: string;
  status: RelayStatus;
  mode?: RelayMode;
  rounds: number;
  turn_hours: number;
  turn: number;
  current_seat?: number;
  lap?: number;
  turn_started_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  relay_members?: { user_id: string; seat: number }[];
};

const fromRow = (r: RelayRow): Relay => ({
  id: r.id,
  hostId: r.host_id,
  bookId: r.book_id,
  title: r.title,
  code: r.code,
  status: r.status,
  mode: r.mode === 'study' ? 'study' : 'talk',
  rounds: r.rounds,
  turnHours: r.turn_hours,
  turn: r.turn,
  currentSeat: r.current_seat,
  lap: r.lap,
  turnStartedAt: r.turn_started_at ?? undefined,
  createdAt: r.created_at,
  startedAt: r.started_at ?? undefined,
  finishedAt: r.finished_at ?? undefined,
  members: (r.relay_members ?? []).map((m) => ({ userId: m.user_id, seat: m.seat })).sort((a, b) => a.seat - b.seat),
});

/**
 * 지금 차례 정보.
 * 진행 중에 사람이 들어올 수 있어서, 차례는 서버가 저장한 자리(currentSeat)·바퀴(lap)를 씀.
 * (005 실행 전 서버면 예전처럼 바통 수로 계산)
 */
export function turnInfo(r: Pick<Relay, 'turn' | 'rounds' | 'members' | 'turnStartedAt' | 'turnHours' | 'status' | 'currentSeat' | 'lap'>) {
  const n = Math.max(1, r.members.length);
  const seat = r.currentSeat ?? r.turn % n;
  const lap = r.lap ?? Math.min(r.rounds, Math.floor(r.turn / n) + 1);
  const current = r.status === 'active' ? r.members.find((m) => m.seat === seat) : undefined;
  // 전체 바통 수 = 지금까지 + 남은 것 (중간에 사람이 늘면 함께 늘어남)
  const remaining = r.status === 'active' ? (r.rounds - lap) * n + (n - seat) : 0;
  const total = r.status === 'waiting' ? r.rounds * n : r.turn + remaining;
  const deadline = r.turnStartedAt ? new Date(new Date(r.turnStartedAt).getTime() + r.turnHours * 3600_000) : undefined;
  return { total, current, lap, deadline, last: r.status === 'active' && remaining === 1 };
}

type TermRow = { id: string; user_id: string; term: string; meaning: string; created_at: string };
const fromTermRow = (t: TermRow): RelayTerm => ({ id: t.id, userId: t.user_id, term: t.term, meaning: t.meaning, createdAt: t.created_at });

/** 서버 오류 메시지 → 사람이 읽을 문장 (서버 함수가 이미 한국어로 알려 줌) */
export function relayError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  if (/[가-힣]/.test(msg)) return msg;
  if (/relay_terms_unique|duplicate key/i.test(msg)) return '이미 용어장에 있는 용어예요.';
  if (/relay|function|does not exist|schema cache/i.test(msg)) return '릴레이 기능을 준비 중이에요. 잠시 후 다시 시도해 주세요.';
  return '잠시 후 다시 시도해 주세요.';
}

function db() {
  if (!supabase) throw new Error('로그인이 필요해요');
  return supabase;
}

interface RelayState {
  list: Relay[];
  listStatus: 'idle' | 'loading' | 'ready' | 'error';
  listError?: string;
  details: Record<string, RelayDetail>;
  loadList: () => Promise<void>;
  loadDetail: (id: string) => Promise<RelayDetail | null>;
  create: (input: { book: Book; title: string; rounds: number; turnHours: number; mode: RelayMode }) => Promise<string>;
  join: (code: string) => Promise<string>;
  start: (id: string) => Promise<void>;
  leave: (id: string) => Promise<void>;
  post: (id: string, body: string, question: string) => Promise<void>;
  skip: (id: string) => Promise<void>;
  /** 방장: 시작 전 바퀴 수·한 사람당 시간 바꾸기 */
  updateSettings: (id: string, rounds: number, turnHours: number) => Promise<void>;
  /** 방장: 멤버 내보내기 (다시 들어올 수 없음) */
  kick: (id: string, userId: string) => Promise<void>;
  /** 용어장: 추가·고치기(쓴 사람만)·지우기(쓴 사람만) */
  addTerm: (id: string, term: string, meaning: string) => Promise<void>;
  updateTerm: (id: string, termId: string, term: string, meaning: string) => Promise<void>;
  removeTerm: (id: string, termId: string) => Promise<void>;
  clear: () => void;
}

export const useRelayStore = create<RelayState>()((set, get) => ({
  list: [],
  listStatus: 'idle',
  details: {},

  loadList: async () => {
    if (!supabase) return;
    set({ listStatus: get().list.length ? 'ready' : 'loading', listError: undefined });
    const { data, error } = await supabase.from('relays').select('*, relay_members(user_id, seat)').order('created_at', { ascending: false }).limit(100);
    if (error) {
      set({ listStatus: 'error', listError: relayError(error) });
      return;
    }
    const list = (data as RelayRow[]).map(fromRow);
    set({ list, listStatus: 'ready' });
    await ensureBooks(list.map((r) => r.bookId));
  },

  loadDetail: async (id) => {
    const client = db();
    const [relay, posts] = await Promise.all([
      client.from('relays').select('*, relay_members(user_id, seat)').eq('id', id).maybeSingle(),
      client.from('relay_posts').select('*').eq('relay_id', id).order('turn', { ascending: true }),
    ]);
    if (relay.error) throw relay.error;
    if (!relay.data) return null;
    if (posts.error) throw posts.error;
    const base = fromRow(relay.data as RelayRow);
    let terms: RelayTerm[] = [];
    if (base.mode === 'study') {
      const t = await client.from('relay_terms').select('id, user_id, term, meaning, created_at').eq('relay_id', id).order('created_at', { ascending: true });
      if (t.error) throw t.error;
      terms = (t.data as TermRow[]).map(fromTermRow);
    }
    const detail: RelayDetail = {
      ...base,
      terms,
      posts: (
        posts.data as { id: string; user_id: string; turn: number; lap?: number | null; skipped?: boolean; body: string | null; question: string | null; created_at: string }[]
      ).map((p) => ({
        id: p.id,
        userId: p.user_id,
        turn: p.turn,
        lap: p.lap ?? undefined,
        skipped: Boolean(p.skipped),
        body: p.body ?? '',
        question: p.question ?? undefined,
        createdAt: p.created_at,
      })),
    };
    set((s) => ({ details: { ...s.details, [id]: detail } }));
    await ensureBooks([detail.bookId]);
    return detail;
  },

  create: async ({ book, title, rounds, turnHours, mode }) => {
    const client = db();
    // 도서 API에서 고른 책이면 다른 참여자도 볼 수 있게 서버 books 에 저장
    if (!SAMPLE_CATALOG.some((b) => b.id === book.id)) await client.from('books').upsert(toBookRow(book));
    // 감상형은 예전 함수 그대로 (008 실행 전 서버에서도 동작), 공부형만 방식을 함께 보냄
    const args = { p_book_id: book.id, p_title: title, p_rounds: rounds, p_turn_hours: turnHours };
    const { data, error } = await client.rpc('create_relay', mode === 'study' ? { ...args, p_mode: mode } : args);
    if (error) throw error;
    const id = (data as RelayRow).id;
    void get().loadList();
    return id;
  },

  join: async (code) => {
    const { data, error } = await db().rpc('join_relay', { p_code: code });
    if (error) throw error;
    void get().loadList();
    return data as string;
  },

  start: async (id) => {
    const { error } = await db().rpc('start_relay', { p_id: id });
    if (error) throw error;
    await get().loadDetail(id);
  },

  leave: async (id) => {
    const { error } = await db().rpc('leave_relay', { p_id: id });
    if (error) throw error;
    set((s) => {
      const details = { ...s.details };
      delete details[id];
      return { details, list: s.list.filter((r) => r.id !== id) };
    });
  },

  post: async (id, body, question) => {
    const { error } = await db().rpc('post_relay', { p_id: id, p_body: body, p_question: question });
    if (error) throw error;
    await get().loadDetail(id);
  },

  skip: async (id) => {
    const { error } = await db().rpc('skip_relay_turn', { p_id: id });
    if (error) throw error;
    await get().loadDetail(id);
  },

  updateSettings: async (id, rounds, turnHours) => {
    const { error } = await db().rpc('update_relay_settings', { p_id: id, p_rounds: rounds, p_turn_hours: turnHours });
    if (error) throw error;
    await get().loadDetail(id);
  },

  kick: async (id, userId) => {
    const { error } = await db().rpc('kick_relay_member', { p_id: id, p_user_id: userId });
    if (error) throw error;
    await get().loadDetail(id);
  },

  addTerm: async (id, term, meaning) => {
    const client = db();
    const { data: auth } = await client.auth.getSession();
    const uid = auth.session?.user.id;
    if (!uid) throw new Error('로그인이 필요해요');
    const { error } = await client.from('relay_terms').insert({ relay_id: id, user_id: uid, term: term.trim(), meaning: meaning.trim() });
    if (error) throw error;
    await get().loadDetail(id);
  },

  updateTerm: async (id, termId, term, meaning) => {
    const { error } = await db()
      .from('relay_terms')
      .update({ term: term.trim(), meaning: meaning.trim(), updated_at: new Date().toISOString() })
      .eq('id', termId);
    if (error) throw error;
    await get().loadDetail(id);
  },

  removeTerm: async (id, termId) => {
    const { error } = await db().from('relay_terms').delete().eq('id', termId);
    if (error) throw error;
    await get().loadDetail(id);
  },

  clear: () => set({ list: [], listStatus: 'idle', details: {} }),
}));
