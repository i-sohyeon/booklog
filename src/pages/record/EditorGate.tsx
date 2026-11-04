import type { ReactNode } from 'react';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { ButtonLink, EmptyState } from '@/components/ui';

/** 서재에 없는 책 / 없는 기록 등 작성 불가 상황 안내 */
export function EditorUnavailable({ title, description, bookId }: { title: string; description: ReactNode; bookId?: string }) {
  return (
    <Page narrow>
      <EmptyState
        title={title}
        description={description}
        action={<ButtonLink to={bookId ? paths.book(bookId) : paths.library}>{bookId ? '책 정보로' : '내 서재로'}</ButtonLink>}
      />
    </Page>
  );
}
