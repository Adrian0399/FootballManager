import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { Header } from './components/Header';
import { RouteFallback } from './components/RouteFallback';
import { useAuthStore } from './store/auth.store';

// Each page is its own chunk: the initial download only carries the shell
// (router, header, auth guard) plus the route the user actually lands on.
// The pages all use named exports, hence the `.then` remap to `default`.
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const FieldsPage = lazy(() =>
  import('./pages/FieldsPage').then((m) => ({ default: m.FieldsPage })),
);
const LeaguesPage = lazy(() =>
  import('./pages/LeaguesPage').then((m) => ({ default: m.LeaguesPage })),
);
const LeagueDetailPage = lazy(() =>
  import('./pages/LeagueDetailPage').then((m) => ({ default: m.LeagueDetailPage })),
);
const LeagueTeamsPage = lazy(() =>
  import('./pages/LeagueTeamsPage').then((m) => ({ default: m.LeagueTeamsPage })),
);
const LeagueFixturePage = lazy(() =>
  import('./pages/LeagueFixturePage').then((m) => ({ default: m.LeagueFixturePage })),
);
const LeagueStandingsPage = lazy(() =>
  import('./pages/LeagueStandingsPage').then((m) => ({ default: m.LeagueStandingsPage })),
);
const LeagueStatsPage = lazy(() =>
  import('./pages/LeagueStatsPage').then((m) => ({ default: m.LeagueStatsPage })),
);
const LeagueKnockoutPage = lazy(() =>
  import('./pages/LeagueKnockoutPage').then((m) => ({ default: m.LeagueKnockoutPage })),
);
const TeamsPage = lazy(() =>
  import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })),
);
const TeamDetailPage = lazy(() =>
  import('./pages/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage })),
);
const MatchDetailPage = lazy(() =>
  import('./pages/MatchDetailPage').then((m) => ({ default: m.MatchDetailPage })),
);
const PlayerProfilePage = lazy(() =>
  import('./pages/PlayerProfilePage').then((m) => ({ default: m.PlayerProfilePage })),
);
const RefereeProfilePage = lazy(() =>
  import('./pages/RefereeProfilePage').then((m) => ({ default: m.RefereeProfilePage })),
);
const UsersPage = lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const AuditPage = lazy(() =>
  import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })),
);
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const DesignPlayground = lazy(() =>
  import('./playground/DesignPlayground').then((m) => ({ default: m.DesignPlayground })),
);

/**
 * Suspense boundary placed *inside* the layout, so fetching a new route
 * chunk swaps only the page body — the header stays mounted.
 */
function RouteBoundary({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="kaibil-app">
      <Header />
      <RouteBoundary>{children}</RouteBoundary>
    </div>
  );
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const hasSession = useAuthStore((s) => Boolean(s.accessToken && s.user));
  if (hasSession) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const ROUTES = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  // Design system playground — previsualiza tokens sin tocar páginas reales.
  {
    path: '/design',
    element: (
      <RouteBoundary>
        <DesignPlayground />
      </RouteBoundary>
    ),
  },
  {
    path: '/404',
    element: (
      <RouteBoundary>
        <NotFoundPage />
      </RouteBoundary>
    ),
  },
  {
    path: '/login',
    element: (
      <PublicOnly>
        <RouteBoundary>
          <LoginPage />
        </RouteBoundary>
      </PublicOnly>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnly>
        <RouteBoundary>
          <RegisterPage />
        </RouteBoundary>
      </PublicOnly>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/dashboard',
        element: (
          <Shell>
            <DashboardPage />
          </Shell>
        ),
      },
      {
        path: '/profile',
        element: (
          <Shell>
            <ProfilePage />
          </Shell>
        ),
      },
      {
        path: '/fields',
        element: (
          <Shell>
            <FieldsPage />
          </Shell>
        ),
      },
      {
        path: '/leagues',
        element: (
          <Shell>
            <LeaguesPage />
          </Shell>
        ),
      },
      {
        path: '/leagues/:id',
        element: (
          <Shell>
            <LeagueDetailPage />
          </Shell>
        ),
      },
      {
        path: '/leagues/:id/teams',
        element: (
          <Shell>
            <LeagueTeamsPage />
          </Shell>
        ),
      },
      {
        path: '/leagues/:id/fixture',
        element: (
          <Shell>
            <LeagueFixturePage />
          </Shell>
        ),
      },
      {
        path: '/leagues/:id/standings',
        element: (
          <Shell>
            <LeagueStandingsPage />
          </Shell>
        ),
      },
      {
        path: '/leagues/:id/stats',
        element: (
          <Shell>
            <LeagueStatsPage />
          </Shell>
        ),
      },
      {
        path: '/leagues/:id/knockout',
        element: (
          <Shell>
            <LeagueKnockoutPage />
          </Shell>
        ),
      },
      {
        path: '/teams',
        element: (
          <Shell>
            <TeamsPage />
          </Shell>
        ),
      },
      {
        path: '/teams/:id',
        element: (
          <Shell>
            <TeamDetailPage />
          </Shell>
        ),
      },
      {
        path: '/users',
        element: (
          <Shell>
            <UsersPage />
          </Shell>
        ),
      },
      {
        path: '/audit',
        element: (
          <Shell>
            <AuditPage />
          </Shell>
        ),
      },
      {
        path: '/calendar',
        element: (
          <Shell>
            <CalendarPage />
          </Shell>
        ),
      },
      {
        path: '/matches/:id',
        element: (
          <Shell>
            <MatchDetailPage />
          </Shell>
        ),
      },
      {
        path: '/players/:id',
        element: (
          <Shell>
            <PlayerProfilePage />
          </Shell>
        ),
      },
      {
        path: '/referees/:id',
        element: (
          <Shell>
            <RefereeProfilePage />
          </Shell>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/404" replace /> },
];

export const router = createBrowserRouter(ROUTES, {
  // Mounts the router under the app's public base path so it works both at
  // the domain root and under a GitHub Pages project subpath
  // (e.g. /FootballManager/), which sets VITE_BASE_PATH.
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});