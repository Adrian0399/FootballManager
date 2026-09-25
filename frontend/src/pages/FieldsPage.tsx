import { useCallback, useEffect, useState } from 'react';
import { fieldsApi } from '../api/fields';
import type { Field } from '../types/field';
import type { ErrorEnvelope } from '../types/user';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { FieldForm } from '../components/FieldForm';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * Canchas (Fields) — list + admin-only create/edit/delete.
 *
 * Read access for any authenticated user. Mutating actions are gated by
 * `useIsAdmin()` (UI nicety); the backend independently enforces
 * `authorize('ADMIN')` on POST/PATCH/DELETE.
 */
export function FieldsPage() {
  const isAdmin = useIsAdmin();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modal, setModal] = useState<
    | { kind: 'closed' }
    | { kind: 'create' }
    | { kind: 'edit'; field: Field }
    | { kind: 'delete'; field: Field }
  >({ kind: 'closed' });

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await fieldsApi.list();
      setFields(list);
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      setLoadError(apiError?.error?.message ?? 'No se pudieron cargar las canchas');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const closeModal = () => setModal({ kind: 'closed' });

  const handleSaved = () => {
    closeModal();
    void reload();
  };

  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    await fieldsApi.remove(modal.field.id);
  };

  return (
    <div className="container section-stack">
      <PageHeader
        title="Canchas"
        description={
          isAdmin
            ? 'Crea, edita o elimina canchas de la liga.'
            : 'Lista de canchas disponibles. Solo un admin puede modificarlas.'
        }
        actions={
          isAdmin && (
            <Button onClick={() => setModal({ kind: 'create' })}>
              + Crear cancha
            </Button>
          )
        }
      />

      {loadError && <Banner tone="error">{loadError}</Banner>}

      {fields === null && !loadError && (
        <p className="muted">Cargando canchas…</p>
      )}

      {fields && fields.length === 0 && !loadError && (
        <EmptyState
          title="Sin canchas todavía"
          description={
            isAdmin
              ? 'Crea la primera cancha para empezar.'
              : 'Pídele a un admin que registre al menos una cancha.'
          }
          actions={
            isAdmin && (
              <Button onClick={() => setModal({ kind: 'create' })}>
                + Crear cancha
              </Button>
            )
          }
        />
      )}

      {fields && fields.length > 0 && (
        <div className="grid-cards">
          {fields.map((f) => (
            <Card key={f.id} as="article" className="collection-card">
              <div className="collection-card__title">
                <FieldIcon style={{ color: 'var(--color-magenta)', fontSize: '1.4em' }} />
                <h3 style={{ fontSize: 'var(--text-xl)' }}>{f.name}</h3>
              </div>
              <div className="collection-card__meta">
                {f.address && <span>📍 {f.address}</span>}
                {f.capacity !== null && <span>👥 Capacidad: {f.capacity}</span>}
                {f.description && <span>{f.description}</span>}
                <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  ID: <code className="mono">{f.id}</code>
                </span>
              </div>
              {isAdmin && (
                <div className="collection-card__actions">
                  <Button
                    size="sm"
                    variant="cyan"
                    onClick={() => setModal({ kind: 'edit', field: f })}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="coral"
                    onClick={() => setModal({ kind: 'delete', field: f })}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modal.kind === 'create'}
        onClose={closeModal}
        title="Crear cancha"
        description="Da de alta una nueva cancha en el sistema."
      >
        <FieldForm onSaved={handleSaved} onCancel={closeModal} />
      </Modal>

      <Modal
        open={modal.kind === 'edit'}
        onClose={closeModal}
        title="Editar cancha"
        description={modal.kind === 'edit' ? modal.field.name : ''}
      >
        {modal.kind === 'edit' && (
          <FieldForm field={modal.field} onSaved={handleSaved} onCancel={closeModal} />
        )}
      </Modal>

      <ConfirmDialog
        open={modal.kind === 'delete'}
        title="¿Eliminar cancha?"
        message={
          modal.kind === 'delete'
            ? `Vas a hacer soft-delete de "${modal.field.name}". No se mostrará en los listados pero los partidos históricos la siguen referenciando.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={closeModal}
      />
    </div>
  );
}
