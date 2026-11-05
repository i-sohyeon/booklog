import type { Book, LibraryEntry, Quote, RecordVisibility } from '@/types/book';
import { daysAgoIso, daysAgoKey } from '@/lib/date';
import { SAMPLE_CATALOG } from './catalog';

/**
 * [SAMPLE] 내 서재 초기 상태 — 오늘 기준 상대 날짜로 생성.
 * 문장은 저작권이 만료된 고전(어린 왕자·데미안·노인과 바다·위대한 개츠비)에서
 * 샘플용으로 직접 옮긴 짧은 구절만 사용합니다.
 */
interface Seed {
  bookId: string;
  status: LibraryEntry['status'];
  addedDaysAgo: number;
  finishedDaysAgo?: number;
  rating?: number;
  oneLiner?: string;
  review?: string;
  quotes?: string[];
  place?: string;
  occasion?: string;
  tags?: string[];
  readCount?: number;
  visibility?: RecordVisibility;
}

const PUBLIC_BASIC: RecordVisibility = { rating: true, oneLiner: true };

const SEEDS: Seed[] = [
  // ---- 다 읽은 책 ----
  {
    bookId: 'bk-033', status: 'done', addedDaysAgo: 20, finishedDaysAgo: 1, rating: 4.5,
    oneLiner: '반짝이는 파티 뒤에 남은 쓸쓸함. 마지막 문단을 세 번 읽었다.',
    quotes: ['그렇게 우리는 물결을 거슬러 나아간다. 쉼 없이 과거로 떠밀려 가면서도.', '그는 그 초록 불빛을 믿었다.'],
    place: '퇴근길 지하철', occasion: '독서모임 다음 책', tags: ['고전', '여름'], visibility: { ...PUBLIC_BASIC, quotes: true },
  },
  {
    bookId: 'bk-012', status: 'done', addedDaysAgo: 8, finishedDaysAgo: 3, rating: 5,
    oneLiner: '짧지만 오래 남는 소설. 사소한 선택이 얼마나 큰 용기인지.',
    place: '동네 카페', occasion: '친구 추천', tags: ['얇은책', '겨울'], visibility: PUBLIC_BASIC,
  },
  {
    bookId: 'bk-001', status: 'done', addedDaysAgo: 40, finishedDaysAgo: 6, rating: 5,
    oneLiner: '읽는 내내 눈이 내렸다. 천천히, 아껴 읽은 책.',
    review: '한 문장 한 문장이 무거워서 하루에 몇 쪽씩만 읽었다. 다 읽고 나서도 한동안 다른 책을 펼치지 못했다. 기억한다는 것, 작별하지 않는다는 것이 어떤 의미인지 오래 생각했다.',
    place: '집, 새벽', tags: ['인생책', '겨울'], visibility: PUBLIC_BASIC,
  },
  {
    bookId: 'bk-032', status: 'done', addedDaysAgo: 12, finishedDaysAgo: 9, rating: 4,
    oneLiner: '스무 살에 읽을 땐 몰랐던 노인의 고집이 이제야 보인다.',
    quotes: ['인간은 파멸할 수는 있어도 패배하지는 않는다.'],
    occasion: '다시 읽고 싶어서', tags: ['고전', '다시읽기'], readCount: 2,
  },
  {
    bookId: 'bk-003', status: 'done', addedDaysAgo: 30, finishedDaysAgo: 13, rating: 4.5,
    oneLiner: '다정한 SF. 「관내분실」이 가장 좋았다.', tags: ['SF', '단편'], visibility: PUBLIC_BASIC,
  },
  { bookId: 'bk-025', status: 'done', addedDaysAgo: 25, finishedDaysAgo: 17, rating: 3.5, place: '도서관', tags: ['에세이'] },
  {
    bookId: 'bk-007', status: 'done', addedDaysAgo: 60, finishedDaysAgo: 22, rating: 5,
    oneLiner: '밤하늘을 다시 보게 되는 책.',
    review: '두껍지만 한 장씩 넘길수록 우주가 가까워지는 느낌. 과학책인데 문장이 아름답다.',
    place: '캠핑장', occasion: '별 보러 가기 전에', tags: ['과학', '인생책'], visibility: PUBLIC_BASIC,
  },
  {
    bookId: 'bk-024', status: 'done', addedDaysAgo: 30, finishedDaysAgo: 27, rating: 5,
    oneLiner: '어른이 되어 다시 만난 어린 왕자.',
    quotes: ['가장 중요한 것은 눈에 보이지 않아.', '네 장미를 그토록 소중하게 만든 건 네가 장미에게 쏟은 시간이야.'],
    tags: ['고전', '다시읽기', '인생책'], readCount: 3, visibility: { ...PUBLIC_BASIC, quotes: true, tags: true },
  },
  { bookId: 'bk-028', status: 'done', addedDaysAgo: 40, finishedDaysAgo: 33, rating: 3.5, oneLiner: '불편한 질문을 던지는 대화체 철학 입문.', tags: ['자기계발'] },
  {
    bookId: 'bk-005', status: 'done', addedDaysAgo: 60, finishedDaysAgo: 45, rating: 4,
    oneLiner: '떠나는 이유보다 돌아오는 이유가 궁금해졌다.', place: '제주행 비행기', tags: ['에세이', '여행'], visibility: PUBLIC_BASIC,
  },
  { bookId: 'bk-008', status: 'done', addedDaysAgo: 70, finishedDaysAgo: 60, rating: 4, oneLiner: '감정을 배워가는 소년의 이야기.' },
  {
    bookId: 'bk-009', status: 'done', addedDaysAgo: 100, finishedDaysAgo: 80, rating: 4.5,
    oneLiner: '다시 읽어도 새로운 고전.',
    quotes: ['새는 알에서 나오려고 투쟁한다. 알은 세계다.', '태어나려는 자는 하나의 세계를 깨뜨려야 한다.'],
    tags: ['고전', '다시읽기'], readCount: 2, visibility: PUBLIC_BASIC,
  },
  { bookId: 'bk-015', status: 'done', addedDaysAgo: 120, finishedDaysAgo: 100, rating: 3.5, oneLiner: '스물다섯의 선택에 대해.' },
  { bookId: 'bk-026', status: 'done', addedDaysAgo: 140, finishedDaysAgo: 130, rating: 3, oneLiner: '쉬어가도 괜찮다는 말이 필요했던 날.', tags: ['에세이'] },
  { bookId: 'bk-021', status: 'done', addedDaysAgo: 190, finishedDaysAgo: 160, rating: 4, tags: ['과학'] },
  { bookId: 'bk-002', status: 'done', addedDaysAgo: 220, finishedDaysAgo: 200, rating: 5, oneLiner: '쉽게 추천할 수 없지만 꼭 읽어야 하는 책.', tags: ['인생책'], visibility: PUBLIC_BASIC },
  { bookId: 'bk-011', status: 'done', addedDaysAgo: 250, finishedDaysAgo: 240, rating: 3.5, oneLiner: '따뜻한 주말 소설.' },
  { bookId: 'bk-019', status: 'done', addedDaysAgo: 300, finishedDaysAgo: 280, rating: 4.5, oneLiner: '잠들기 전 한 편씩.', tags: ['시', '겨울'] },
  { bookId: 'bk-018', status: 'done', addedDaysAgo: 340, finishedDaysAgo: 330, rating: 4, oneLiner: '작은 습관 하나부터.', tags: ['자기계발'] },
  { bookId: 'bk-013', status: 'done', addedDaysAgo: 420, finishedDaysAgo: 400, rating: 3.5 },

  // ---- 읽는 중 ----
  { bookId: 'bk-004', status: 'reading', addedDaysAgo: 6 },
  { bookId: 'bk-022', status: 'reading', addedDaysAgo: 10 },
  { bookId: 'bk-030', status: 'reading', addedDaysAgo: 14 },
  { bookId: 'bk-006', status: 'reading', addedDaysAgo: 30 },

  // ---- 읽고 싶어요 ----
  { bookId: 'bk-014', status: 'want', addedDaysAgo: 2 },
  { bookId: 'bk-010', status: 'want', addedDaysAgo: 5 },
  { bookId: 'bk-029', status: 'want', addedDaysAgo: 9 },
  { bookId: 'bk-027', status: 'want', addedDaysAgo: 16 },
  { bookId: 'bk-020', status: 'want', addedDaysAgo: 28 },
];

const byId = new Map(SAMPLE_CATALOG.map((b) => [b.id, b]));

export function createSampleLibrary(): { books: Record<string, Book>; entries: Record<string, LibraryEntry> } {
  const books: Record<string, Book> = {};
  const entries: Record<string, LibraryEntry> = {};
  for (const s of SEEDS) {
    const book = byId.get(s.bookId);
    if (!book) continue;
    books[book.id] = book;
    const stamp = daysAgoIso(s.finishedDaysAgo ?? s.addedDaysAgo);
    const quotes: Quote[] | undefined = s.quotes?.map((text, i) => ({ id: `${s.bookId}-q${i + 1}`, text, createdAt: stamp }));
    entries[book.id] = {
      bookId: book.id,
      status: s.status,
      addedAt: daysAgoIso(s.addedDaysAgo),
      updatedAt: stamp,
      finishedAt: s.finishedDaysAgo !== undefined ? daysAgoKey(s.finishedDaysAgo) : undefined,
      rating: s.rating,
      oneLiner: s.oneLiner,
      review: s.review,
      quotes,
      place: s.place,
      occasion: s.occasion,
      tags: s.tags,
      readCount: s.readCount,
      visibility: s.visibility,
    };
  }
  return { books, entries };
}
