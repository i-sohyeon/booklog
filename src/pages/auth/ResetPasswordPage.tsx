import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { MailCheck } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authErrorMessage, authService } from '@/services/auth';
import { paths } from '@/routes/paths';
import { Button, TextField } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { validateEmail } from './validation';
import styles from './AuthForm.module.scss';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    if (validateEmail(email)) return;
    setPending(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="비밀번호 재설정"
      description="가입한 이메일로 재설정 링크를 보내드려요."
      footer={<Link to={paths.login}>로그인으로 돌아가기</Link>}
    >
      {sent ? (
        <div className={styles.done} role="status">
          <MailCheck aria-hidden />
          <p>
            <strong>{email.trim()}</strong>로 메일을 보냈어요. 가입된 이메일이라면 곧 링크가 도착해요.
          </p>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          <TextField
            label="이메일"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={submitted ? validateEmail(email) : undefined}
            disabled={!isSupabaseConfigured}
          />
          {serverError && (
            <p className={styles.serverError} role="alert">
              {serverError}
            </p>
          )}
          <Button type="submit" size="lg" block loading={pending} disabled={!isSupabaseConfigured}>
            재설정 메일 보내기
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
