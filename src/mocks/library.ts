import type { Book, LibraryEntry, ReadingGoal, ReadingNote, ReadingSession } from '@/types/book';
import { daysAgoIso, daysAgoKey } from '@/lib/date';
import { SAMPLE_CATALOG } from './catalog';

/**
 * [SAMPLE] 내 서재 초기 상태.
 * 날짜는 "오늘" 기준 상대값으로 만들어 언제 실행해도 자연스럽게 보이도록 합니다.
 */
interface SampleSeed {
  bookId: string;
  status: LibraryEntry['status'];
  addedDaysAgo: number;
  startedDaysAgo?: number;
  finishedDaysAgo?: number;
  currentPage?: number;
  rating?: number;
  review?: string;
  reviewVisibility?: LibraryEntry['reviewVisibility'];
  touchedDaysAgo?: number;
}

const SEEDS: SampleSeed[] = [
  { bookId: 'bk-001', status: 'reading', addedDaysAgo: 20, startedDaysAgo: 12, currentPage: 214, touchedDaysAgo: 0 },
  { bookId: 'bk-004', status: 'reading', addedDaysAgo: 30, startedDaysAgo: 6, currentPage: 88, touchedDaysAgo: 1 },
  { bookId: 'bk-007', status: 'reading', addedDaysAgo: 90, startedDaysAgo: 40, currentPage: 152, touchedDaysAgo: 9 },
  { bookId: 'bk-012', status: 'done', addedDaysAgo: 28, startedDaysAgo: 25, finishedDaysAgo: 18, rating: 5, reviewVisibility: 'public', review: '짧지만 오래 남는 소설. 사소한 선택이 얼마나 큰 용기인지.' },
  { bookId: 'bk-003', status: 'done', addedDaysAgo: 70, startedDaysAgo: 60, finishedDaysAgo: 45, rating: 4.5, reviewVisibility: 'friends', review: '다정한 SF. 「관내분실」이 가장 좋았다.' },
  { bookId: 'bk-005', status: 'done', addedDaysAgo: 120, startedDaysAgo: 100, finishedDaysAgo: 92, rating: 4 },
  { bookId: 'bk-008', status: 'done', addedDaysAgo: 160, startedDaysAgo: 150, finishedDaysAgo: 140, rating: 4 },
  { bookId: 'bk-009', status: 'done', addedDaysAgo: 220, startedDaysAgo: 210, finishedDaysAgo: 196, rating: 4.5 },
  { bookId: 'bk-024', status: 'done', addedDaysAgo: 260, startedDaysAgo: 258, finishedDaysAgo: 255, rating: 5 },
  { bookId: 'bk-015', status: 'done', addedDaysAgo: 290, startedDaysAgo: 280, finishedDaysAgo: 270, rating: 3.5 },
  { bookId: 'bk-006', status: 'paused', addedDaysAgo: 200, startedDaysAgo: 180, currentPage: 210 },
  { bookId: 'bk-022', status: 'want', addedDaysAgo: 3 },
  { bookId: 'bk-014', status: 'want', addedDaysAgo: 10 },
  { bookId: 'bk-010', status: 'want', addedDaysAgo: 34 },
];

const byId = new Map(SAMPLE_CATALOG.map((b) => [b.id, b]));

export function createSampleLibrary(): {
  books: Record<string, Book>;
  entries: Record<string, LibraryEntry>;
  notes: ReadingNote[];
  sessions: ReadingSession[];
  goal: ReadingGoal;
} {
  const books: Record<string, Book> = {};
  const entries: Record<string, LibraryEntry> = {};

  for (const s of SEEDS) {
    const book = byId.get(s.bookId);
    if (!book) continue;
    books[book.id] = book;
    entries[book.id] = {
      bookId: book.id,
      status: s.status,
      addedAt: daysAgoIso(s.addedDaysAgo),
      updatedAt: daysAgoIso(s.touchedDaysAgo ?? s.finishedDaysAgo ?? s.addedDaysAgo),
      startedAt: s.startedDaysAgo !== undefined ? daysAgoKey(s.startedDaysAgo) : undefined,
      finishedAt: s.finishedDaysAgo !== undefined ? daysAgoKey(s.finishedDaysAgo) : undefined,
      currentPage: s.status === 'done' ? book.pageCount : (s.currentPage ?? 0),
      rating: s.rating,
      review: s.review,
      reviewVisibility: s.reviewVisibility,
    };
  }

  // 최근 약 120일의 독서 세션 — 결정적(deterministic) 패턴으로 생성
  const sessions: ReadingSession[] = [];
  const pattern = [32, 18, 24, 15, 0, 41, 12, 27, 0, 0, 22, 35, 16, 0, 29];
  for (let i = 0; i < 120; i++) {
    const pages = pattern[i % pattern.length] ?? 0;
    if (pages === 0) continue;
    const bookId = i < 6 ? 'bk-001' : i < 12 ? 'bk-004' : i < 19 ? 'bk-012' : i < 50 ? 'bk-003' : 'bk-005';
    sessions.push({ date: daysAgoKey(i), bookId, pages });
  }

  const notes: ReadingNote[] = [
    {
      id: 'nt-1',
      bookId: 'bk-001',
      kind: 'memo',
      content: '눈이 내리는 장면마다 문장이 느려진다. 소리 내어 천천히 읽고 싶어지는 책.',
      page: 198,
      visibility: 'private',
      createdAt: daysAgoIso(0),
    },
    {
      id: 'nt-2',
      bookId: 'bk-004',
      kind: 'memo',
      content: '분류한다는 건 결국 무언가를 놓치는 일이다. 어류라는 범주가 사라지는 장면에서 오래 멈춰 있었다.',
      page: 76,
      visibility: 'private',
      createdAt: daysAgoIso(1),
    },
    {
      id: 'nt-3',
      bookId: 'bk-024',
      kind: 'quote',
      content: '가장 중요한 것은 눈에 보이지 않아.',
      page: 98,
      visibility: 'private',
      createdAt: daysAgoIso(255),
    },
    {
      id: 'nt-4',
      bookId: 'bk-003',
      kind: 'memo',
      content: '우주 저편에 남겨진 사람의 시간에 대해. 기다림도 하나의 사랑의 형태.',
      visibility: 'private',
      createdAt: daysAgoIso(46),
    },
  ];

  return { books, entries, notes, sessions, goal: { year: new Date().getFullYear(), targetBooks: 24 } };
}
