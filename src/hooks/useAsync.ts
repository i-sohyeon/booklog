import type { DependencyList } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/**
 * AbortSignal을 지원하는 비동기 로더.
 * deps가 바뀌면 이전 요청을 취소하고 새로 요청합니다.
 */
export function useAsync<T>(
  fn: ((signal: AbortSignal) => Promise<T>) | null,
  deps: DependencyList,
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: fn ? 'loading' : 'idle' });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const run = fnRef.current;
    if (!run) {
      setState({ status: 'idle' });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    run(ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}
