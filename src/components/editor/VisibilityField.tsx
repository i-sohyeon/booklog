import { Globe2, Lock, Users } from 'lucide-react';
import type { Visibility } from '@/types/book';
import { VISIBILITY_LABEL } from '@/types/book';
import { SegmentedControl } from '@/components/ui';
import styles from './BookContext.module.scss';

const ICONS = { private: Lock, friends: Users, public: Globe2 } as const;

export function VisibilityIcon({ value }: { value: Visibility }) {
  const Icon = ICONS[value];
  return <Icon aria-hidden />;
}

export function VisibilityField({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <div>
      <SegmentedControl
        label="공개 범위"
        value={value}
        onChange={onChange}
        options={[
          { value: 'private', label: VISIBILITY_LABEL.private, icon: <Lock aria-hidden /> },
          { value: 'friends', label: VISIBILITY_LABEL.friends, icon: <Users aria-hidden /> },
          { value: 'public', label: VISIBILITY_LABEL.public, icon: <Globe2 aria-hidden /> },
        ]}
      />
      <p className={styles.visHint}>
        친구 · 전체 공개 기록은 소셜 기능이 열리면 피드와 프로필에 표시돼요. 지금은 나에게만 보여요.
      </p>
    </div>
  );
}
