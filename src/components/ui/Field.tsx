import { forwardRef, useId, useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './Field.module.scss';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  counter?: ReactNode;
  children: ReactNode;
  className?: string;
  hideLabel?: boolean;
}

/** 레이블 · 도움말 · 오류 메시지를 묶는 공통 필드 래퍼 */
export function FieldShell({ id, label, hint, error, optional, counter, children, className, hideLabel }: FieldShellProps) {
  return (
    <div className={cn(styles.field, className)}>
      <div className={cn(styles.labelRow, hideLabel && 'sr-only')}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}>선택</span>}
        </label>
        {counter && <span className={styles.counter}>{counter}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  suffix?: ReactNode;
  fieldClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, suffix, fieldClassName, className, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={fieldClassName}>
      <div className={cn(styles.control, error && styles.invalid)}>
        <input
          ref={ref}
          id={id}
          className={cn(styles.input, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          {...rest}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
    </FieldShell>
  );
});

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  hideLabel?: boolean;
  /** 서체 — 인용문은 세리프 */
  tone?: 'sans' | 'serif';
  fieldClassName?: string;
}

/** 내용에 맞게 높이가 늘어나는 텍스트 영역 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, optional, hideLabel, tone = 'sans', maxLength, value, fieldClassName, className, ...rest },
  forwardedRef,
) {
  const id = useId();
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const length = typeof value === 'string' ? value.length : 0;

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      hideLabel={hideLabel}
      className={fieldClassName}
      counter={maxLength ? `${length.toLocaleString()} / ${maxLength.toLocaleString()}` : undefined}
    >
      <div className={cn(styles.control, styles.areaControl, error && styles.invalid)}>
        <textarea
          ref={(el) => {
            innerRef.current = el;
            if (typeof forwardedRef === 'function') forwardedRef(el);
            else if (forwardedRef) forwardedRef.current = el;
          }}
          id={id}
          value={value}
          maxLength={maxLength}
          className={cn(styles.textarea, tone === 'serif' && styles.serif, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hideLabel?: boolean;
  size?: 'sm' | 'md';
}

/** 라디오 그룹 기반 세그먼트 컨트롤 (화살표 키 이동은 브라우저 기본 동작) */
export function SegmentedControl<T extends string>({ label, options, value, onChange, hideLabel, size = 'md' }: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.segFieldset}>
      <legend className={cn(styles.label, styles.legend, hideLabel && 'sr-only')}>{label}</legend>
      <div className={cn(styles.segmented, styles[`seg-${size}`])}>
        {options.map((o) => (
          <label key={o.value} className={cn(styles.segment, value === o.value && styles.segActive)}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.icon}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
