import type { Genre } from './book';

export type AvatarTone = 'plum' | 'ochre' | 'sage' | 'clay' | 'sea' | 'ink';

export interface Member {
  id: string;
  nickname: string;
  handle: string;
  bio?: string;
  tone: AvatarTone;
  /** 자주 읽는 장르 (취향 표시용) */
  favoriteGenres?: Genre[];
}

/** 다 읽은 책에 남긴 별점 + 한 줄 평 */
export interface Review {
  id: string;
  memberId: string;
  bookId: string;
  rating: number;
  oneLiner: string;
  review?: string;
  spoiler?: boolean;
  /** YYYY-MM-DD */
  finishedAt: string;
  /** ISO */
  createdAt: string;
  /** 샘플 데이터의 기본 공감 수 (내 공감은 별도 합산) */
  likes: number;
}

/** 책별 평점 요약 */
export interface RatingSummary {
  average: number;
  count: number;
  /** index 0 = 0.5점 … index 9 = 5점 */
  distribution: number[];
}

export type BestsellerCategory = '종합' | '소설' | '에세이' | '인문' | '자기계발';

export interface BestsellerItem {
  rank: number;
  bookId: string;
  /** 지난주 대비 순위 변화 (+ 상승, - 하락, null = 신규) */
  change: number | null;
}

export interface CurationList {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  bookIds: string[];
  likes: number;
  createdAt: string;
}

export type PostKind = 'free' | 'request' | 'quote';

export const POST_KIND_LABEL: Record<PostKind, string> = {
  free: '자유 이야기',
  request: '책 추천 요청',
  quote: '문장 공유',
};

export interface Comment {
  id: string;
  memberId: string;
  body: string;
  createdAt: string;
  spoiler?: boolean;
}

export interface Post {
  id: string;
  memberId: string;
  kind: PostKind;
  body: string;
  /** 문장 공유: 인용 문장 */
  quote?: string;
  bookId?: string;
  spoiler: boolean;
  likes: number;
  comments: Comment[];
  createdAt: string;
}

export interface ClubSession {
  week: number;
  /** 읽을 범위 (예: "1~3장") */
  range: string;
  /** 온라인 모임 시작 시각 ISO */
  startsAt: string;
}

export interface Club {
  id: string;
  name: string;
  bookId: string;
  hostId: string;
  description: string;
  capacity: number;
  memberIds: string[];
  sessions: ClubSession[];
  /** 모임 시간 (분) */
  durationMin: number;
  thread: Comment[];
  createdAt: string;
}
