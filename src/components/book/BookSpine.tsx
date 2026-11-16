import type { CSSProperties } from 'react';
import type { Book, CoverTone } from '@/types/book';
import { useSampleCover } from '@/store/coverStore';
import { inkFor, useCoverColor } from '@/lib/coverColor';
import styles from './BookSpine.module.scss';

const TONES: CoverTone[] = ['plum', 'forest', 'navy', 'clay', 'mustard', 'charcoal', 'rose', 'sea'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 책장에 꽂힌 높이(px)의 최댓값 — 책꽂이 한 칸의 높이 계산에 씀 */
export const SPINE_MAX_HEIGHT = 196;

/** 책등에 쓸 짧은 제목: 부제·괄호 뒤는 뺌 */
function spineTitle(title: string): string {
  return title.split(/\s[:\-–—]\s|[:(（[]/)[0]!.trim() || title;
}

/** 책등에 쓸 저자: '외'·역할 표기를 빼고, 긴 외국 이름은 성(마지막 단어)만 */
function spineAuthor(author: string | undefined): string {
  if (!author) return '';
  const name = author.replace(/\s*(외|지음|저|글|그림)\s*\d*\s*(명)?$/, '').trim();
  if (name.length <= 6) return name;
  const parts = name.split(/\s+/);
  return parts[parts.length - 1]!.slice(0, 8);
}

/**
 * 책등. 표지를 자르지 않고 실제 책등처럼 그립니다.
 * - 색: 표지 이미지의 대표 색(없으면 생성형 표지와 같은 톤)
 * - 글자: 제목(세로, 굵게)과 저자. 글자색은 바탕에 따라 밝게/진하게
 * - 두께는 쪽수에 비례, 높이는 책마다 조금씩 다름(같은 책은 늘 같음)
 */
export function BookSpine({ book }: { book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl' | 'coverTone' | 'pageCount'> }) {
  const found = useSampleCover(book);
  const color = useCoverColor(book.coverUrl ?? found);
  const h = hash(book.id);
  const tone = book.coverTone ?? TONES[h % TONES.length];
  const width = Math.round(Math.min(48, Math.max(26, (book.pageCount || 260) / 10)));
  const height = SPINE_MAX_HEIGHT - (h % 6) * 8;

  const author = spineAuthor(book.authors[0]);
  // 제목이 들어갈 세로 길이에 맞춰 글자 크기를 정하고(10~14px), 그래도 길면 글자 수를 줄여 말줄임
  const room = height - 34 - (author ? author.length * 11 + 10 : 0);
  const full = spineTitle(book.title);
  const fontSize = Math.max(10, Math.min(14, Math.floor(room / Math.max(1, full.length) / 1.12)));
  const maxChars = Math.max(2, Math.floor(room / (fontSize * 1.12)));
  const title = full.length > maxChars ? `${full.slice(0, maxChars - 1).trimEnd()}…` : full;

  const style = {
    width,
    height,
    '--title-size': `${fontSize}px`,
    ...(color ? { '--spine-bg': color, '--spine-fg': inkFor(color) } : {}),
  } as CSSProperties;

  return (
    <span className={styles.spine} data-tone={color ? undefined : tone} style={style}>
      <span className={styles.band} aria-hidden />
      <span className={styles.title} title={book.title}>
        {title}
      </span>
      {author && <span className={styles.author}>{author}</span>}
      <span className={styles.band} aria-hidden />
    </span>
  );
}
