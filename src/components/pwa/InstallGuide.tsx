import { useState } from 'react';
import { Check, EllipsisVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { detectPlatform, isInAppBrowser, useInstall, type Platform } from '@/lib/pwa';
import { Button, IconButton, Sheet, useToast } from '@/components/ui';
import styles from './InstallGuide.module.scss';

/** 기기별 "홈 화면에 추가" 순서 */
const STEPS: Record<Platform, { where: string; steps: React.ReactNode[] }> = {
  'ios-safari': {
    where: '아이폰 사파리',
    steps: [
      <>
        화면 아래(또는 주소창 옆)의 <Share aria-label="공유" className={styles.inline} /> <b>공유</b> 버튼을 눌러요.
      </>,
      <>
        메뉴를 내려 <PlusSquare aria-hidden className={styles.inline} /> <b>홈 화면에 추가</b>를 눌러요.
      </>,
      <>
        <b>웹 앱으로 열기</b>가 보이면 켜 두고, 오른쪽 위 <b>추가</b>를 눌러요.
      </>,
    ],
  },
  'ios-chrome': {
    where: '아이폰 크롬',
    steps: [
      <>
        주소창 오른쪽의 <Share aria-label="공유" className={styles.inline} /> <b>공유</b> 버튼을 눌러요.
      </>,
      <>
        메뉴를 내려 <PlusSquare aria-hidden className={styles.inline} /> <b>홈 화면에 추가</b>를 눌러요.
      </>,
      <>
        이름이 <b>북로그</b>인지 확인하고 <b>추가</b>를 눌러요.
      </>,
    ],
  },
  'ios-other': {
    where: '아이폰',
    steps: [
      <>
        <b>사파리</b>나 <b>크롬</b>에서 이 주소를 열어 주세요. 지금 브라우저에서는 홈 화면에 추가할 수 없어요.
      </>,
      <>
        <Share aria-label="공유" className={styles.inline} /> <b>공유</b> → <b>홈 화면에 추가</b>를 눌러요.
      </>,
    ],
  },
  android: {
    where: '안드로이드 크롬',
    steps: [
      <>
        오른쪽 위 <EllipsisVertical aria-label="메뉴" className={styles.inline} /> 메뉴를 눌러요.
      </>,
      <>
        <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요.
      </>,
      <>
        <b>설치</b>(또는 <b>추가</b>)를 누르면 홈 화면에 북로그가 생겨요.
      </>,
    ],
  },
  desktop: {
    where: 'PC',
    steps: [
      <>휴대폰 브라우저에서 이 주소를 열고, 홈 화면에 추가하면 앱처럼 쓸 수 있어요.</>,
      <>PC 크롬·엣지는 주소창 오른쪽의 설치 아이콘으로도 설치할 수 있어요.</>,
    ],
  },
};

function Steps({ platform }: { platform: Platform }) {
  const guide = STEPS[platform];
  const inApp = isInAppBrowser();
  return (
    <div className={styles.guide}>
      {inApp && <p className={styles.warn}>카카오톡·인스타그램 안에서 연 화면에서는 추가할 수 없어요. 오른쪽 아래(또는 위) 메뉴에서 ‘다른 브라우저로 열기’를 먼저 눌러 주세요.</p>}
      <p className={styles.where}>{guide.where}에서</p>
      <ol className={styles.steps}>
        {guide.steps.map((s, i) => (
          <li key={i}>
            <span className={styles.no}>{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 설치 버튼 (바로 설치 가능하면 설치 창, 아니면 방법 안내 시트) */
function useInstallAction() {
  const canPrompt = useInstall((s) => s.canPrompt);
  const promptInstall = useInstall((s) => s.promptInstall);
  const showToast = useToast((s) => s.show);
  const [open, setOpen] = useState(false);
  const run = async () => {
    if (canPrompt) {
      const r = await promptInstall();
      if (r === 'accepted') showToast('홈 화면에 북로그를 추가했어요');
      if (r !== 'unavailable') return;
    }
    setOpen(true);
  };
  return { canPrompt, open, setOpen, run };
}

function GuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="홈 화면에 추가하기" description="한 번 추가하면 아이콘을 눌러 앱처럼 바로 열 수 있어요.">
      <Steps platform={detectPlatform()} />
      <ul className={styles.perks}>
        <li>
          <Check aria-hidden /> 주소창 없이 전체 화면으로
        </li>
        <li>
          <Check aria-hidden /> 두 번째부터 더 빠르게 열려요
        </li>
        <li>
          <Check aria-hidden /> 사이트가 바뀌면 앱도 자동으로 최신
        </li>
      </ul>
    </Sheet>
  );
}

/** 설정 화면: 앱으로 쓰기 */
export function InstallPanel({ className }: { className?: string }) {
  const installed = useInstall((s) => s.installed);
  const { canPrompt, open, setOpen, run } = useInstallAction();
  return (
    <section className={className} aria-labelledby="install-title">
      <div className={styles.head}>
        <Smartphone aria-hidden />
        <h2 id="install-title">앱으로 쓰기</h2>
      </div>
      {installed ? (
        <p className={styles.done}>
          <Check aria-hidden /> 홈 화면 앱으로 쓰고 있어요.
        </p>
      ) : (
        <>
          <p className={styles.desc}>홈 화면에 북로그를 추가하면 앱처럼 아이콘을 눌러 바로 열 수 있어요. 설치할 파일은 없어요.</p>
          <Button size="sm" variant="outline" leadingIcon={<PlusSquare aria-hidden />} onClick={() => void run()}>
            {canPrompt ? '홈 화면에 추가' : '추가하는 방법 보기'}
          </Button>
        </>
      )}
      <GuideSheet open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

const DISMISS_KEY = 'booklog:install-banner-dismissed';

/** 홈 화면: 휴대폰 브라우저로 처음 온 사람에게 한 번 보여 주는 안내 (닫으면 다시 안 보임) */
export function InstallBanner() {
  const installed = useInstall((s) => s.installed);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { canPrompt, open, setOpen, run } = useInstallAction();
  const mobile = detectPlatform() !== 'desktop';
  if (installed || hidden || !mobile) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* 저장 못 해도 이번엔 닫힘 */
    }
  };
  return (
    <aside className={styles.banner} aria-label="앱으로 쓰기 안내">
      <img src="/icons/icon-192.png" alt="" className={styles.icon} />
      <div className={styles.bannerText}>
        <strong>앱처럼 쓰기</strong>
        <span>홈 화면에 추가해요</span>
      </div>
      <Button size="sm" onClick={() => void run()}>
        {canPrompt ? '추가' : '방법 보기'}
      </Button>
      <IconButton label="안내 닫기" size="sm" onClick={dismiss} className={styles.close}>
        <X />
      </IconButton>
      <GuideSheet open={open} onClose={() => setOpen(false)} />
    </aside>
  );
}
