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

export interface RelayMember {
  userId: string;
  seat: number;
}

export interface RelayPost {
  id: string;
  userId: string;
  turn: number;
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
  rounds: number;
  turnHours: number;
  turn: number;
  turnStartedAt?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  members: RelayMember[];
}

export interface RelayDetail extends Relay {
  posts: RelayPost[];
}

type RelayRow = {
  id: string;
  host_id: string;
  book_id: string;
  title: string;
  code: string;
  status: RelayStatus;
  rounds: number;
  turn_hours: number;
  turn: number;
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
  rounds: r.rounds,
  turnHours: r.turn_hours,
  turn: r.turn,
  turnStartedAt: r.turn_started_at ?? undefined,
  createdAt: r.created_at,
  startedAt: r.started_at ?? undefined,
  finishedAt: r.finished_at ?? undefined,
  members: (r.relay_members ?? []).map((m) => ({ userId: m.user_id, seat: m.seat })).sort((a, b) => a.seat - b.seat),
});

/** 지금 차례 정보 */
export function turnInfo(r: Pick<Relay, 'turn' | 'rounds' | 'members' | 'turnStartedAt' | 'turnHours' | 'status'>) {
  const n = Math.max(1, r.members.length);
  const total = r.rounds * n;
  const seat = r.turn % n;
  const current = r.status === 'active' ? r.members.find((m) => m.seat === seat) : undefined;
  const lap = Math.min(r.rounds, Math.floor(r.turn / n) + 1);
  const deadline = r.turnStartedAt ? new Date(new Date(r.turnStartedAt).getTime() + r.turnHours * 3600_000) : undefined;
  return { total, current, lap, deadline };
}

/** 서버 오류 메시지 → 사람이 읽을 문장 (서버 함수가 이미 한국어로 알려 줌) */
export function relayError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  if (/[가-힣]/.test(msg)) return msg;
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
  create: (input: { book: Book; title: string; rounds: number; turnHours: number }) => Promise<string>;
  join: (code: string) => Promise<string>;
  start: (id: string) => Promise<void>;
  leave: (id: string) => Promise<void>;
  post: (id: string, body: string, question: string) => Promise<void>;
  skip: (id: string) => Promise<void>;
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
    const detail: RelayDetail = {
      ...fromRow(relay.data as RelayRow),
      posts: (posts.data as { id: string; user_id: string; turn: number; body: string; question: string | null; created_at: string }[]).map((p) => ({
        id: p.id,
        userId: p.user_id,
        turn: p.turn,
        body: p.body,
        question: p.question ?? undefined,
        createdAt: p.created_at,
      })),
    };
    set((s) => ({ details: { ...s.details, [id]: detail } }));
    await ensureBooks([detail.bookId]);
    return detail;
  },

  create: async ({ book, title, rounds, turnHours }) => {
    const client = db();
    // 도서 API에서 고른 책이면 다른 참여자도 볼 수 있게 서버 books 에 저장
    if (!SAMPLE_CATALOG.some((b) => b.id === book.id)) await client.from('books').upsert(toBookRow(book));
    const { data, error } = await client.rpc('create_relay', { p_book_id: book.id, p_title: title, p_rounds: rounds, p_turn_hours: turnHours });
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

  clear: () => set({ list: [], listStatus: 'idle', details: {} }),
}));
