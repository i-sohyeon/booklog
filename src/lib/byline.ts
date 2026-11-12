import type { Book, Genre } from '@/types/book';

/** 장르를 아는 책인지 ('기타'는 도서 API에서 분류를 모르는 경우) */
export const knownGenre = (g: Genre) => g !== '기타';

/** "저자 · 장르" — 장르를 모르면 저자만 */
export function byline(book: Pick<Book, 'authors' | 'genre'>, firstAuthorOnly = false): string {
  const who = firstAuthorOnly ? (book.authors[0] ?? '') : book.authors.join(', ');
  return knownGenre(book.genre) ? `${who} · ${book.genre}` : who;
}
