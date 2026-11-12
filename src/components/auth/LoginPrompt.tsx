import { useLocation, useNavigate } from 'react-router';
import { LogIn } from 'lucide-react';
import { useLoginPrompt } from '@/store/loginGate';
import { paths } from '@/routes/paths';
import { Button, Sheet } from '@/components/ui';
import styles from './LoginPrompt.module.scss';

/** 로그인이 필요한 기능을 눌렀을 때 뜨는 안내 시트 (AppLayout에 하나) */
export function LoginPromptSheet() {
  const reason = useLoginPrompt((s) => s.reason);
  const close = useLoginPrompt((s) => s.close);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const go = (to: string) => {
    close();
    navigate(to, { state: { from: `${pathname}${search}` } });
  };
  return (
    <Sheet open={reason !== null} onClose={close} title="로그인이 필요해요" description={reason ?? undefined}>
      <div className={styles.actions}>
        <Button size="lg" block leadingIcon={<LogIn aria-hidden />} onClick={() => go(paths.login)}>
          로그인
        </Button>
        <Button size="lg" block variant="outline" onClick={() => go(paths.signup)}>
          회원가입
        </Button>
        <p className={styles.demo}>
          가입 없이 써 보고 싶다면 로그인 화면 아래 <strong>테스트 계정</strong>으로 시작할 수 있어요.
        </p>
      </div>
    </Sheet>
  );
}

/** 로그인해야 볼 수 있는 화면(서재·마이·작성 화면 등) 자리에 보여주는 안내 */
export function GuestScreen({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const go = (to: string) => navigate(to, { state: { from: `${pathname}${search}` } });
  return (
    <section className={styles.guest} aria-labelledby="guest-title">
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.eyebrow}>로그인하지 않은 상태예요</p>
      <h1 id="guest-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.desc}>{description}</p>
      <div className={styles.actions}>
        <Button size="lg" block leadingIcon={<LogIn aria-hidden />} onClick={() => go(paths.login)}>
          로그인
        </Button>
        <Button size="lg" block variant="outline" onClick={() => go(paths.signup)}>
          회원가입
        </Button>
      </div>
      <p className={styles.demo}>
        가입 없이 둘러보려면 로그인 화면 아래 <strong>테스트 계정</strong>을 이용해 보세요.
      </p>
    </section>
  );
}
