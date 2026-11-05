/**
 * [SAMPLE] 소셜 기능용 샘플 데이터.
 * 등장하는 사용자·후기·글·모임은 모두 가상의 예시입니다.
 * 후기 문구는 샘플용으로 작성한 감상이며 책 본문 인용이 아닙니다.
 */
import type { BestsellerCategory, BestsellerItem, Club, CurationList, Member, Post, Review } from '@/types/social';
import { daysAgoIso, daysAgoKey } from '@/lib/date';

export const ME_ID = 'me';

export const SAMPLE_MEMBERS: Member[] = [
  { id: 'm1', nickname: '새벽서재', handle: 'dawn.shelf', tone: 'plum', bio: '출근 전 30분 독서', favoriteGenres: ['소설', '에세이'] },
  { id: 'm2', nickname: '책먹는여우', handle: 'bookfox', tone: 'ochre', bio: '장르 안 가리고 먹어요', favoriteGenres: ['소설', '과학'] },
  { id: 'm3', nickname: '느린독서가', handle: 'slowreader', tone: 'sage', bio: '한 권을 오래', favoriteGenres: ['인문', '역사'] },
  { id: 'm4', nickname: '밑줄긋는밤', handle: 'underline.night', tone: 'clay', favoriteGenres: ['에세이', '시'] },
  { id: 'm5', nickname: '종이냄새', handle: 'paperscent', tone: 'sea', favoriteGenres: ['소설'] },
  { id: 'm6', nickname: '과학하는문과', handle: 'sci.liberal', tone: 'ink', bio: '어려운 책을 쉽게 읽고 싶다', favoriteGenres: ['과학', '인문'] },
  { id: 'm7', nickname: '월간독서', handle: 'monthly.read', tone: 'plum', favoriteGenres: ['경제경영', '자기계발'] },
  { id: 'm8', nickname: '여름의문장', handle: 'summer.lines', tone: 'ochre', favoriteGenres: ['시', '소설'] },
];

/** 내가 팔로우하는 샘플 친구 */
export const SAMPLE_FOLLOWING = ['m1', 'm2', 'm4', 'm6', 'm8'];
/** 나를 팔로우하는 샘플 사용자 */
export const SAMPLE_FOLLOWERS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm7'];
/** 샘플 상태에서 기본으로 참여 중인 모임 */
export const SAMPLE_JOINED_CLUBS = ['cl1', 'cl2'];

type R = [id: string, memberId: string, bookId: string, rating: number, oneLiner: string, daysAgo: number, likes: number, spoiler?: boolean];

