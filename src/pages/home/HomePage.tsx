import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { useShelf } from '@/hooks/useShelf';
import { byStatus, readingStreak, sortByRecent, type ShelfItem } from '@/store/selectors';
import { useProfile } from '@/hooks/useProfile';
import { formatToday, getGreeting } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { ButtonLink, EmptyState } from '@/components/ui';
import { ProgressSheet } from '@/components/book';
import { CurrentlyReading } from './CurrentlyReading';
import { ReadingOverview } from './ReadingOverview';
import { RecentNotes } from './RecentNotes';
import { Discover } from './Discover';
import styles from './HomePage.module.scss';

export function HomePage() {
  const shelf = useShelf();
  const profile = useProfile();
  const sessions = useLibraryStore((s) => s.sessions);
  const [progressTarget, setProgressTarget] = useState<ShelfItem | null>(null);

  const reading = useMemo(() => sortByRecent(byStatus(shelf, 'reading')), [shelf]);
  const streak = useMemo(() => readingStreak(sessions), [sessions]);
  const now = new Date();

  return (
    <Page>
      <header className={styles.masthead}>
        <p className={styles.date}>{formatToday(now)}</p>
        <h1 className="t-display">
          {getGreeting(now)},
          <br />
          <span className={styles.name}>{profile.nickname}</span> 님
        </h1>
        <p className={styles.lede}>
          {shelf.length === 0
            ? '오늘부터 나만의 서재를 채워볼까요?'
            : streak > 1
              ? `${streak}일째 꾸준히 읽고 있어요. 오늘도 한 페이지 넘겨볼까요?`
              : reading.length > 0
                ? '오늘 몇 페이지를 읽었는지 기록해 보세요.'
                : '다음에 읽을 책을 골라볼까요?'}
        </p>
      </header>

      {shelf.length === 0 ? (
        <section className={styles.onboarding} aria-label="시작하기">
          <EmptyState
            title="아직 서재가 비어 있어요"
            description="읽고 있거나 읽고 싶은 책을 검색해서 서재에 담아보세요. 진도와 기록이 이곳에 차곡차곡 쌓여요."
            action={
              <ButtonLink to={paths.search} leadingIcon={<Search aria-hidden />}>
                첫 책 찾아보기
              </ButtonLink>
            }
          />
        </section>
      ) : (
        <div className={styles.layout}>
          <div className={styles.reading}>
            <CurrentlyReading items={reading} sessions={sessions} onRecord={setProgressTarget} />
          </div>
          <div className={styles.overview}>
            <ReadingOverview shelf={shelf} sessions={sessions} streak={streak} />
          </div>
          <div className={styles.notes}>
            <RecentNotes />
          </div>
        </div>
      )}

      <Discover />

      <ProgressSheet target={progressTarget} onClose={() => setProgressTarget(null)} />
    </Page>
  );
}
