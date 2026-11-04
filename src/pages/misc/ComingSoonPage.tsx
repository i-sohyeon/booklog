import { Check } from 'lucide-react';
import { paths } from '@/routes/paths';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, ButtonLink } from '@/components/ui';
import styles from './ComingSoonPage.module.scss';

export interface ComingSoonProps {
  eyebrow: string;
  title: string;
  summary: string;
  /** 이 화면에서 제공될 기능 (정보 구조 설계 기준) */
  features: string[];
  phase: string;
  back?: boolean;
}

/**
 * 1차 개발 범위 밖 화면.
 * 실제로 동작하지 않는 UI를 흉내내지 않고, 설계된 기능 범위와 예정 단계를 명확히 안내합니다.
 */
export function ComingSoonPage({ eyebrow, title, summary, features, phase, back }: ComingSoonProps) {
  return (
    <Page narrow>
      <PageHeader eyebrow={eyebrow} title={title} back={back} />
      <section className={styles.card} aria-labelledby="soon-title">
        <Badge tone="brand">{phase} 개발 예정</Badge>
        <h2 id="soon-title" className={styles.heading}>
          {summary}
        </h2>
        <p className={styles.lead}>이 화면에서는 다음 기능을 제공할 예정이에요.</p>
        <ul role="list" className={styles.list}>
          {features.map((f) => (
            <li key={f}>
              <Check aria-hidden />
              {f}
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <ButtonLink to={paths.library} variant="outline">
            내 서재로
          </ButtonLink>
          <ButtonLink to={paths.home}>홈으로</ButtonLink>
        </div>
      </section>
    </Page>
  );
}