const REVIEWS: R[] = [
  ['r1', 'm1', 'bk-012', 5, '짧은데 오래 남는다. 조용한 용기에 대한 이야기.', 0, 128],
  ['r2', 'm2', 'bk-003', 4.5, 'SF인데 이렇게 다정할 수 있다니. 단편마다 여운이 길다.', 1, 96],
  ['r3', 'm4', 'bk-001', 5, '읽는 내내 눈이 내렸다. 천천히 읽어야 하는 책.', 1, 214],
  ['r4', 'm6', 'bk-004', 4.5, '과학책인 줄 알았는데 결국 사람에 관한 책이었다.', 2, 187],
  ['r5', 'm3', 'bk-006', 4, '두껍지만 술술. 질문을 많이 남기는 역사책.', 3, 72],
  ['r6', 'm5', 'bk-011', 3.5, '따뜻하고 편안하다. 가볍게 읽기 좋은 주말 책.', 3, 41],
  ['r7', 'm8', 'bk-019', 4.5, '한 편씩 아껴 읽었다. 밤에 읽으면 더 좋다.', 4, 58],
  ['r8', 'm7', 'bk-017', 4, '돈 이야기인데 결국 태도에 대한 이야기.', 4, 66],
  ['r9', 'm2', 'bk-010', 4, '후회에 대한 이야기를 이렇게 경쾌하게.', 5, 83],
  ['r10', 'm1', 'bk-008', 4, '감정을 배우는 소년의 성장. 마지막 장면에서 울컥.', 6, 77, true],
  ['r11', 'm4', 'bk-005', 4, '여행보다 여행을 생각하는 시간이 더 좋았다.', 7, 39],
  ['r12', 'm6', 'bk-007', 5, '밤하늘을 다시 보게 되는 책. 인생 과학책.', 8, 152],
  ['r13', 'm3', 'bk-013', 3.5, '흥미로운 관점, 다만 반복이 조금 많다.', 9, 28],
  ['r14', 'm5', 'bk-022', 4.5, '4대에 걸친 이야기인데 한 번도 지루하지 않았다.', 10, 104],
  ['r15', 'm8', 'bk-024', 5, '어른이 되어 다시 읽으니 전혀 다른 책.', 11, 133],
  ['r16', 'm7', 'bk-018', 3.5, '실천 팁이 구체적이다. 앞부분만 읽어도 본전.', 12, 35],
  ['r17', 'm2', 'bk-014', 4, '읽고 나서 휴대폰 알림을 다 껐다.', 13, 91],
  ['r18', 'm1', 'bk-015', 4, '스물다섯의 선택. 나이마다 다르게 읽힐 것 같다.', 14, 47],
  ['r19', 'm6', 'bk-021', 4, '유명한 이유가 있다. 비유가 정말 탁월하다.', 15, 52],
  ['r20', 'm4', 'bk-002', 5, '쉽게 추천할 수 없지만 꼭 읽어야 하는 책.', 16, 176],
  ['r21', 'm5', 'bk-009', 4, '청춘의 혼란을 이렇게 정확히 쓴 책이 또 있을까.', 18, 44],
  ['r22', 'm3', 'bk-023', 3.5, '토론하며 읽으면 훨씬 재밌을 책.', 20, 31],
  ['r23', 'm8', 'bk-020', 4, '그림이 궁금해서 계속 검색하며 읽었다.', 22, 29],
  ['r24', 'm2', 'bk-012', 4.5, '크리스마스 즈음 매년 다시 읽고 싶은 책.', 25, 63],
  ['r25', 'm6', 'bk-003', 5, '「관내분실」 하나로 별 다섯.', 27, 88],
  ['r26', 'm1', 'bk-001', 4.5, '아프지만 아름답다. 문장마다 멈추게 된다.', 30, 120],
  ['r27', 'm8', 'bk-025', 4, '말 한마디의 온도를 생각하게 된다. 출근길에 한 꼭지씩.', 0, 71],
  ['r28', 'm4', 'bk-033', 4.5, '파티가 끝난 뒤의 정적까지 들리는 소설.', 2, 98],
  ['r29', 'm7', 'bk-029', 4, '할 일 목록을 반으로 줄였다. 그게 이 책의 효과.', 2, 54],
  ['r30', 'm2', 'bk-027', 4.5, '떡볶이 이야기인 줄 알았는데 사람 이야기였다.', 3, 87],
  ['r31', 'm1', 'bk-032', 4, '짧고 단단하다. 바다 냄새가 나는 문장들.', 5, 46],
  ['r32', 'm6', 'bk-030', 3.5, '연구 사례가 풍부하다. 끝까지 읽는 것 자체가 그릿.', 6, 33],
  ['r33', 'm5', 'bk-026', 3.5, '열심히 사는 게 지칠 때 꺼내 읽는 책.', 8, 62],
  ['r34', 'm3', 'bk-028', 4, '대화체라 술술 읽히지만 생각은 오래 남는다.', 9, 79],
  ['r35', 'm8', 'bk-031', 3, '두껍지만 아무 데나 펼쳐 읽기 좋다.', 12, 21],
  ['r36', 'm4', 'bk-024', 4.5, '여우와의 장면은 언제 읽어도 좋다.', 1, 112],
];

export const SAMPLE_REVIEWS: Review[] = REVIEWS.map(([id, memberId, bookId, rating, oneLiner, d, likes, spoiler]) => ({
  id,
  memberId,
  bookId,
  rating,
  oneLiner,
  spoiler,
  finishedAt: daysAgoKey(d),
  createdAt: daysAgoIso(d),
  likes,
}));

/** 책별 샘플 평점 기준값 (평균 근사치, 참여 인원) */
export const SAMPLE_RATING_BASE: Record<string, [avg: number, count: number]> = {
  'bk-001': [4.6, 1842], 'bk-002': [4.7, 2310], 'bk-003': [4.4, 1290], 'bk-004': [4.3, 980],
  'bk-005': [3.9, 860], 'bk-006': [4.1, 3120], 'bk-007': [4.6, 1410], 'bk-008': [4.0, 2560],
  'bk-009': [4.1, 1980], 'bk-010': [3.9, 1730], 'bk-011': [3.7, 2240], 'bk-012': [4.5, 1120],
  'bk-013': [4.0, 1560], 'bk-014': [4.1, 870], 'bk-015': [4.2, 1340], 'bk-016': [3.4, 610],
  'bk-017': [4.0, 1290], 'bk-018': [3.8, 2010], 'bk-019': [4.4, 420], 'bk-020': [3.9, 530],
  'bk-021': [4.1, 760], 'bk-022': [4.4, 1650], 'bk-023': [3.8, 1180], 'bk-024': [4.7, 2880],
  'bk-025': [3.8, 1460], 'bk-026': [3.7, 1210], 'bk-027': [4.2, 540], 'bk-028': [4.1, 3360],
  'bk-029': [3.9, 1080], 'bk-030': [3.8, 920], 'bk-031': [3.6, 780], 'bk-032': [4.2, 1590],
  'bk-033': [4.1, 1720],
};

