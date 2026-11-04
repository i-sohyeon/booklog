import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useLibraryStore } from '@/store/libraryStore';
import { useShelf } from '@/hooks/useShelf';
import { availableYears } from '@/store/stats';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { ButtonLink, EmptyState, Tabs } from '@/components/ui';
import { YearView } from './YearView';
import { MonthView } from './MonthView';
import { HistoryView } from './HistoryView';
import styles from './StatsPage.module.scss';

type View = 'year' | 'month' | 'history';

export function StatsPage() {
  const shelf = useShelf();
  const sessions = useLibraryStore((s) => s.sessions);
  const [params, setParams] = useSearchParams();
  const now = new Date();

  const years = useMemo(() => availableYears(shelf, sessions), [shelf, sessions]);
  const rawView = params.get('view');
  const view: View = rawView === 'month' || rawView === 'history' ? rawView : 'year';
  const yearParam = Number(params.get('year'));
  const year = years.includes(yearParam) ? yearParam : now.getFullYear();
  const monthParam = Number(params.get('month'));
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam - 1 : now.getMonth();

  const update = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace: true });
  };

  const hasAny = shelf.length > 0 || sessions.length > 0;

  return (
    <Page>
      <PageHeader eyebrow="Statistics" title="독서 통계" description="나의 독서 흐름을 돌아봐요" />

      {!hasAny ? (
        <EmptyState
          title="아직 통계로 보여줄 기록이 없어요"
          description="책을 서재에 담고 진도를 기록하면 이곳에 독서 흐름이 쌓여요."
          action={<ButtonLink to={paths.search}>책 찾아보기</ButtonLink>}
        />
      ) : (
        <>
          <div className={styles.tabs}>
            <Tabs<View>
              label="통계 보기"
              value={view}
              onChange={(v) => update({ view: v === 'year' ? null : v })}
              controls="stats-panel"
              items={[
                { value: 'year', label: '연간' },
                { value: 'month', label: '월간' },
                { value: 'history', label: '히스토리' },
              ]}
            />
          </div>
          <div id="stats-panel" role="tabpanel" className={styles.panel}>
            {view === 'year' && (
              <YearView shelf={shelf} sessions={sessions} year={year} years={years} onYear={(y) => update({ year: y })} />
            )}
            {view === 'month' && (
              <MonthView
                shelf={shelf}
                sessions={sessions}
                year={year}
                month={month}
                onChange={(y, m) => update({ year: y, month: m + 1 })}
              />
            )}
            {view === 'history' && <HistoryView shelf={shelf} />}
          </div>
        </>
      )}
    </Page>
  );
}
