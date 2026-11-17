import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Repeat } from 'lucide-react';
import { relayError, useRelayStore } from '@/store/relayStore';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { Page } from '@/components/layout/Page';
import { EmptyState, Skeleton, useToast } from '@/components/ui';
import { paths } from '@/routes/paths';
import styles from './Relay.module.scss';

/** 초대 링크(/relays/join/:code): 로그인돼 있으면 바로 참여하고 방으로 이동 */
export function RelayJoinPage() {
  const { code = '' } = useParams();
  const gate = useAuthGate();
  const join = useRelayStore((s) => s.join);
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);
  const [error, setError] = useState<string>();
  const tried = useRef(false);

  useEffect(() => {
    if (gate !== 'member' || tried.current) return;
    tried.current = true;
    join(code)
      .then((id) => {
        showToast('릴레이에 참여했어요');
        navigate(paths.relay(id), { replace: true });
      })
      .catch((e) => setError(relayError(e)));
  }, [gate, code, join, navigate, showToast]);

  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen
          icon={<Repeat aria-hidden />}
          title="릴레이 독서 토론에 초대받았어요"
          description={`로그인하면 초대 코드 ${code.toUpperCase()}로 바로 참여해요.`}
        />
      </Page>
    );

  return (
    <Page narrow>
      {error ? (
        <EmptyState
          title="참여하지 못했어요"
          description={error}
          action={
            <Link to={paths.relays} className={styles.textLink}>
              릴레이 목록으로
            </Link>
          }
        />
      ) : (
        <div className={styles.joining} aria-busy>
          <Skeleton height={20} width="60%" />
          <p className={styles.muted}>릴레이에 들어가는 중이에요…</p>
        </div>
      )}
    </Page>
  );
}
