import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AxiosError } from 'axios';
import { apiClient } from './api/axios';
import { useAuthStore } from './store/auth.store';
import { router } from './router';
import type { SuccessEnvelope, AuthPayload } from './types/user';

/** Max attempts and backoff base for the silent session restore. */
const REFRESH_MAX_ATTEMPTS = 4;
const REFRESH_BACKOFF_BASE_MS = 500;

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  // ----- Silent session restore -----
  // On every page load the in-memory access token is gone, but the
  // httpOnly refresh cookie survives. We call /auth/refresh once to
  // rehydrate the auth store. If it succeeds the user lands on the page
  // they tried to open; if it fails with a 4xx (no cookie / expired) we
  // land on /login.
  //
  // In dev, the backend boots in parallel with the frontend, so the
  // very first call can race against an unready server and get
  // ECONNREFUSED. We retry with linear backoff on network errors and on
  // 429 (transient rate limit); any other response from the server is
  // treated as the final answer.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const res = await apiClient.post<SuccessEnvelope<AuthPayload>>('/auth/refresh');
          if (!cancelled) {
            setAuth(res.data.data.user, res.data.data.accessToken);
          }
          return; // success — done
        } catch (err) {
          const axiosErr = err as AxiosError;
          const status = axiosErr?.response?.status;
          // 429 is transient, not "no session": the server is asking us to
          // slow down. Bailing out here would log the user out for opening
          // a few tabs, so we back off and retry like a network error.
          const isRetryable = !axiosErr?.response || status === 429;
          if (!isRetryable || attempt === REFRESH_MAX_ATTEMPTS) {
            // Server responded (4xx/5xx = no session, give up) or out of retries.
            return;
          }
          // Linear backoff: 500ms, 1000ms, 1500ms (×2 for 429).
          const factor = status === 429 ? 2 : 1;
          await new Promise((r) => setTimeout(r, REFRESH_BACKOFF_BASE_MS * attempt * factor));
        }
      }
    })().finally(() => {
      if (!cancelled) setBootstrapped(true);
    });

    return () => {
      cancelled = true;
    };
  }, [setAuth]);

  if (!bootstrapped) {
    return (
      <div className="app-boot">
        <div className="app-boot__spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}