/** [SAMPLE] 이번 주 베스트셀러 — 실제 판매 순위가 아닙니다 */
type Chart = Array<[bookId: string, change: number | null]>;
const toChart = (rows: Chart): BestsellerItem[] => rows.map(([bookId, change], i) => ({ rank: i + 1, bookId, change }));

export const SAMPLE_BESTSELLERS: Record<BestsellerCategory, BestsellerItem[]> = {
  종합: toChart([
    ['bk-012', 0], ['bk-001', 2], ['bk-014', -1], ['bk-028', 1], ['bk-010', -2], ['bk-022', null], ['bk-025', 3], ['bk-018', 0], ['bk-003', -1], ['bk-024', 1],
  ]),
  소설: toChart([
    ['bk-012', 0], ['bk-001', 1], ['bk-010', -1], ['bk-022', null], ['bk-003', 0], ['bk-033', 4], ['bk-011', 2], ['bk-008', -1], ['bk-032', 1], ['bk-015', -2],
  ]),
  에세이: toChart([
    ['bk-025', 0], ['bk-027', 2], ['bk-005', -1], ['bk-026', 1], ['bk-016', -2], ['bk-019', null], ['bk-020', 0],
  ]),
  인문: toChart([
    ['bk-014', 0], ['bk-004', 1], ['bk-006', -1], ['bk-007', 0], ['bk-013', 2], ['bk-021', null], ['bk-023', -1], ['bk-020', 0],
  ]),
  자기계발: toChart([
    ['bk-028', 0], ['bk-018', 1], ['bk-029', -1], ['bk-030', 2], ['bk-031', null], ['bk-017', -1], ['bk-016', 0],
  ]),
};

/** 오늘의 추천 후보 (날짜에 따라 순환) */
export const SAMPLE_DAILY_PICKS: Array<{ bookId: string; line: string }> = [
  { bookId: 'bk-012', line: '120쪽 남짓, 오늘 밤 한 번에 읽기 좋은 조용한 소설' },
  { bookId: 'bk-004', line: '분류와 상실, 그리고 사랑에 관한 이상한 과학책' },
  { bookId: 'bk-003', line: '다정하고 쓸쓸한 SF 일곱 편' },
  { bookId: 'bk-024', line: '어른이 되어 다시 펼치면 전혀 다른 이야기' },
  { bookId: 'bk-007', line: '오늘 밤, 하늘을 올려다보게 만드는 책' },
  { bookId: 'bk-022', line: '네 세대를 건너는 한 가족의 대서사' },
  { bookId: 'bk-019', line: '잠들기 전 한 편씩 아껴 읽는 시집' },
  { bookId: 'bk-022', line: '네 세대를 건너는 한 가족의 대서사' },
  { bookId: 'bk-027', line: '좋아하는 음식 하나로 이렇게 다정해질 수 있다니' },
  { bookId: 'bk-010', line: '살아보지 못한 삶이 궁금한 밤에' },
  { bookId: 'bk-032', line: '150쪽, 한 번에 읽히는 단단한 고전' },
  { bookId: 'bk-016', line: '남의 기준 말고 내 기준으로 살고 싶은 날에' },
  { bookId: 'bk-023', line: '친구와 밤새 토론하고 싶어지는 질문들' },
  { bookId: 'bk-017', line: '숫자보다 태도에 관한 돈 이야기' },
  { bookId: 'bk-031', line: '아무 데나 펼쳐도 하나는 건지는 책' },
];

