import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '../hooks/useIsAdmin';
import {
  useTeam,
  useTeamMembers,
  useLeague,
  useUserTeams,
} from '../hooks/teams';
import { useAuthStore } from '../store/auth.store';
import { TeamBadge } from '../components/TeamBadge';
import { RosterList } from '../components/RosterList';
import { StaffBlock } from '../components/StaffBlock';
import { TeamForm } from '../components/TeamForm';
import { AddTeamMemberForm } from '../components/AddTeamMemberForm';
import { Modal } from '../components/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { FORMAT_LABEL, TIME_SLOT_LABEL, WEEK_DAY_SHORT } from '../types/league';
import type { TeamMemberPublic } from '../types/team';

type Tab = 'roster' | 'staff' | 'matches' | 'stats';

/**
 * /teams/:id — team detail with tabs.
 *
 * - **Plantilla**: roster (players only), sorted by position + jersey.
 * - **Cuerpo técnico**: DT + Assistants.
 * - **Partidos**: empty state for now. Wire to useMatches in Paso 6.
 * - **Estadísticas**: empty state for now. Wire to useTeamStats in Paso 8.
 *
 * Admin can edit the team via the in-page TeamForm modal.
 */
export function TeamDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const currentUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('roster');
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState<string | null>(null);

  const { data: team, isLoading, error, refetch: refetchTeam } = useTeam(id);
  const { data: members, refetch: refetchMembers } = useTeamMembers(id);
  const { data: league } = useLeague(team?.currentLeagueId ?? null);
  // Teams where the current user is DT/Assistant (for the can-manage check).
  const myTeamsQuery = useUserTeams(currentUser?.id ?? null);
  const myManagedTeamIds = useMemo(
    () =>
      (myTeamsQuery.data ?? [])
        .filter((t) => t.membership.membershipRole === 'DT')
        .map((t) => t.id),
    [myTeamsQuery.data],
  );
    isAdmin || myManagedTeamIds.includes(id);

  // Bucket the memberships by role. The backend already flattens the user
  // name into each member row (`TeamMemberPublic`), so no user lookup needed.
  const { players, staff, dtUser } = useMemo(() => {
    const players: TeamMemberPublic[] = [];
    const staff: TeamMemberPublic[] = [];
    let dtUser: TeamMemberPublic | null = null;
    for (const m of members ?? []) {
      if (m.membershipRole === 'PLAYER') players.push(m);
      else {
        staff.push(m);
        if (m.membershipRole === 'DT') dtUser = m;
      }
    }
    return { players, staff, dtUser };
  }, [members]);

  const refreshTeam = () => {
    refetchTeam();
    refetchMembers();
  };

  if (isLoading && !team) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando equipo…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container section-stack">
        <Banner tone="error">{error.message}</Banner>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container section-stack">
        <EmptyState
          title="Equipo no encontrado"
          description="El equipo que buscas no existe o fue eliminado."
          actions={
            <Button variant="ghost" onClick={() => navigate('/teams')}>
              ← Volver a equipos
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container section-stack">
      {/* ----- Header ----- */}
      <PageHeader
        title={team.name}
        description={
          league
            ? `${league.name} · ${league.season ?? ''}`
            : 'Sin liga asignada'
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate('/teams')}>
              ← Equipos
            </Button>
            {isAdmin && (
              <Button variant="cyan" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )}
            {isAdmin && (
              <Button variant="lime" onClick={() => setAddMemberOpen(true)}>
                Agregar miembro
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <div className="team-detail__hero">
          <TeamBadge team={team} size="xl" />
          <div className="team-detail__hero-body">
            <h2 style={{ fontSize: 'var(--text-2xl)' }}>{team.name}</h2>
            <div className="row-3 row-wrap" style={{ marginTop: 'var(--space-2)' }}>
              {team.currentLeagueFormat && (
                <Chip tone="default">{FORMAT_LABEL[team.currentLeagueFormat]}</Chip>
              )}
              {league?.category && <Chip tone="ref">{league.category}</Chip>}
              {league?.dayOfWeek && (
                <Chip tone="cyan">
                  {WEEK_DAY_SHORT[league.dayOfWeek]}
                  {league.timeSlot ? ` · ${TIME_SLOT_LABEL[league.timeSlot]}` : ''}
                </Chip>
              )}
              {dtUser && (
                <Chip tone="td">
                  DT: {dtUser.firstName} {dtUser.paternalSurname}
                </Chip>
              )}
            </div>
            <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
              {players.length} jugadores · {staff.length} cuerpo técnico
            </p>
          </div>
        </div>
      </Card>

      {/* ----- Tabs ----- */}
      <div className="tabs" role="tablist">
        <TabButton active={tab === 'roster'} onClick={() => setTab('roster')}>
          Plantilla ({players.length})
        </TabButton>
        <TabButton active={tab === 'staff'} onClick={() => setTab('staff')}>
          Cuerpo técnico ({staff.length})
        </TabButton>
        <TabButton active={tab === 'matches'} onClick={() => setTab('matches')}>
          Partidos
        </TabButton>
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
          Estadísticas
        </TabButton>
      </div>

      {tab === 'roster' && (
        <Card>
          <RosterList memberships={players} />
        </Card>
      )}

      {tab === 'staff' && (
        <Card>
          <StaffBlock memberships={staff} />
        </Card>
      )}

      {tab === 'matches' && (
        <EmptyState
          title="Próximamente"
          description="El historial y los próximos partidos del equipo se mostrarán aquí cuando esté listo el módulo de partidos (Paso 6)."
        />
      )}

      {tab === 'stats' && (
        <EmptyState
          title="Próximamente"
          description="Las estadísticas agregadas del equipo (goles, victorias, fair play) se mostrarán aquí cuando esté listo el módulo de stats (Paso 8)."
        />
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar equipo"
        description={team.name}
      >
        <TeamForm
          team={team}
          onSaved={() => {
            setEditOpen(false);
            refreshTeam();
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Agregar miembro"
        description={team.name}
      >
        <AddTeamMemberForm
          team={team}
          existingUserIds={(members ?? []).map((m) => m.userId)}
          onAdded={() => {
            setAddMemberOpen(false);
            refetchMembers();
          }}
          onCancel={() => setAddMemberOpen(false)}
        />
      </Modal>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tabs__btn ${active ? 'tabs__btn--active' : ''}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
