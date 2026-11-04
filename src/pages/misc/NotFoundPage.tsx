import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { ButtonLink, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <Page narrow>
      <EmptyState
        title="찾으시는 페이지가 없어요"
        description="주소가 바뀌었거나 사라진 페이지예요."
        action={<ButtonLink to={paths.home}>홈으로 가기</ButtonLink>}
      />
    </Page>
  );
}
