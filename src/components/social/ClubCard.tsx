import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CalendarDays, Users } from 'lucide-react';
import type { ClubView } from '@/hooks/useSocial';
import { useBookLookup } from '@/hooks/useSocial';
import { formatSchedule, sessionPhase } from '@/lib/time';
import { paths } from '@/routes/paths';
import { BookCover } from '@/components/ui';
import { cn } from '@/lib/cn';
import styles from './ClubCard.module.scss';

/** 다음(또는 진행 중인) 모임 회차 */
export function nextSession(club: ClubView) {
  return club.sessions.find((s) => sessionPhase(s.startsAt, club.durationMin) !== 'ended') ?? null;
}

export function ClubCard({ club, action }: { club: ClubView; action?: ReactNode }) {
  const book = useBookLookup()(club.bookId);
  const next = nextSession(club);
  const live = next && sessionPhase(next.startsAt, club.durationMin) === 'live';

  return (
    <article className={styles.card}>
      <Link to={paths.club(club.id)} className={styles.main}>
        {book && <BookCover book={book} size="md" className={styles.cover} />}
        <div className={styles.body}>
          {live ? <span className={cn(styles.state, styles.live)}>지금 진행 중</span> : club.full ? <span className={styles.state}>모집 마감</span> : <span className={cn(styles.state, styles.open)}>모집 중</span>}
          <h3 className={styles.name}>{club.name}</h3>
          {book && <p className={styles.book}>「{book.title}」 함께 읽기</p>}
          <p className={styles.meta}>
            <CalendarDays aria-hidden />
            {next ? `${next.week}주차 · ${formatSchedule(next.startsAt)}` : '모든 일정이 끝났어요'}
          </p>
          <p className={styles.meta}>
            <Users aria-hidden />
            <span className={styles.count}>
              {club.memberIds.length}/{club.capacity}명
            </span>
            · 총 {club.sessions.length}회
          </p>
        </div>
      </Link>
      {action && <div className={styles.action}>{action}</div>}
    </article>
  );
}