export const SAMPLE_LISTS: CurationList[] = [
  { id: 'l1', ownerId: 'm4', title: '비 오는 날 읽기 좋은 소설', description: '창밖에 비가 오면 꺼내 읽는 책들', bookIds: ['bk-001', 'bk-012', 'bk-008', 'bk-015', 'bk-009'], likes: 342, createdAt: daysAgoIso(4) },
  { id: 'l2', ownerId: 'm6', title: '문과생도 끝까지 읽는 과학책', description: '수식 없이도 충분히 재밌는 과학', bookIds: ['bk-004', 'bk-007', 'bk-021', 'bk-006'], likes: 518, createdAt: daysAgoIso(9) },
  { id: 'l3', ownerId: 'm1', title: '하룻밤에 끝나는 얇은 책', description: '200쪽 안팎, 주말 하루면 충분해요', bookIds: ['bk-012', 'bk-024', 'bk-019', 'bk-005', 'bk-002'], likes: 276, createdAt: daysAgoIso(12) },
  { id: 'l4', ownerId: 'm2', title: '다정한 SF 입문', description: 'SF가 처음이라면 여기서부터', bookIds: ['bk-003', 'bk-010', 'bk-024'], likes: 189, createdAt: daysAgoIso(20) },
  { id: 'l5', ownerId: 'm7', title: '연말에 읽는 돈과 습관', description: '내년을 준비하는 책들', bookIds: ['bk-017', 'bk-018', 'bk-029', 'bk-030', 'bk-014'], likes: 97, createdAt: daysAgoIso(2) },
  { id: 'l6', ownerId: 'm8', title: '다시 읽을수록 좋아지는 고전', description: '나이 들어 다시 펼치면 다른 책이 되는', bookIds: ['bk-024', 'bk-009', 'bk-032', 'bk-033'], likes: 401, createdAt: daysAgoIso(6) },
  { id: 'l7', ownerId: 'm5', title: '마음이 지칠 때 꺼내 읽는 에세이', description: '천천히, 한 꼭지씩', bookIds: ['bk-027', 'bk-025', 'bk-026', 'bk-005', 'bk-016'], likes: 233, createdAt: daysAgoIso(15) },
];

