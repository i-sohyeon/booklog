import { SAMPLE_CATALOG } from '@/mocks/catalog';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Book } from '@/types/book';
import { searchCatalogSync } from '@/services/bookSearch';
import { BookCover, IconButton, SearchField } from '@/components/ui';
import styles from './BookPicker.module.scss';

/** 폼 안에서 책 하나를 고르는 검색 필드 */
export function BookPicker({ value, onChange, label, optional }: { value: Book | null; onChange: (b: Book | null) => void; label: string; optional?: boolean }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchCatalogSync(q, 6), [q]);

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>
        {label}
        {optional && <span>선택</span>}
      </p>
      {value ? (
        <div className={styles.picked}>
          <BookCover book={value} size="xs" />
          <span>
            <strong>{value.title}</strong>
            {value.authors.join(', ')}
          </span>
          <IconButton label="책 선택 취소" size="sm" onClick={() => onChange(null)}>
            <X />
          </IconButton>
        </div>
      ) : (
        <>
          <SearchField label={label} placeholder="제목, 저자로 찾기" value={q} onValueChange={setQ} />
          {q.trim() && (
            <ul role="listbox" aria-label="검색 결과" className={styles.results}>
              {results.length === 0 && <li className={styles.none}>찾는 책이 없어요 (샘플 도서 {SAMPLE_CATALOG.length}권)</li>}
              {results.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={styles.result}
                    onClick={() => {
                      onChange(b);
                      setQ('');
                    }}
                  >
                    <BookCover book={b} size="xs" />
                    <span>
                      <strong>{b.title}</strong>
                      {b.authors.join(', ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
