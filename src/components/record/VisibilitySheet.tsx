import type { LibraryEntry, RecordField, RecordVisibility } from '@/types/book';
import { RECORD_FIELD_LABEL } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import { Button, Sheet, Switch, useToast } from '@/components/ui';
import styles from './VisibilitySheet.module.scss';

/** 이 기록에 실제로 내용이 있는 항목만 (별점은 다 읽은 책이면 늘 있음) */
export function filledFields(entry: LibraryEntry): RecordField[] {
  const out: RecordField[] = [];
  if (entry.rating) out.push('rating');
  if (entry.oneLiner) out.push('oneLiner');
  if (entry.review) out.push('review');
  if (entry.quotes?.length) out.push('quotes');
  if (entry.place || entry.occasion) out.push('context');
  if (entry.tags?.length) out.push('tags');
  return out;
}

/** 공개 중인 항목 이름 (내용이 있는 것만) */
export function publicFields(entry: LibraryEntry): RecordField[] {
  return filledFields(entry).filter((f) => entry.visibility?.[f]);
}

const HINT: Partial<Record<RecordField, string>> = {
  rating: '켜면 친구 홈 피드와 책 상세 후기에 보여요.',
  oneLiner: '별점과 함께 후기에 보여요.',
};

/** 책 상세에서 바로 바꾸는 항목별 공개 설정. 바꾸는 즉시 저장돼요. */
export function VisibilitySheet({ entry, open, onClose }: { entry: LibraryEntry; open: boolean; onClose: () => void }) {
  const setVisibility = useLibraryStore((s) => s.setVisibility);
  const showToast = useToast((s) => s.show);
  const fields = filledFields(entry);
  const vis = entry.visibility ?? {};
  const allOn = fields.length > 0 && fields.every((f) => vis[f]);

  const toggle = (field: RecordField, on: boolean) => setVisibility(entry.bookId, { ...vis, [field]: on } satisfies RecordVisibility);
  const setAll = (on: boolean) => {
    const next: RecordVisibility = { ...vis };
    for (const f of fields) next[f] = on;
    setVisibility(entry.bookId, next);
    showToast(on ? '기록을 모두 공개했어요' : '나만 보는 기록으로 바꿨어요');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="공개 설정"
      description="켠 항목만 친구에게 보여요. 바꾸는 즉시 저장돼요."
      footer={
        <>
          <Button variant="outline" onClick={() => setAll(!allOn)}>
            {allOn ? '모두 나만 보기' : '모두 공개'}
          </Button>
          <Button onClick={onClose}>완료</Button>
        </>
      }
    >
      <ul role="list" className={styles.list}>
        {fields.map((f) => (
          <li key={f}>
            <Switch label={RECORD_FIELD_LABEL[f]} description={HINT[f]} checked={Boolean(vis[f])} onChange={(on) => toggle(f, on)} />
          </li>
        ))}
      </ul>
      <p className={styles.note}>내용을 쓰지 않은 항목은 ‘기록 자세히 쓰기’에서 쓰고 공개할 수 있어요.</p>
    </Sheet>
  );
}
