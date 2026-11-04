import { Link } from 'react-router';
import { FlaskConical } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { paths } from '@/routes/paths';
import styles from './SampleDataBadge.module.scss';

/** 샘플(임시) 데이터로 표시 중임을 항상 알려주는 배지 */
export function SampleDataBadge() {
  const isSample = useLibraryStore((s) => s.dataSource === 'sample');
  if (!isSample) return null;
  return (
    <Link to={`${paths.me}#data`} className={styles.badge} title="샘플 데이터로 표시 중입니다. 마이페이지에서 비울 수 있어요.">
      <FlaskConical aria-hidden />
      샘플 데이터
    </Link>
  );
}
