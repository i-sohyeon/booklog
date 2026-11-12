import { useState } from 'react';
import type { Book, CoverTone } from '@/types/book';
import { cn } from '@/lib/cn';
import { useSampleCover } from '@/store/coverStore';
import styles from './BookCover.module.scss';

export type CoverSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fluid';

interface BookCoverProps {
  book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl' | 'coverTone'>;
  size?: CoverSize;
  className?: string;
  /** 장식용으로 쓰일 때(옆에 제목 텍스트가 있을 때) true */
  decorative?: boolean;
}

const TONES: CoverTone[] = ['plum', 'forest', 'navy', 'clay', 'mustard', 'charcoal', 'rose', 'sea'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * 책 표지. coverUrl이 없거나 로드에 실패하면
 * 제목·저자로 구성한 타이포그래피 표지를 생성합니다.
 */
export function BookCover({ book, size = 'md', className, decorative = true }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  // 샘플 도서는 제목·저자로 찾은 실제 표지를 사용 (못 찾으면 생성 표지)
  const found = useSampleCover(book);
  const src = book.coverUrl ?? found;
  const h = hash(book.id);
  const tone = book.coverTone ?? TONES[h % TONES.length];
  const showImage = src && !failed;

  return (
    <div
      className={cn(styles.cover, styles[size], className)}
      data-tone={tone}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `${book.title} 표지`}
      aria-hidden={decorative || undefined}
    >
      {showImage ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className={styles.generated}>
          <span className={styles.title}>{book.title}</span>
          <span className={styles.author}>{book.authors[0]}</span>
        </div>
      )}
      <span className={styles.spine} />
    </div>
  );
}
