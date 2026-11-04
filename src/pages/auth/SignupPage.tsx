import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { MailCheck } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authErrorMessage, authService } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { paths } from '@/routes/paths';
import { Button, ButtonLink, TextField } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { validateEmail, validateNickname, validatePassword } from './validation';
import styles from './AuthForm.module.scss';

export function SignupPage() {
  const status = useAuthStore((s) => s.status);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (status === 'signedIn' && !sentTo) return <Navigate to={paths.home} replace />;

  const errors = {
    nickname: validateNickname(nickname),
    email: validateEmail(email),
    password: validatePassword(password),
    confirm: confirm !== password ? '비밀번호가 일치하지 않아요.' : !confirm ? '비밀번호를 한 번 더 입력해 주세요.' : undefined,
    agree: agree ? undefined : '약관에 동의해 주세요.',
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    if (Object.values(errors).some(Boolean)) return;
    setPending(true);
    try {
      const { needsConfirmation } = await authService.signUp(email.trim(), password, nickname.trim());
      if (needsConfirmation) setSentTo(email.trim());
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title="메일을 확인해 주세요">
        <div className={styles.done}>
          <MailCheck aria-hidden />
          <p>
            <strong>{sentTo}</strong>로 인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 완료돼요.
          </p>
        </div>
        <ButtonLink to={paths.login} size="lg" block variant="outline">
          로그인으로
        </ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="회원가입"
      description="북로그에서 나만의 서재를 시작해 보세요."
      footer={
        <>
          이미 계정이 있나요?<Link to={paths.login}>로그인</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="닉네임"
          autoComplete="nickname"
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={show('nickname')}
          hint="2~12자, 프로필과 피드에 표시돼요."
          disabled={!isSupabaseConfigured}
        />
        <TextField
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={show('email')}
          disabled={!isSupabaseConfigured}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={show('password')}
          hint="8자 이상, 영문과 숫자를 함께 사용해 주세요."
          disabled={!isSupabaseConfigured}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={show('confirm')}
          disabled={!isSupabaseConfigured}
        />
        <div>
          <label className={styles.check}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={!isSupabaseConfigured} />
            <span>서비스 이용약관 및 개인정보 처리방침에 동의합니다 (필수)</span>
          </label>
          {show('agree') && (
            <p className={styles.fieldError} role="alert">
              {show('agree')}
            </p>
          )}
          <p className={styles.legalNote}>약관 본문은 정식 출시 전에 제공될 예정이에요.</p>
        </div>
        {serverError && (
          <p className={styles.serverError} role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={pending} disabled={!isSupabaseConfigured}>
          가입하기
        </Button>
      </form>
    </AuthLayout>
  );
}
