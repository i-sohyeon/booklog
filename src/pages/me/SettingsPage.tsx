import { useState } from 'react';
import { CloudDownload, CloudUpload, KeyRound, LogIn, LogOut, Settings } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { useSocialStore } from '@/store/socialStore';
import { useAuthStore } from '@/store/authStore';
import { authErrorMessage, authService } from '@/services/auth';
import { downloadLibrary, readLastSync, uploadLibrary, writeLastSync } from '@/services/cloudSync';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { Button, ButtonLink, Sheet, useToast } from '@/components/ui';
import styles from './SettingsPage.module.scss';

type Confirm = 'clear' | 'sample' | 'upload' | 'download' | null;

const COPY: Record<Exclude<Confirm, null>, { title: string; desc: string; cta: string; danger?: boolean }> = {
  clear: { title: '모든 기록을 비울까요?', desc: '이 브라우저의 서재·별점·한 줄 평과 내 글·댓글·모임 참여가 삭제되며 되돌릴 수 없어요.', cta: '비우기', danger: true },
  sample: { title: '샘플 데이터로 되돌릴까요?', desc: '이 브라우저의 기록과 소셜 활동이 처음 샘플 상태로 바뀌어요.', cta: '되돌리기' },
  upload: { title: '이 기기의 기록을 계정에 올릴까요?', desc: '계정의 서재가 이 기기 기준으로 바뀌어요. 이 기기에 없는 책은 계정에서 삭제돼요.', cta: '올리기' },
  download: { title: '계정의 기록을 불러올까요?', desc: '이 기기의 서재가 계정의 서재로 대체돼요.', cta: '불러오기', danger: true },
};

export function SettingsPage() {
  const dataSource = useLibraryStore((s) => s.dataSource);
  const loadSample = useLibraryStore((s) => s.loadSample);
  const clearAll = useLibraryStore((s) => s.clearAll);
  const replaceAll = useLibraryStore((s) => s.replaceAll);
  const resetSocial = useSocialStore((s) => s.reset);
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const showToast = useToast((s) => s.show);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const [lastSync, setLastSync] = useState(readLastSync);

  const run = async () => {
    if (confirm === 'clear') {
      clearAll();
      resetSocial();
      showToast('기록을 비웠어요');
    } else if (confirm === 'sample') {
      loadSample();
      resetSocial();
      showToast('샘플 데이터로 되돌렸어요');
    } else if ((confirm === 'upload' || confirm === 'download') && user) {
      setBusy(true);
      setSyncError(undefined);
      try {
        if (confirm === 'upload') {
          const { books } = await uploadLibrary(user.id, useLibraryStore.getState());
          writeLastSync('up');
          showToast(`책 ${books}권의 기록을 계정에 저장했어요`);
        } else {
          const snap = await downloadLibrary(user.id);
          replaceAll(snap);
          writeLastSync('down');
          showToast(`계정에서 책 ${Object.keys(snap.entries).length}권을 불러왔어요`);
        }
        setLastSync(readLastSync());
      } catch (err) {
        setSyncError(err instanceof Error && err.message ? `동기화에 실패했어요: ${err.message}` : authErrorMessage(err));
      } finally {
        setBusy(false);
      }
    }
    setConfirm(null);
  };

  const copy = confirm ? COPY[confirm] : null;

  return (
    <Page narrow>
      <PageHeader back title="설정" />

      <section className={styles.panel} aria-labelledby="account-title">
        <div className={styles.head}>
          <KeyRound aria-hidden />
          <h2 id="account-title">계정</h2>
        </div>
        {authStatus === 'unconfigured' && (
          <p className={styles.desc}>
            계정 서버(Supabase)가 아직 연결되지 않았어요. <code>.env.local</code>을 설정하면 로그인과 기기 간 동기화를 쓸 수 있어요.
          </p>
        )}
        {authStatus === 'loading' && <p className={styles.desc}>로그인 상태를 확인하는 중…</p>}
        {authStatus === 'signedOut' && (
          <>
            <p className={styles.desc}>로그인하면 기록을 계정에 저장하고 다른 기기에서도 이어볼 수 있어요.</p>
            <div className={styles.actions}>
              <ButtonLink to={paths.login} size="sm" leadingIcon={<LogIn aria-hidden />}>
                로그인
              </ButtonLink>
              <ButtonLink to={paths.signup} size="sm" variant="outline">
                회원가입
              </ButtonLink>
            </div>
          </>
        )}
        {authStatus === 'signedIn' && user && (
          <>
            <p className={styles.desc}>
              <strong>{user.email}</strong> 으로 로그인했어요.
            </p>
            <div className={styles.actions}>
              <ButtonLink to={paths.updatePassword} size="sm" variant="outline">
                비밀번호 변경
              </ButtonLink>
              <Button
                size="sm"
                variant="ghost"
                leadingIcon={<LogOut aria-hidden />}
                onClick={async () => {
                  try {
                    await authService.signOut();
                    showToast('로그아웃했어요');
                  } catch (err) {
                    showToast(authErrorMessage(err));
                  }
                }}
              >
                로그아웃
              </Button>
            </div>
          </>
        )}
      </section>

      {authStatus === 'signedIn' && user && (
        <section className={styles.panel} aria-labelledby="sync-title">
          <div className={styles.head}>
            <CloudUpload aria-hidden />
            <h2 id="sync-title">기록 옮기기</h2>
          </div>
          <p className={styles.desc}>
            {dataSource === 'sample'
              ? '샘플 데이터가 표시되고 있어 계정에 올릴 수 없어요. 아래에서 비운 뒤 직접 기록하세요.'
              : '서재·별점·한 줄 평을 계정에 올리거나 계정에서 불러와요. 커뮤니티·모임 활동은 아직 옮겨지지 않아요.'}
          </p>
          {lastSync && (
            <p className={styles.meta}>
              마지막 {lastSync.direction === 'up' ? '올리기' : '불러오기'}: {formatRelative(lastSync.at)}
            </p>
          )}
          <div className={styles.actions}>
            <Button size="sm" leadingIcon={<CloudUpload aria-hidden />} disabled={dataSource === 'sample' || busy} onClick={() => setConfirm('upload')}>
              이 기기 → 계정
            </Button>
            <Button size="sm" variant="outline" leadingIcon={<CloudDownload aria-hidden />} disabled={busy} onClick={() => setConfirm('download')}>
              계정 → 이 기기
            </Button>
          </div>
          {syncError && (
            <p className={styles.error} role="alert">
              {syncError}
            </p>
          )}
        </section>
      )}

      <section className={styles.panel} aria-labelledby="data-title">
        <div className={styles.head}>
          <Settings aria-hidden />
          <h2 id="data-title">데이터 관리</h2>
        </div>
        <p className={styles.desc}>
          {dataSource === 'sample' ? '지금 보이는 서재와 커뮤니티는 화면 확인용 샘플 데이터예요.' : '기록은 이 브라우저에 저장돼요.'}
        </p>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={() => setConfirm('sample')}>
            샘플 데이터로 되돌리기
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirm('clear')}>
            모든 기록 비우기
          </Button>
        </div>
      </section>

      <Sheet
        open={copy !== null}
        onClose={() => !busy && setConfirm(null)}
        title={copy?.title ?? ''}
        description={copy?.desc}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              취소
            </Button>
            <Button variant={copy?.danger ? 'danger' : 'primary'} onClick={run} loading={busy}>
              {copy?.cta}
            </Button>
          </>
        }
      >
        {null}
      </Sheet>
    </Page>
  );
}
