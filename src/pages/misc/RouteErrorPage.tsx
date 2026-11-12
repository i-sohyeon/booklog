import { useRouteError } from 'react-router';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { Button, ButtonLink, EmptyState } from '@/components/ui';
import { isStaleChunkError } from '@/lib/staleChunk';

/** 화면을 그리다 오류가 났을 때 (React Router 기본 "Unexpected Application Error!" 대신) */
export function RouteErrorPage() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const stale = isStaleChunkError(error);
  return (
    <Page narrow>
      <EmptyState
        title={stale ? '새 버전이 나왔어요' : '화면을 불러오지 못했어요'}
        description={stale ? '새로고침하면 최신 버전으로 열려요.' : '잠시 후 다시 시도해 주세요. 계속되면 새로고침해 주세요.'}
        action={
          <>
            <Button onClick={() => window.location.reload()}>새로고침</Button>
            <ButtonLink to={paths.home} variant="outline" reloadDocument>
              홈으로 가기
            </ButtonLink>
          </>
        }
      />
    </Page>
  );
}
