import type { FormEvent, ReactNode } from 'react';
import type { Blocker } from 'react-router';
import { X } from 'lucide-react';
import { Button, IconButton, Sheet } from '@/components/ui';
import styles from './EditorShell.module.scss';

interface EditorShellProps {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  canSubmit: boolean;
  blocker: Blocker;
  children: ReactNode;
  footer?: ReactNode;
}

/** 작성/수정 화면 공통 틀 — 상단 고정 바(닫기 · 제목 · 저장) + 이탈 확인 */
export function EditorShell({ title, onClose, onSubmit, submitLabel = '저장', canSubmit, blocker, children, footer }: EditorShellProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <form className={styles.shell} onSubmit={submit} noValidate>
      <header className={styles.bar}>
        <IconButton label="닫기" onClick={onClose}>
          <X />
        </IconButton>
        <h1 className={styles.title}>{title}</h1>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}

      <Sheet
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="작성을 그만둘까요?"
        description="저장하지 않은 내용은 사라져요."
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              계속 작성
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              나가기
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </form>
  );
}
