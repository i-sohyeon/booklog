import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authErrorMessage, authService } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { paths } from '@/routes/paths';
import { Button, TextField, useToast } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { validateEmail } from './validation';
import styles from './AuthForm.module.scss';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuthStore((s) => s.status);
  const showToast = useToast((s) => s.show);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();

  const from = (location.state as { from?: string } | null)?.from ?? paths.home;
  if (status === 'signedIn') return <Navigate to={from} replace />;

  const emailError = submitted ? validateEmail(email) : undefined;
  const passwordError = submitted && !password ? '비밀번호를 입력해 주세요.' : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    if (validateEmail(email) || !password) return;
    setPending(true);
    try {
      const user = await authService.signIn(email.trim(), password);
      showToast(`${user.nickname}님, 다시 만나서 반가워요`);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="로그인"
      description="계정에 로그인하면 여러 기기에서 서재를 이어볼 수 있어요."
      footer={
        <>
          아직 계정이 없나요?<Link to={paths.signup}>회원가입</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          disabled={!isSupabaseConfigured}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          disabled={!isSupabaseConfigured}
        />
        <div className={styles.row}>
          <Link to={paths.resetPassword} className={styles.link}>
            비밀번호를 잊었어요
          </Link>
        </div>
        {serverError && (
          <p className={styles.serverError} role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={pending} disabled={!isSupabaseConfigured}>
          로그인
        </Button>
      </form>
    </AuthLayout>
  );
}