export const SAMPLE_POSTS: Post[] = [
  {
    id: 'p1', memberId: 'm2', kind: 'request', bookId: undefined, spoiler: false, likes: 24, createdAt: daysAgoIso(0),
    body: '「우리가 빛의 속도로 갈 수 없다면」처럼 다정한 SF 더 추천해 주세요! 너무 하드한 건 어려워요.',
    comments: [
      { id: 'c1', memberId: 'm6', body: '「미드나잇 라이브러리」 어떠세요? SF라기보단 판타지지만 결이 비슷해요.', createdAt: daysAgoIso(0) },
      { id: 'c2', memberId: 'm1', body: '김초엽 작가 다른 소설집도 좋아요.', createdAt: daysAgoIso(0) },
    ],
  },
  {
    id: 'p2', memberId: 'm8', kind: 'quote', bookId: 'bk-024', quote: '가장 중요한 것은 눈에 보이지 않아.', spoiler: false, likes: 61, createdAt: daysAgoIso(1),
    body: '어릴 땐 그냥 지나쳤던 문장인데 지금은 한참 들여다보게 되네요.',
    comments: [{ id: 'c3', memberId: 'm4', body: '저도 이 문장 다이어리에 적어뒀어요.', createdAt: daysAgoIso(1) }],
  },
  {
    id: 'p3', memberId: 'm1', kind: 'free', bookId: 'bk-012', spoiler: true, likes: 37, createdAt: daysAgoIso(1),
    body: '마지막 장면에서 주인공이 결국 그 선택을 하는 게… 처음엔 답답했는데 다시 생각하니 그게 이 책의 전부였던 것 같아요. 다들 결말 어떻게 읽으셨어요?',
    comments: [
      { id: 'c4', memberId: 'm5', body: '저는 그 장면이 제일 좋았어요. 조용하지만 큰 결심.', createdAt: daysAgoIso(1), spoiler: true },
    ],
  },
  {
    id: 'p4', memberId: 'm6', kind: 'free', bookId: 'bk-004', spoiler: false, likes: 45, createdAt: daysAgoIso(2),
    body: '「물고기는 존재하지 않는다」 읽고 나서 분류라는 게 얼마나 인간 중심적인지 계속 생각하게 돼요. 과학책 좋아하시는 분들 이 책 꼭 읽어보세요.',
    comments: [],
  },
  {
    id: 'p5', memberId: 'm3', kind: 'request', spoiler: false, likes: 12, createdAt: daysAgoIso(3),
    body: '출퇴근 지하철에서 읽기 좋은, 짧게 끊어 읽을 수 있는 인문서 있을까요?',
    comments: [{ id: 'c5', memberId: 'm7', body: '「도둑맞은 집중력」 챕터가 짧아서 좋아요.', createdAt: daysAgoIso(3) }],
  },
  {
    id: 'p6', memberId: 'm4', kind: 'free', spoiler: false, likes: 29, createdAt: daysAgoIso(5),
    body: '이번 달은 일부러 얇은 책만 골라 읽고 있어요. 다 읽었다는 기록이 쌓이니까 묘하게 뿌듯하네요.',
    comments: [{ id: 'c6', memberId: 'm1', body: '저도 따라 해볼래요. 추천 리스트 있으면 공유해 주세요!', createdAt: daysAgoIso(5) }],
  },
  {
    id: 'p7', memberId: 'm5', kind: 'quote', bookId: 'bk-032', quote: '인간은 파멸할 수는 있어도 패배하지는 않는다.', spoiler: false, likes: 52, createdAt: daysAgoIso(0),
    body: '오늘 같은 날 다시 꺼내보는 문장.',
    comments: [{ id: 'c7', memberId: 'm3', body: '짧은데 힘이 있어요.', createdAt: daysAgoIso(0) }],
  },
  {
    id: 'p8', memberId: 'm7', kind: 'request', spoiler: false, likes: 18, createdAt: daysAgoIso(1),
    body: '연말에 새해 계획 세우면서 읽을 만한 책 추천해 주세요. 너무 뻔한 자기계발서 말고요!',
    comments: [
      { id: 'c8', memberId: 'm2', body: '「원씽」이요. 계획을 줄이게 돼요.', createdAt: daysAgoIso(1) },
      { id: 'c9', memberId: 'm6', body: '「도둑맞은 집중력」도 같이 읽으면 좋아요.', createdAt: daysAgoIso(1) },
    ],
  },
  {
    id: 'p9', memberId: 'm2', kind: 'free', bookId: 'bk-033', spoiler: true, likes: 33, createdAt: daysAgoIso(2),
    body: '개츠비 마지막에 장례식 장면… 그렇게 많던 사람들이 다 어디 갔는지. 화려함이 다 사라진 그 장면이 제일 오래 남아요.',
    comments: [],
  },
  {
    id: 'p10', memberId: 'm8', kind: 'quote', bookId: 'bk-009', quote: '새는 알에서 나오려고 투쟁한다. 알은 세계다.', spoiler: false, likes: 74, createdAt: daysAgoIso(4),
    body: '고등학생 때 밑줄 그었던 문장을 십 년 만에 다시 만났어요.',
    comments: [{ id: 'c10', memberId: 'm4', body: '이 문장은 정말 모두의 밑줄이네요.', createdAt: daysAgoIso(4) }],
  },
  {
    id: 'p11', memberId: 'm6', kind: 'request', bookId: 'bk-007', spoiler: false, likes: 21, createdAt: daysAgoIso(6),
    body: '「코스모스」 다 읽었는데 다음으로 읽을 우주 책 있을까요? 조금 더 최신 이야기면 좋겠어요.',
    comments: [],
  },
  {
    id: 'p12', memberId: 'm3', kind: 'free', spoiler: false, likes: 40, createdAt: daysAgoIso(7),
    body: '책 읽는 장소를 기록하기 시작했는데, 같은 책도 어디서 읽었는지에 따라 기억이 달라지는 게 신기해요. 다들 어디서 읽으세요?',
    comments: [
      { id: 'c11', memberId: 'm5', body: '저는 무조건 지하철이요.', createdAt: daysAgoIso(7) },
      { id: 'c12', memberId: 'm8', body: '잠들기 전 침대 위!', createdAt: daysAgoIso(6) },
    ],
  },
];

