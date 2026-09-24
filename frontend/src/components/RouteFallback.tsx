/**
 * Suspense fallback shown while a lazily loaded route chunk is fetched.
 *
 * It reuses the existing `.app-boot` bootstrap styles (same markup as the
 * initial session-restore screen in `App.tsx`), so the loading state looks
 * exactly like what the user already sees on first paint — no new visual
 * language and no extra CSS.
 */
export function RouteFallback() {
  return (
    <div className="app-boot" role="status" aria-live="polite">
      <div className="app-boot__spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}