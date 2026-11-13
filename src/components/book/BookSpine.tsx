import { useState, type CSSProperties } from 'react';
import type { Book, CoverTone } from '@/types/book';
import { useSampleCover } from '@/store/coverStore';
import styles from './BookSpine.module.scss';

const TONES: CoverTone[] = ['plum', 'forest', 'navy', 'clay', 'mustard', 'charcoal', 'rose', 'sea'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 책장에 꽂힌 높이(px)의 최댓값 — 책꽂이 한 칸의 높이 계산에 씀 */
export const SPINE_MAX_HEIGHT = 196;

/**
 * 책등. 표지 이미지가 있으면 표지 가운데를 세로로 잘라 책등처럼 보여주고,
 * 없으면 생성형 표지와 같은 톤 색을 씁니다.
 * - 두께: 쪽수에 비례 (얇은 책 22px ~ 두꺼운 책 46px)
 * - 높이: 책마다 조금씩 다르게 (판형 차이처럼), 같은 책은 늘 같은 높이
 */
export function BookSpine({ book }: { book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl' | 'coverTone' | 'pageCount'> }) {
  const [failed, setFailed] = useState(false);
  const found = useSampleCover(book);
  const src = book.coverUrl ?? found;
  const h = hash(book.id);
  const tone = book.coverTone ?? TONES[h % TONES.length];
  const width = Math.round(Math.min(46, Math.max(22, (book.pageCount || 260) / 11)));
  const height = SPINE_MAX_HEIGHT - (h % 6) * 8;
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={styles.spine}
      data-tone={tone}
      data-image={showImage || undefined}
      style={{ width, height, '--spine-image': showImage ? `url("${src}")` : undefined } as CSSProperties}
    >
      {/* 이미지가 깨지면 톤 색으로 바꾸기 위해 몰래 불러 봄 */}
      {showImage && <img src={src} alt="" className={styles.probe} onError={() => setFailed(true)} />}
      <span className={styles.title}>{book.title}</span>
      <span className={styles.author}>{book.authors[0]}</span>
    </span>
  );
}
