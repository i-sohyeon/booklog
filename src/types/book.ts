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

/**
 * 독서 상태 — 진도는 기록하지 않습니다.
 * "읽는 중"은 상태 표시만 합니다.
 */
export type ReadingStatus = 'want' | 'reading' | 'done';

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  want: '읽고 싶어요',
  reading: '읽는 중',
  done: '다 읽었어요',
};

export const READING_STATUS_ORDER: ReadingStatus[] = ['want', 'reading', 'done'];

/** 기억하고 싶은 문장 — 텍스트 또는 사진 */
export interface Quote {
  id: string;
  text?: string;
  /** 사진 첨부 (이 기기에만 저장되는 data URL, 긴 변 1080px로 줄여 저장) */
  image?: string;
  /** ISO */
  createdAt: string;
}

/** 공개/비공개를 따로 정할 수 있는 기록 항목 */
export type RecordField = 'rating' | 'oneLiner' | 'review' | 'quotes' | 'context' | 'tags';

export const RECORD_FIELD_LABEL: Record<RecordField, string> = {
  rating: '별점',
  oneLiner: '한 줄 평',
  review: '긴 감상',
  quotes: '기억하고 싶은 문장',
  context: '읽은 장소·계기',
  tags: '태그',
};

/** 항목별 공개 여부 — 값이 없으면 비공개(기본) */
export type RecordVisibility = Partial<Record<RecordField, boolean>>;

/** 내 서재의 한 권 */
export interface LibraryEntry {
  bookId: string;
  status: ReadingStatus;
  /** ISO datetime */
  addedAt: string;
  updatedAt: string;
  /** YYYY-MM-DD — 다 읽은 책만 */
  finishedAt?: string;
  /** 0.5 단위, 0.5~5 — 다 읽은 책만 (유일한 필수 항목) */
  rating?: number;
  /** 한 줄 평 (선택) */
  oneLiner?: string;
  /** 긴 감상 (선택) */
  review?: string;
  /** 스포일러 포함 여부 */
  spoiler?: boolean;
  /** 기억하고 싶은 문장 (선택) */
  quotes?: Quote[];
  /** 읽은 장소 (선택) */
  place?: string;
  /** 읽게 된 계기 (선택) */
  occasion?: string;
  /** 태그 (선택) */
  tags?: string[];
  /** 몇 번째 읽었는지 — 2 이상이면 "n회독" 표시 */
  readCount?: number;
  /** 항목별 공개 설정 (기본 비공개) */
  visibility?: RecordVisibility;
}

/** 한 줄 평 최대 길이 */
export const ONE_LINER_MAX = 80;
export const TAG_MAX = 10;
