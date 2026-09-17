import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Page title — renders as an `<h1>`. */
  title: string;
  /** Optional supporting copy under the title. */
  description?: ReactNode;
  /** Right-aligned actions (usually a `<Button>` for the primary CTA). */
  actions?: ReactNode;
}

/**
 * Standard header for a list / detail page. Renders the title, an
 * optional muted description, and a right-aligned slot for actions
 * (typically a "Create" button gated by `useIsAdmin`).
 *
 * Wraps the design-system `row-3 row-between row-wrap` pattern so
 * consumers don't have to remember the utility class names.
 *
 * @example
 *   <PageHeader
 *     title="Ligas"
 *     description="Crea, edita o elimina ligas y sus canchas asociadas."
 *     actions={isAdmin && <Button onClick={openCreate}>+ Crear liga</Button>}
 *   />
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header
      className="row-3 row-between row-wrap"
      style={{ alignItems: 'center' }}
    >
      <div className="stack-2">
        <h1 style={{ fontSize: 'var(--text-3xl)' }}>{title}</h1>
        {description !== undefined && (
          <p className="muted" style={{ margin: 0 }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="row-3 row-wrap">{actions}</div>}
    </header>
  );
}
