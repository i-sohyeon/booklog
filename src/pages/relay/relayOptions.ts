/** 릴레이 만들기·설정 바꾸기에서 함께 쓰는 선택지 */
export type Rounds = '2' | '3' | '4' | '5';
export type Hours = '12' | '24' | '72';

export const ROUND_OPTIONS: { value: Rounds; label: string }[] = [
  { value: '2', label: '2바퀴' },
  { value: '3', label: '3바퀴' },
  { value: '4', label: '4바퀴' },
  { value: '5', label: '5바퀴' },
];

export const HOUR_OPTIONS: { value: Hours; label: string }[] = [
  { value: '12', label: '12시간' },
  { value: '24', label: '하루' },
  { value: '72', label: '3일' },
];

/** 서버 값 → 선택지 (예전 1바퀴는 2바퀴로, 목록에 없는 시간은 하루로 표시) */
export const toRounds = (n: number): Rounds => (String(Math.min(5, Math.max(2, n))) as Rounds);
export const toHours = (n: number): Hours => (HOUR_OPTIONS.some((o) => o.value === String(n)) ? (String(n) as Hours) : '24');

/** 토론 방식 */
export const MODE_OPTIONS: { value: 'talk' | 'study'; label: string }[] = [
  { value: 'talk', label: '감상형' },
  { value: 'study', label: '공부형' },
];
export const MODE_HINT = {
  talk: '소설·에세이처럼 느낌을 나누는 책. 자유롭게 생각을 쓰고 질문으로 바통을 넘겨요.',
  study: '경제·인문·과학처럼 개념을 익히는 책. 바통마다 정해진 질문 카드가 나오고, 함께 용어장을 채워요.',
} as const;

/**
 * 공부형 질문 카드 — 바통 번호 순서대로 돌아가며 나옴 (넘긴 차례도 한 칸)
 * 이해 → 내 말로 정리 → 모르는 것 → 현실 → 내 생각 순서로 깊어지게
 */
export interface StudyStep {
  key: string;
  label: string;
  prompt: string;
  placeholder: string;
}
export const STUDY_STEPS: StudyStep[] = [
  {
    key: 'term',
    label: '용어 풀이',
    prompt: '책에서 처음 알게 된 용어 하나를 골라, 친구에게 설명하듯 내 말로 풀어 주세요.',
    placeholder: '예: 기회비용 — 하나를 고르면 포기해야 하는 다른 것의 가치. 점심에 만 원 쓰면 그 돈으로 살 수 있던 책 한 권 같은 것.',
  },
  {
    key: 'summary',
    label: '핵심 요약',
    prompt: '이 책에서 가장 중요하다고 생각한 내용을 한두 문장으로 요약해 주세요.',
    placeholder: '예: 돈의 가치는 고정된 게 아니라, 시장에 돈이 얼마나 풀렸는지에 따라 달라진다.',
  },
  {
    key: 'question',
    label: '물음표',
    prompt: '이해가 안 됐거나 헷갈렸던 부분을 꺼내 주세요. 앞사람의 물음표에 답해도 좋아요.',
    placeholder: '예: 금리를 올리면 왜 물가가 내려가는지 아직 잘 모르겠어요. 대출이 줄어서일까요?',
  },
  {
    key: 'real',
    label: '현실 대입',
    prompt: '요즘 뉴스나 내 생활(월급·대출·물가·투자)에서 이 책의 개념이 보이는 곳을 찾아 주세요.',
    placeholder: '예: 요즘 장바구니 물가가 오른 게 책에서 말한 인플레이션이구나 싶었어요.',
  },
  {
    key: 'opinion',
    label: '내 생각',
    prompt: '저자의 주장에 동의하나요? 동의하거나 반대하는 이유를 들려주세요.',
    placeholder: '예: 저축보다 투자가 낫다는 말엔 반만 동의해요. 입문자에겐 위험부터 아는 게 먼저 같아서요.',
  },
];
export const studyStep = (turn: number): StudyStep => STUDY_STEPS[turn % STUDY_STEPS.length]!;
