// Generic async-loading hook used by every data hook in the app.
//
// The hook runs `loader(key)` on mount (and whenever `key` changes) and
// returns `{ data, isLoading, error }`. The contract is identical to a
// real API call — swap the `asyncResolve(MOCK_X)` body in your data hook
// for `apiClient.get(...).then(r => r.data.data)` and the UI is unaffected.
//
// Why this lives in its own file:
//   - One single source of truth for loading-state semantics.
//   - The previous inline copy (in `profile.ts`) had a subtle bug where
//     inline `loader` closures caused the effect to re-run on every
//     render → infinite loading loop. The ref-stable version below is
//     the fix (see the `loaderRef` dance).
//
// Why the second arg is `key: string` (not `userId`):
//   - Lets us key data by anything (userId, teamId, leagueId, …) without
//     forking the hook per domain.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  /** Re-runs the loader (e.g. after a mutation). Additive — safe to ignore. */
  refetch: () => void;
}

/** Resolve a value with a tiny delay so the loading state is observable. */
export function asyncResolve<T>(value: T, ms = 0): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Runs `loader(key)` on mount and when `key` changes. Tracks loading
 * state, errors, and unmount safety.
 *
 * The loader is stored in a ref so the effect only re-runs when `key`
 * changes, not on every parent re-render. This matters because the
 * public hooks usually create the loader inline — without the ref, each
 * render would produce a new loader function and re-trigger the effect
 * forever.
 */
export function useAsync<T>(
  loader: (key: string) => Promise<T>,
  key: string,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
    refetch: () => {},
  });
  const [reloadToken, setReloadToken] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, data: null, isLoading: true, error: null }));
    loaderRef.current(key)
      .then((data) => {
        if (!cancelled) setState((prev) => ({ ...prev, data, isLoading: false, error: null }));
      })
      .catch((error: Error) => {
        if (!cancelled) setState((prev) => ({ ...prev, data: null, isLoading: false, error }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { ...state, refetch };
}