/** 이번 정각 — 90분 모임이면 언제 열어도 '진행 중' */
const thisHour = () => {
  const t = new Date();
  t.setMinutes(0, 0, 0);
  return t.toISOString();
};
const daysFromNowAt = (d: number, hour: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

export const SAMPLE_CLUBS: Club[] = [
  {
    id: 'cl1', name: '한 달에 한 권, 한강 읽기', bookId: 'bk-001', hostId: 'm4', capacity: 10,
    memberIds: ['m4', 'm1', 'm5', 'm8', 'm3', 'm2'], durationMin: 60, createdAt: daysAgoIso(10),
    description: '매주 정해진 분량을 읽고 수요일 밤 온라인으로 이야기 나눠요. 처음 읽는 분도 환영해요.',
    sessions: [
      { week: 1, range: '1부 1~3장', startsAt: daysFromNowAt(2, 21) },
      { week: 2, range: '1부 4장~끝', startsAt: daysFromNowAt(9, 21) },
      { week: 3, range: '2부', startsAt: daysFromNowAt(16, 21) },
      { week: 4, range: '3부 · 전체 토론', startsAt: daysFromNowAt(23, 21) },
    ],
    thread: [
      { id: 't1', memberId: 'm4', body: '시작 전에 각자 이 책을 고른 이유 하나씩 남겨주세요!', createdAt: daysAgoIso(2) },
      { id: 't2', memberId: 'm1', body: '작년에 사두고 못 읽어서요. 이번엔 꼭 끝까지!', createdAt: daysAgoIso(1) },
    ],
  },
  {
    id: 'cl2', name: '과학책 같이 읽어요', bookId: 'bk-004', hostId: 'm6', capacity: 8,
    memberIds: ['m6', 'm2', 'm3', 'm7', 'm1', 'm5', 'm8'], durationMin: 90, createdAt: daysAgoIso(20),
    description: '어려운 부분은 같이 풀어가요. 지금 2주차 모임이 진행 중이에요.',
    sessions: [
      { week: 1, range: '1~5장', startsAt: daysFromNowAt(-7, 20) },
      { week: 2, range: '6~10장', startsAt: thisHour() },
      { week: 3, range: '11장~끝', startsAt: daysFromNowAt(7, 20) },
    ],
    thread: [{ id: 't3', memberId: 'm6', body: '2주차 모임 지금 시작했어요. 들어오세요!', createdAt: daysAgoIso(0) }],
  },
  {
    id: 'cl3', name: '얇은 책 완독 챌린지', bookId: 'bk-012', hostId: 'm1', capacity: 12,
    memberIds: ['m1', 'm8', 'm4'], durationMin: 45, createdAt: daysAgoIso(3),
    description: '일주일에 얇은 책 한 권. 이번 주는 「이처럼 사소한 것들」이에요.',
    sessions: [{ week: 1, range: '전체', startsAt: daysFromNowAt(5, 22) }],
    thread: [],
  },
  {
    id: 'cl4', name: '파친코 완독 모임', bookId: 'bk-022', hostId: 'm5', capacity: 6,
    memberIds: ['m5', 'm2', 'm3', 'm6', 'm7', 'm8'], durationMin: 60, createdAt: daysAgoIso(14),
    description: '모집이 마감되었어요. 다음 기수를 기다려 주세요.',
    sessions: [
      { week: 1, range: '1권 1부', startsAt: daysFromNowAt(1, 20) },
      { week: 2, range: '1권 2부', startsAt: daysFromNowAt(8, 20) },
    ],
    thread: [],
  },
  {
    id: 'cl5', name: '고전 다시 읽기', bookId: 'bk-033', hostId: 'm8', capacity: 10,
    memberIds: ['m8', 'm4', 'm1', 'm5'], durationMin: 60, createdAt: daysAgoIso(5),
    description: '학생 때 읽었던 고전을 어른이 되어 다시. 이번 기수는 「위대한 개츠비」예요.',
    sessions: [
      { week: 1, range: '1~3장', startsAt: daysFromNowAt(3, 21) },
      { week: 2, range: '4~6장', startsAt: daysFromNowAt(10, 21) },
      { week: 3, range: '7장~끝', startsAt: daysFromNowAt(17, 21) },
    ],
    thread: [{ id: 't4', memberId: 'm8', body: '번역본은 아무거나 괜찮아요. 각자 읽는 판본 알려주세요!', createdAt: daysAgoIso(2) }],
  },
  {
    id: 'cl6', name: '새해 준비 북클럽', bookId: 'bk-029', hostId: 'm7', capacity: 12,
    memberIds: ['m7', 'm2', 'm6', 'm3', 'm5'], durationMin: 60, createdAt: daysAgoIso(1),
    description: '한 해를 정리하고 새해 계획을 세우며 같이 읽어요. 매주 토요일 오전.',
    sessions: [
      { week: 1, range: '1~2부', startsAt: daysFromNowAt(4, 10) },
      { week: 2, range: '3부~끝 · 내년 계획 나누기', startsAt: daysFromNowAt(11, 10) },
    ],
    thread: [],
  },
];

export const SAMPLE_CATEGORIES: BestsellerCategory[] = ['종합', '소설', '에세이', '인문', '자기계발'];
