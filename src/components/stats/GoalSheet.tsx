import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { Button, IconButton, Sheet, useToast } from '@/components/ui';
import styles from './GoalSheet.module.scss';

const PRESETS = [12, 24, 36, 52];

export function GoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <GoalSheetInner onClose={onClose} />;
}

function GoalSheetInner({ onClose }: { onClose: () => void }) {
  const goal = useLibraryStore((s) => s.goal);
  const setGoal = useLibraryStore((s) => s.setGoal);
  const showToast = useToast((s) => s.show);
  const [value, setValue] = useState(goal.targetBooks);
  const id = useId();
  const clamp = (n: number) => Math.max(1, Math.min(365, n));

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${goal.year}년 독서 목표`}
      description="올해 몇 권을 완독하고 싶나요?"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => {
              setGoal(value);
              showToast(`올해 목표를 ${value}권으로 정했어요`);
              onClose();
            }}
          >
            저장
          </Button>
        </>
      }
    >
      <div className={styles.stepper}>
        <IconButton label="1권 줄이기" variant="soft" onClick={() => setValue((v) => clamp(v - 1))} disabled={value <= 1}>
          <Minus />
        </IconButton>
        <label htmlFor={id} className={styles.valueWrap}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={value}
            onChange={(e) => setValue(clamp(Number(e.target.value) || 1))}
            className={styles.value}
          />
          <span>권</span>
        </label>
        <IconButton label="1권 늘리기" variant="soft" onClick={() => setValue((v) => clamp(v + 1))} disabled={value >= 365}>
          <Plus />
        </IconButton>
      </div>
      <p className={styles.pace}>한 달에 약 {(value / 12).toFixed(1)}권, 일주일에 약 {(value / 52).toFixed(1)}권</p>
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button key={p} type="button" className={styles.preset} aria-pressed={value === p} onClick={() => setValue(p)}>
            {p}권
          </button>
        ))}
      </div>
    </Sheet>
  );
}
