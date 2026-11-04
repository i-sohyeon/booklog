import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Info } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { paths } from '@/routes/paths';
import { Logo } from '@/components/layout/Logo';
import styles from './AuthLayout.module.scss';

interface AuthLayoutProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** 인증 화면 공통 — 데스크톱: 좌측 브랜드 패널 / 모바일: 단일 컬럼 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.brand} aria-hidden>
        <Logo />
        <div className={styles.brandCopy}>
          <p className={styles.brandLead}>
            한 페이지씩,
            <br />
            나의 독서를 쌓아가는 곳
          </p>
          <p className={styles.brandSub}>읽은 책과 남긴 문장이 모여 나만의 서재가 됩니다.</p>
        </div>
        <div className={styles.spines}>
          {['plum', 'ochre', 'sage', 'clay', 'navy', 'plum2', 'ink'].map((c) => (
            <span key={c} data-c={c} />
          ))}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.top}>
          <Link to={paths.home} className={styles.back}>
            <ArrowLeft aria-hidden />
            둘러보기로
          </Link>
          <span className={styles.mobileLogo}>
            <Logo />
          </span>
        </div>
        <div className={styles.content}>
          <h1 className="t-title-1">{title}</h1>
          {description && <p className={styles.desc}>{description}</p>}
          {!isSupabaseConfigured && <NotConfiguredNotice />}
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}

function NotConfiguredNotice() {
  return (
    <div className={styles.notice} role="note">
      <Info aria-hidden />
      <p>
        <strong>계정 서버가 아직 연결되지 않았어요.</strong>
        <br />
        <code>.env.local</code>에 Supabase URL과 anon key를 설정하면 로그인과 회원가입을 사용할 수 있어요. 그 전까지 기록은 이 브라우저에만 저장돼요.
      </p>
    </div>
  );
}
