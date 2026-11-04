import { useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, ChevronRight, CloudDownload, CloudUpload, KeyRound, LogIn, LogOut, NotebookPen, Settings, Target, UsersRound } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import { useShelf } from '@/hooks/useShelf';
import { useProfile } from '@/hooks/useProfile';
import { countByStatus } from '@/store/selectors';
import { authErrorMessage, authService } from '@/services/auth';
import { downloadLibrary, readLastSync, uploadLibrary, writeLastSync } from '@/services/cloudSync';
import { formatRelative } from '@/lib/date';
import { paths } from '@/routes/paths';
import { Page } from '@/components/layout/Page';
import { Avatar, Badge, Button, ButtonLink, Sheet, useToast } from '@/components/ui';
import { GoalSheet } from '@/components/stats/GoalSheet';
import styles from './MyPage.module.scss';

type Confirm = 'clear' | 'sample' | 'upload' | 'download' | null;

export function MyPage() {
  const shelf = useShelf();
  const counts = countByStatus(shelf);
  const profile = useProfile();
  const goal = useLibraryStore((s) => s.goal);
  const dataSource = useLibraryStore((s) => s.dataSource);
  const notesCount = useLibraryStore((s) => s.notes.length);
  const loadSample = useLibraryStore((s) => s.loadSample);
  const clearAll = useLibraryStore((s) => s.clearAll);
  const replaceAll = useLibraryStore((s) => s.replaceAll);
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const showToast = useToast((s) => s.show);

  const [goalOpen, setGoalOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const [lastSync, setLastSync] = useState(readLastSync);

  const runConfirmed = async () => {
    if (confirm === 'clear') {
      clearAll();
      showToast('서재를 비웠어요');
    } else if (confirm === 'sample') {
      loadSample();
      showToast('샘플 데이터를 불러왔어요');
    } else if ((confirm === 'upload' || confirm === 'download') && user) {
      setBusy(true);
      setSyncError(undefined);
      try {
        if (confirm === 'upload') {
          const { books, notes } = await uploadLibrary(user.id, useLibraryStore.getState());
          writeLastSync('up');
          showToast(`책 ${books}권과 기록 ${notes}개를 계정에 저장했어요`);
        } else {
          const snapshot = await downloadLibrary(user.id);
          replaceAll(snapshot);
          writeLastSync('down');
          showToast(`계정에서 책 ${Object.keys(snapshot.entries).length}권을 불러왔어요`);
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

  const signOut = async () => {
    try {
      await authService.signOut();
      showToast('로그아웃했어요');
    } catch (err) {
      showToast(authErrorMessage(err));
    }
  };

  const CONFIRM_COPY: Record<Exclude<Confirm, null>, { title: string; desc: string; cta: string; danger?: boolean }> = {
    clear: { title: '모든 데이터를 비울까요?', desc: '이 브라우저에 저장된 서재·진도·기록이 삭제되며 되돌릴 수 없어요.', cta: '비우기', danger: true },
    sample: { title: '샘플 데이터를 불러올까요?', desc: '이 브라우저에 저장된 서재·진도·기록이 샘플로 대체되며 되돌릴 수 없어요.', cta: '불러오기' },
    upload: { title: '이 기기의 기록을 계정에 올릴까요?', desc: '계정에 저장된 서재가 이 기기의 서재 기준으로 바뀌어요. 이 기기에 없는 책과 메모는 계정에서 삭제돼요.', cta: '올리기' },
    download: { title: '계정의 기록을 불러올까요?', desc: '이 기기에 저장된 서재가 계정의 서재로 대체돼요. 올리지 않은 이 기기의 기록은 사라져요.', cta: '불러오기', danger: true },
  };
  const copy = confirm ? CONFIRM_COPY[confirm] : null;

  return (
    <Page narrow>
      <section className={styles.profile}>
        <Avatar name={profile.nickname} size="lg" />
        <div>
          <h1 className={styles.name}>{profile.nickname}</h1>
          {profile.handle && <p className={styles.handle}>{profile.handle}</p>}
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        </div>
        {profile.source !== 'account' && (
          <Badge tone="outline" className={styles.guest}>
            {profile.source === 'sample' ? '샘플 사용자' : '게스트'}
          </Badge>
        )}
      </section>

      <dl className={styles.summary}>
        <div>
          <dt>서재</dt>
          <dd>{counts.all}</dd>
        </div>
        <div>
          <dt>완독</dt>
          <dd>{counts.done}</dd>
        </div>
        <div>
          <dt>기록</dt>
          <dd>{notesCount}</dd>
        </div>
      </dl>

      <nav aria-label="마이페이지 메뉴" className={styles.menu}>
        <button type="button" className={styles.row} onClick={() => setGoalOpen(true)}>
          <Target aria-hidden />
          <span>{goal.year}년 독서 목표</span>
          <em>{goal.targetBooks}권</em>
          <ChevronRight aria-hidden className={styles.chev} />
        </button>
        <Link to={paths.stats} className={styles.row}>
          <BarChart3 aria-hidden />
          <span>독서 통계</span>
          <ChevronRight aria-hidden className={styles.chev} />
        </Link>
        <Link to={paths.notes} className={styles.row}>
          <NotebookPen aria-hidden />
          <span>나의 기록</span>
          <em>{notesCount}개</em>
          <ChevronRight aria-hidden className={styles.chev} />
        </Link>
        <Link to={paths.clubs} className={styles.row}>
          <UsersRound aria-hidden />
          <span>독서 모임</span>
          <Badge>준비 중</Badge>
          <ChevronRight aria-hidden className={styles.chev} />
        </Link>
      </nav>

      {/* ---------- 계정 ---------- */}
      <section className={styles.panel} aria-labelledby="account-title">
        <div className={styles.panelHead}>
          <KeyRound aria-hidden />
          <h2 id="account-title">계정</h2>
        </div>
        {authStatus === 'unconfigured' && (
          <p className={styles.panelDesc}>
            계정 서버(Supabase)가 아직 연결되지 않았어요. <code>.env.local</code>을 설정하면 로그인과 기기 간 동기화를 사용할 수 있어요.
          </p>
        )}
        {authStatus === 'loading' && <p className={styles.panelDesc}>로그인 상태를 확인하는 중…</p>}
        {authStatus === 'signedOut' && (
          <>
            <p className={styles.panelDesc}>로그인하면 이 기기의 기록을 계정에 저장하고 다른 기기에서도 이어볼 수 있어요.</p>
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
            <p className={styles.panelDesc}>
              <strong>{user.email}</strong> 으로 로그인했어요.
            </p>
            <div className={styles.actions}>
              <ButtonLink to={paths.updatePassword} size="sm" variant="outline">
                비밀번호 변경
              </ButtonLink>
              <Button size="sm" variant="ghost" leadingIcon={<LogOut aria-hidden />} onClick={signOut}>
                로그아웃
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ---------- 동기화 ---------- */}
      {authStatus === 'signedIn' && user && (
        <section className={styles.panel} aria-labelledby="sync-title">
          <div className={styles.panelHead}>
            <CloudUpload aria-hidden />
            <h2 id="sync-title">기록 옮기기</h2>
          </div>
          <p className={styles.panelDesc}>
            {dataSource === 'sample'
              ? '지금은 샘플 데이터가 표시되고 있어 계정에 올릴 수 없어요. 아래 데이터 관리에서 비운 뒤 직접 기록하거나, 계정의 기록을 불러오세요.'
              : '이 브라우저에 쌓인 기록을 계정에 올리거나, 계정의 기록을 이 기기로 불러올 수 있어요. 자동 동기화는 다음 업데이트에서 제공돼요.'}
          </p>
          {lastSync && (
            <p className={styles.syncMeta}>
              마지막 {lastSync.direction === 'up' ? '올리기' : '불러오기'}: {formatRelative(lastSync.at)}
            </p>
          )}
          <div className={styles.actions}>
            <Button size="sm" leadingIcon={<CloudUpload aria-hidden />} disabled={dataSource === 'sample' || busy} loading={busy && confirm === 'upload'} onClick={() => setConfirm('upload')}>
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

      {/* ---------- 로컬 데이터 ---------- */}
      <section id="data" className={styles.panel} aria-labelledby="data-title">
        <div className={styles.panelHead}>
          <Settings aria-hidden />
          <h2 id="data-title">데이터 관리</h2>
        </div>
        <p className={styles.panelDesc}>
          {dataSource === 'sample'
            ? '지금 보이는 서재와 기록은 화면 확인용 샘플 데이터예요. 비우고 직접 책을 담아볼 수 있어요.'
            : '서재 데이터는 이 브라우저에 저장돼요.'}
        </p>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={() => setConfirm('sample')}>
            샘플 데이터 불러오기
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirm('clear')}>
            모든 데이터 비우기
          </Button>
        </div>
      </section>

      <GoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} />
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
            <Button variant={copy?.danger ? 'danger' : 'primary'} onClick={runConfirmed} loading={busy}>
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
