import { useState, type CSSProperties } from 'react';
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
 * 책등.
 * - 표지 이미지가 있으면 책등 전체에 표지를 깔고, 제목·저자는 표지 대표 색의 라벨 위에 씀
 * - 표지가 없으면 단색(생성형 표지와 같은 톤)
 * - 글자색은 라벨 색에 따라 밝게/진하게
 * - 두께는 쪽수에 비례, 높이는 책마다 조금씩 다름(같은 책은 늘 같음)
 */
export function BookSpine({ book }: { book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl' | 'coverTone' | 'pageCount'> }) {
  const found = useSampleCover(book);
  const src = book.coverUrl ?? found;
  const color = useCoverColor(src);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const h = hash(book.id);
  const tone = book.coverTone ?? TONES[h % TONES.length];
  const width = Math.round(Math.min(48, Math.max(26, (book.pageCount || 260) / 10)));
  const height = SPINE_MAX_HEIGHT - (h % 6) * 8;

  const author = spineAuthor(book.authors[0]);
  // 제목이 들어갈 세로 길이에 맞춰 글자 크기를 정하고(10~14px), 그래도 길면 글자 수를 줄여 말줄임
  const room = height - 44 - (author ? author.length * 9.5 + 10 : 0);
  const full = spineTitle(book.title);
  const fontSize = Math.max(10, Math.min(14, Math.floor(room / Math.max(1, full.length) / 1.12)));
  const maxChars = Math.max(2, Math.floor(room / (fontSize * 1.12)));
  const title = full.length > maxChars ? `${full.slice(0, maxChars - 1).trimEnd()}…` : full;

  const style = {
    width,
    height,
    '--title-size': `${fontSize}px`,
    ...(color ? { '--spine-bg': color, '--spine-fg': inkFor(color) } : {}),
    ...(showImage ? { '--spine-image': `url("${src}")` } : {}),
  } as CSSProperties;

  return (
    <span className={styles.spine} data-tone={color ? undefined : tone} data-image={showImage || undefined} style={style}>
      {/* 표지가 깨지면 단색 책등으로 바꾸려고 몰래 불러 봄 */}
      {showImage && <img src={src} alt="" className={styles.probe} onError={() => setFailed(true)} />}
      <span className={styles.band} aria-hidden />
      <span className={styles.label}>
        <span className={styles.title} title={book.title}>
          {title}
        </span>
        {author && <span className={styles.author}>{author}</span>}
      </span>
      <span className={styles.band} aria-hidden />
    </span>
  );
}
