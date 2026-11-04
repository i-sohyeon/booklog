import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authErrorMessage, authService } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { paths } from '@/routes/paths';
import { Button, ButtonLink, TextField, useToast } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { validatePassword } from './validation';
import styles from './AuthForm.module.scss';

/** 재설정 메일 링크(또는 로그인 상태)에서 새 비밀번호 설정 */
export function UpdatePasswordPage() {
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();

  if (isSupabaseConfigured && status === 'signedOut') {
    return (
      <AuthLayout title="링크가 만료되었어요" description="재설정 링크가 유효하지 않거나 만료되었어요. 다시 요청해 주세요.">
        <ButtonLink to={paths.resetPassword} size="lg" block>
          재설정 메일 다시 받기
        </ButtonLink>
      </AuthLayout>
    );
  }

  const pwError = validatePassword(password);
  const confirmError = confirm !== password ? '비밀번호가 일치하지 않아요.' : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    if (pwError || confirmError) return;
    setPending(true);
    try {
      await authService.updatePassword(password);
      useAuthStore.setState({ recovery: false });
      showToast('비밀번호를 변경했어요');
      navigate(paths.me, { replace: true });
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title="새 비밀번호 설정">
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={submitted ? pwError : undefined}
          hint="8자 이상, 영문과 숫자를 함께 사용해 주세요."
          disabled={!isSupabaseConfigured || status === 'loading'}
        />
        <TextField
          label="새 비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={submitted ? confirmError : undefined}
          disabled={!isSupabaseConfigured || status === 'loading'}
        />
        {serverError && (
          <p className={styles.serverError} role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={pending} disabled={!isSupabaseConfigured || status === 'loading'}>
          변경하기
        </Button>
      </form>
    </AuthLayout>
  );
}
