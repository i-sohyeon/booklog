/** 모든 경로를 한 곳에서 관리 */
const enc = encodeURIComponent;

export const paths = {
  home: '/',
  discover: '/discover',
  search: (q: string) => `/discover?q=${enc(q)}`,
  book: (bookId: string) => `/books/${enc(bookId)}`,
  list: (listId: string) => `/lists/${enc(listId)}`,
  community: '/community',
  post: (postId: string) => `/community/${enc(postId)}`,
  postNew: '/community/new',
  /** 커뮤니티 > 독서모임 세그먼트 */
  clubs: '/community?tab=clubs',
  club: (clubId: string) => `/clubs/${enc(clubId)}`,
  clubNew: '/clubs/new',
  library: '/library',
  quotes: '/library/quotes',
  recordEdit: (bookId: string) => `/library/${enc(bookId)}/edit`,
  me: '/me',
  settings: '/me/settings',
  login: '/login',
  signup: '/signup',
  resetPassword: '/reset-password',
  updatePassword: '/account/password',
} as const;
