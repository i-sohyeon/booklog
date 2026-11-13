import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLoginPrompt } from '@/store/loginGate';
import { paths } from '@/routes/paths';
import { Button, Sheet } from '@/components/ui';
import styles from './LoginPrompt.module.scss';

/**
 * 로그인 안내의 공통 버튼 묶음: [로그인] 하나 + 작은 회원가입 링크.
 * 홈 띠 · 로그인 필요 시트 · 로그인 전용 화면이 모두 같은 구성과 문구를 씁니다.
 */
function GuestActions({ onGo }: { onGo?: () => void }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const state = { from: `${pathname}${search}` };
  return (
    <div className={styles.actions}>
      <Button
        size="lg"
        block
        onClick={() => {
          onGo?.();
          navigate(paths.login, { state });
        }}
      >
        로그인
      </Button>
      <p className={styles.links}>
        처음이신가요?
        <Link to={paths.signup} state={state} onClick={onGo}>
          회원가입
        </Link>
      </p>
    </div>
  );
}

/** 로그인이 필요한 기능을 눌렀을 때 뜨는 안내 시트 (AppLayout에 하나) */
export function LoginPromptSheet() {
  const reason = useLoginPrompt((s) => s.reason);
  const close = useLoginPrompt((s) => s.close);
  return (
    <Sheet open={reason !== null} onClose={close} title="로그인이 필요해요" description={reason ?? undefined}>
      <GuestActions onGo={close} />
    </Sheet>
  );
}

/** 로그인해야 볼 수 있는 화면(서재·마이·작성 화면 등) 자리에 보여주는 안내 */
export function GuestScreen({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <section className={styles.guest} aria-labelledby="guest-title">
      {icon && <div className={styles.icon}>{icon}</div>}
      <h1 id="guest-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.desc}>{description}</p>
      <GuestActions />
    </section>
  );
}

/** 홈 인사말 아래 한 줄 띠: 로그인하지 않은 상태임을 조용히 알리고 로그인으로 보냄 */
export function GuestBanner() {
  const { pathname } = useLocation();
  return (
    <p className={styles.banner}>
      <span>로그인하면 별점과 한 줄 평을 남기고 친구 소식을 볼 수 있어요.</span>
      <Link to={paths.login} state={{ from: pathname }} className={styles.bannerLink}>
        로그인
      </Link>
    </p>
  );
}
