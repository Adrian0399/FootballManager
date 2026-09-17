import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Bold title — usually a short noun phrase ("Sin ligas todavía"). */
  title: string;
  /** Supporting copy explaining the empty state. */
  description?: ReactNode;
  /** Optional primary action (e.g. a "Create" button). */
  actions?: ReactNode;
}

/**
 * The dashed-border placeholder shown when a list is empty. Centralises
 * the spacing + typography so the list pages look consistent.
 *
 * @example
 *   <EmptyState
 *     title="Sin ligas todavía"
 *     description="Crea la primera liga y selecciónale al menos una cancha."
 *     actions={isAdmin && <Button onClick={openCreate}>+ Crear liga</Button>}
 *   />
 */
export function EmptyState({ title, description, actions }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description !== undefined && (
        <p className="muted" style={{ margin: 0 }}>
          {description}
        </p>
      )}
      {actions && (
        <div className="row-3 row-wrap" style={{ marginTop: 'var(--space-4)', justifyContent: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
