import { create } from 'zustand';
import { Check } from 'lucide-react';
import styles from './Toast.module.scss';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastStore {
  items: ToastItem[];
  show: (message: string) => void;
}

let seq = 0;

export const useToast = create<ToastStore>((set) => ({
  items: [],
  show: (message) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items.slice(-2), { id, message }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2600);
  },
}));

export function ToastViewport() {
  const items = useToast((s) => s.items);
  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={styles.toast}>
          <Check aria-hidden />
          {t.message}
        </div>
      ))}
    </div>
  );
}
