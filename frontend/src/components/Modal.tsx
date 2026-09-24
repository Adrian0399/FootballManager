import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  /** Whether the modal is currently open. */
  open: boolean;
  /** Called when the user dismisses (backdrop click, Escape, X button). */
  onClose: () => void;
  /** Optional title rendered as the modal header. */
  title?: string;
  /** Optional subtitle/description under the title. */
  description?: string;
  /** Modal body — typically a form. */
  children: ReactNode;
  /** Optional footer (action buttons). */
  footer?: ReactNode;
  /** When true, clicking the backdrop does NOT close the modal. */
  disableBackdropClose?: boolean;
  /** `lg` (default) or `sm` for tighter dialogs (e.g. confirm). */
  size?: 'sm' | 'lg';
}

/**
 * Resolve the DOM node we portal the modal into.
 *
 * The design-system styles are all scoped under `.kaibil-app` (see
 * `frontend/README.md` §2). If we portalled to `document.body`, the
 * modal content (buttons, inputs, banners…) would be OUTSIDE that
 * scope and would render unstyled — default browser buttons and inputs.
 *
 * We portal into the `.kaibil-app` shell instead, so the modal content
 * inherits the scope and looks identical to the rest of the app. We
 * fall back to `document.body` for tests or any future page that
 * doesn't wrap its content in `.kaibil-app`.
 */
function getPortalTarget(): HTMLElement {
  // SSR / test safety: if `document` isn't available, return a sentinel
  // — but in practice this code only runs in the browser since the
  // modal is mounted from a user interaction.
  const fallback = document.body as HTMLElement;
  return document.querySelector('.kaibil-app') ?? fallback;
}

/**
 * Reusable modal dialog. Rendered through a portal so it always sits on top
 * of the app shell and never gets clipped by ancestor overflow.
 *
 * Closes on:
 *   - Backdrop click (unless `disableBackdropClose`)
 *   - Escape key
 *   - The X button (always)
 *
 * Body scroll is locked while the modal is open to avoid background
 * movement on mobile.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  disableBackdropClose,
  size = 'lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (disableBackdropClose) return;
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {(title || description) && (
          <header className="modal__header">
            <div className="stack-2">
              {title && <h2 className="modal__title">{title}</h2>}
              {description && <p className="modal__desc muted">{description}</p>}
            </div>
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </header>
        )}
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    getPortalTarget(),
  );
}
