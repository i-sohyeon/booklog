import { useCallback, useState } from 'react';

const KEY = 'booklog:recent-searches';
const LIMIT = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 저장 불가 환경(프라이빗 모드 등) 무시 */
  }
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(read);

  const add = useCallback((q: string) => {
    const term = q.trim();
    if (!term) return;
    setItems((prev) => {
      const next = [term, ...prev.filter((x) => x !== term)].slice(0, LIMIT);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((q: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x !== q);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { items, add, remove, clear };
}
