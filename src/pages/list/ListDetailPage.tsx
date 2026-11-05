import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Trash2, X } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { useBookLookup, useLists, useMemberLookup } from '@/hooks/useSocial';
import { searchCatalogSync } from '@/services/bookSearch';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { Avatar, Button, ButtonLink, EmptyState, IconButton, LikeButton, SearchField, Sheet, useToast } from '@/components/ui';
import { BookRow } from '@/components/book/BookRow';
import styles from './ListDetailPage.module.scss';

export function ListDetailPage() {
  const { listId = '' } = useParams();
  const list = useLists().find((l) => l.id === listId);
  const owner = useMemberLookup()(list?.ownerId ?? '');
  const findBook = useBookLookup();
  const toggleLike = useSocialStore((s) => s.toggleLike);
  const toggleBook = useSocialStore((s) => s.toggleBookInList);
  const deleteList = useSocialStore((s) => s.deleteList);
  const showToast = useToast((s) => s.show);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!list)
    return (
      <Page narrow>
        <EmptyState title="리스트를 찾을 수 없어요" action={<ButtonLink to={paths.discover}>발견으로</ButtonLink>} />
      </Page>
    );

  const books = list.bookIds.map(findBook).filter((b) => b !== undefined);

  return (
    <Page narrow>
      <PageHeader back title={list.title} description={list.description} />
      <div className={styles.meta}>
        <Avatar name={owner.nickname} tone={owner.tone} size="xs" />
        <span>
          <strong>{owner.nickname}</strong> · {books.length}권
        </span>
        <span className={styles.spacer} />
        {list.isMine ? (
          <>
            <Button size="sm" variant="secondary" leadingIcon={<Plus aria-hidden />} onClick={() => setAdding(true)}>
              책 추가
            </Button>
            <IconButton label="리스트 삭제" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
            </IconButton>
          </>
        ) : (
          <LikeButton liked={list.liked} count={list.likeCount} onToggle={() => toggleLike('list', list.id)} label="이 리스트" />
        )}
      </div>

      {books.length === 0 ? (
        <EmptyState compact title="아직 담긴 책이 없어요" description={list.isMine ? '책 추가를 눌러 리스트를 채워보세요.' : undefined} />
      ) : (
        <ol className={styles.books}>
          {books.map((b, i) => (
            <li key={b.id}>
              <BookRow
                book={b}
                rank={i + 1}
                aside={
                  list.isMine && (
                    <IconButton label={`「${b.title}」 빼기`} size="sm" onClick={() => toggleBook(list.id, b.id)}>
                      <X />
                    </IconButton>
                  )
                }
              />
            </li>
          ))}
        </ol>
      )}

      {adding && <AddBooksSheet listId={list.id} bookIds={list.bookIds} onClose={() => setAdding(false)} />}
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="리스트를 삭제할까요?"
        description="삭제한 리스트는 되돌릴 수 없어요."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteList(list.id);
                showToast('리스트를 삭제했어요');
                navigate(paths.me, { replace: true });
              }}
            >
              삭제
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </Page>
  );
}

function AddBooksSheet({ listId, bookIds, onClose }: { listId: string; bookIds: string[]; onClose: () => void }) {
  const toggle = useSocialStore((s) => s.toggleBookInList);
  const [q, setQ] = useState('');
  const results = useMemo(() => searchCatalogSync(q), [q]);
  return (
    <Sheet open onClose={onClose} title="책 추가" description="검색해서 리스트에 담아요">
      <div className={styles.addSheet}>
        <SearchField label="책 검색" placeholder="제목, 저자" value={q} onValueChange={setQ} autoFocus />
        {results.map((b) => (
          <BookRow
            key={b.id}
            book={b}
            aside={
              <Button size="sm" variant={bookIds.includes(b.id) ? 'outline' : 'secondary'} onClick={() => toggle(listId, b.id)}>
                {bookIds.includes(b.id) ? '담김' : '담기'}
              </Button>
            }
          />
        ))}
      </div>
    </Sheet>
  );
}
