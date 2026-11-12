import { Link, useSearchParams } from 'react-router';
import { PenLine, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import type { FabKind } from '@/routes/navigation';
import { useRecord } from './recordStore';
import { requireLogin } from '@/store/loginGate';
import styles from './RecordFab.module.scss';

/**
 * 모바일 플로팅 버튼 — 하단 탭 바 위 오른쪽 (탭 바와 16px 간격).
 * 홈·발견·서재: 책 기록 / 커뮤니티: 글쓰기(독서모임 탭에서는 모임 만들기) / 그 외: 숨김
 */
export function FloatingAction({ kind, hidden }: { kind: FabKind; hidden: boolean }) {
  const start = useRecord((s) => s.start);
  const [params] = useSearchParams();
  if (kind === 'none') return null;

  const cls = cn(styles.fab, hidden && styles.hidden);
  if (kind === 'write') {
    const clubs = params.get('tab') === 'clubs';
    return (
      <Link
        to={clubs ? paths.clubNew : paths.postNew}
        onClick={(e) => {
          if (!requireLogin(clubs ? '모임을 만들려면 로그인해 주세요.' : '글을 쓰려면 로그인해 주세요.')) e.preventDefault();
        }}
        className={cn(cls, styles.extended)}
        tabIndex={hidden ? -1 : undefined}
        aria-hidden={hidden || undefined}
      >
        {clubs ? <Plus aria-hidden /> : <PenLine aria-hidden />}
        <span>{clubs ? '모임 만들기' : '글쓰기'}</span>
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => start()} aria-label="책 기록하기" tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined}>
      <Plus aria-hidden />
    </button>
  );
}
