import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './SearchField.module.scss';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  size?: 'md' | 'lg';
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onValueChange, label, size = 'md', className, ...rest },
  ref,
) {
  return (
    <div className={cn(styles.field, styles[size], className)}>
      <Search className={styles.icon} aria-hidden />
      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={styles.input}
        {...rest}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onValueChange('')} aria-label="검색어 지우기">
          <X aria-hidden />
        </button>
      )}
    </div>
  );
});
