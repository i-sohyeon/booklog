import { create } from 'zustand';
import type { Book } from '@/types/book';

export type RecordStep = 'pick' | 'status' | 'finish';

interface RecordState {
  open: boolean;
  book: Book | null;
  step: RecordStep;
  /** 어디서든 "+"로 열기. 책이 정해져 있으면 바로 다음 단계로 */
  start: (opts?: { book?: Book; step?: RecordStep }) => void;
  setBook: (book: Book) => void;
  setStep: (step: RecordStep) => void;
  close: () => void;
}

export const useRecord = create<RecordState>((set) => ({
  open: false,
  book: null,
  step: 'pick',
  start: (opts) => set({ open: true, book: opts?.book ?? null, step: opts?.step ?? (opts?.book ? 'status' : 'pick') }),
  setBook: (book) => set({ book, step: 'status' }),
  setStep: (step) => set({ step }),
  close: () => set({ open: false }),
}));
