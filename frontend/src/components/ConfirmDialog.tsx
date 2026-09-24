import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Banner } from './ui/Banner';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual style of the confirm button. `danger` is the default for deletes. */
  tone?: 'danger' | 'primary';
  /** Called when the user confirms. Should return a promise we can await. */
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * Small confirm dialog built on top of `<Modal>`. Used for destructive
 * actions like soft-deleting a league or a field. Owns its own loading
 * state so the caller doesn't have to.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message ?? 'Algo salió mal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      size="sm"
      disableBackdropClose={busy}
      footer={
        <div className="row-3 row-end row-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={tone === 'danger' ? 'coral' : 'primary'}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Eliminando…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
      {error && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Banner tone="error">{error}</Banner>
        </div>
      )}
    </Modal>
  );
}
