export type Genre =
  | '소설'
  | '에세이'
  | '시'
  | '인문'
  | '과학'
  | '역사'
  | '경제경영'
  | '자기계발'
  | '예술';

/** 표지 이미지가 없을 때 생성형 표지에 쓰이는 톤 */
export type CoverTone = 'plum' | 'forest' | 'navy' | 'clay' | 'mustard' | 'charcoal' | 'rose' | 'sea';

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  translators?: string[];
  publisher: string;
  /** YYYY-MM */
  publishedAt: string;
  pageCount: number;
  genre: Genre;
  description: string;
  /** 외부 도서 API 연결 후 채워질 표지 URL */
  coverUrl?: string;
  coverTone?: CoverTone;
}

export type ReadingStatus = 'want' | 'reading' | 'done' | 'paused';

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  want: '읽고 싶은',
  reading: '읽는 중',
  done: '완독',
  paused: '중단',
};

export const NOTE_KIND_LABEL: Record<NoteKind, string> = { memo: '메모', quote: '문장' };

export const READING_STATUS_ORDER: ReadingStatus[] = ['reading', 'want', 'done', 'paused'];

/** 공개 범위 — 소셜 기능(3차)에서 노출 여부를 결정 */
export type Visibility = 'public' | 'friends' | 'private';

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: '전체 공개',
  friends: '친구 공개',
  private: '나만 보기',
};

/** 내 서재의 한 권 (사용자별 독서 상태) */
export interface LibraryEntry {
  bookId: string;
  status: ReadingStatus;
  /** ISO datetime */
  addedAt: string;
  updatedAt: string;
  /** YYYY-MM-DD */
  startedAt?: string;
  finishedAt?: string;
  currentPage: number;
  /** 0.5 단위, 0~5 */
  rating?: number;
  review?: string;
  reviewVisibility?: Visibility;
}

export type NoteKind = 'memo' | 'quote';

export interface ReadingNote {
  id: string;
  bookId: string;
  kind: NoteKind;
  content: string;
  page?: number;
  visibility: Visibility;
  createdAt: string;
  updatedAt?: string;
}

/** 하루 단위 독서 기록 — 캘린더/통계의 원천 데이터 */
export interface ReadingSession {
  /** YYYY-MM-DD (로컬 날짜) */
  date: string;
  bookId: string;
  pages: number;
}

export interface ReadingGoal {
  year: number;
  targetBooks: number;
}
