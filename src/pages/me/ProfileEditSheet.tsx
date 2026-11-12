import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCloudStore } from '@/store/cloudStore';
import { authErrorMessage, authService } from '@/services/auth';
import { isDemoUser } from '@/config/demoAccounts';
import { validateNickname } from '@/pages/auth/validation';
import { Button, Sheet, TextField, useToast } from '@/components/ui';
import styles from './MyPage.module.scss';

const NICK_MAX = 12;

/** 프로필 편집 — 지금은 닉네임 */
export function ProfileEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const showToast = useToast((s) => s.show);
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const demo = isDemoUser(user?.id);

  const close = () => {
    if (pending) return;
    setNickname(user?.nickname ?? '');
    setSubmitted(false);
    setServerError(undefined);
    onClose();
  };

  const error = submitted ? validateNickname(nickname) : undefined;
  const unchanged = nickname.trim() === (user?.nickname ?? '');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    if (!user || demo || validateNickname(nickname) || unchanged) return;
    setPending(true);
    try {
      await authService.updateNickname(nickname);
      // 친구 목록·후기에 보이는 이름도 바로 반영
      useCloudStore.setState((s) => {
        const mine = s.profiles[user.id];
        return mine ? { profiles: { ...s.profiles, [user.id]: { ...mine, nickname: nickname.trim() } } } : s;
      });
      showToast('닉네임을 바꿨어요');
      setSubmitted(false);
      onClose();
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="프로필 편집" description="닉네임은 친구 찾기, 후기, 게시판 글에 보여요.">
      <form className={styles.editForm} onSubmit={save} noValidate>
        <TextField
          label="닉네임"
          value={nickname}
          maxLength={NICK_MAX}
          onChange={(e) => setNickname(e.target.value)}
          error={error}
          hint={`${nickname.trim().length}/${NICK_MAX} · 2~12자`}
          disabled={demo || pending}
          autoComplete="nickname"
        />
        {demo && <p className={styles.editNote}>테스트 계정은 여러 사람이 함께 쓰는 계정이라 닉네임을 바꿀 수 없어요.</p>}
        {serverError && (
          <p className={styles.editError} role="alert">
            {serverError}
          </p>
        )}
        <div className={styles.editActions}>
          <Button variant="outline" onClick={close} disabled={pending}>
            취소
          </Button>
          <Button type="submit" loading={pending} disabled={demo || unchanged}>
            저장
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
