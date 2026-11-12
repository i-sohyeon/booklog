import type { Quote, ReadingStatus } from '@/types/book';
import { supabase } from '@/lib/supabase';
import { ensureBooks } from '@/store/cloudStore';

/** 다른 사용자에게 보이는 기록 한 권 (public_shelf 뷰) — 공개로 켠 항목만 값이 있음 */
export interface ShelfRecord {
  bookId: string;
  status: ReadingStatus;
  addedAt: string;
  updatedAt: string;
  finishedAt?: string;
  readCount: number;
  rating?: number;
  oneLiner?: string;
  review?: string;
  spoiler: boolean;
  quotes: Quote[];
  place?: string;
  occasion?: string;
  tags: string[];
}

interface Row {
  book_id: string;
  status: ReadingStatus;
  added_at: string;
  updated_at: string;
  finished_at: string | null;
  read_count: number;
  rating: number | null;
  one_liner: string | null;
  review: string | null;
  spoiler: boolean;
  quotes: Quote[] | null;
  place: string | null;
  occasion: string | null;
  tags: string[] | null;
}

export class ShelfNotReadyError extends Error {}

/** 친구 서재 불러오기. 서버에 002_friend_library.sql 이 없으면 ShelfNotReadyError */
export async function fetchFriendShelf(userId: string): Promise<ShelfRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('public_shelf').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(500);
  if (error) {
    if (/public_shelf|does not exist|schema cache/i.test(error.message)) throw new ShelfNotReadyError(error.message);
    throw new Error(error.message);
  }
  const rows = (data ?? []) as Row[];
  await ensureBooks(rows.map((r) => r.book_id));
  return rows.map((r) => ({
    bookId: r.book_id,
    status: r.status,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
    finishedAt: r.finished_at ?? undefined,
    readCount: r.read_count,
    rating: r.rating !== null ? Number(r.rating) : undefined,
    oneLiner: r.one_liner ?? undefined,
    review: r.review ?? undefined,
    spoiler: r.spoiler,
    quotes: r.quotes ?? [],
    place: r.place ?? undefined,
    occasion: r.occasion ?? undefined,
    tags: r.tags ?? [],
  }));
}
