import { Link } from 'react-router';
import type { ListView } from '@/hooks/useSocial';
import { useBookLookup, useMemberLookup } from '@/hooks/useSocial';
import { paths } from '@/routes/paths';
import { BookCover } from '@/components/ui';
import { Heart } from 'lucide-react';
import styles from './ListCard.module.scss';

/** 큐레이션 리스트 카드: 겹친 표지 + 제목 + 만든 사람 */
export function ListCard({ list }: { list: ListView }) {
  const findBook = useBookLookup();
  const owner = useMemberLookup()(list.ownerId);
  const covers = list.bookIds.map(findBook).filter((b) => b !== undefined).slice(0, 4);

  return (
    <Link to={paths.list(list.id)} className={styles.card}>
      <div className={styles.stack} aria-hidden>
        {covers.map((b) => (
          <BookCover key={b.id} book={b} size="fluid" className={styles.cover} />
        ))}
        {covers.length === 0 && <span className={styles.empty}>아직 책이 없어요</span>}
      </div>
      <h3 className={styles.title}>{list.title}</h3>
      <p className={styles.meta}>
        {owner.nickname} · {list.bookIds.length}권
        <span className={styles.likes}>
          <Heart aria-hidden />
          {list.likeCount}
        </span>
      </p>
    </Link>
  );
}
