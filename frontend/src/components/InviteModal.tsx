import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { invitesApi, inviteLink } from '../api/invites';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Banner } from './ui/Banner';

interface InviteModalProps {
  teamId: string;
  teamName: string;
  /** Whether the inviter may also invite a DT (ADMIN or current DT). */
  canInviteDT: boolean;
  onClose: () => void;
}

/**
 * Generates a one-time invitation for a team: a shareable link + a QR
 * code. The role (PLAYER/DT) is carried in the token, so whoever
 * registers with it gets that role locked and a membership auto-created.
 */
export function InviteModal({ teamId, teamName, canInviteDT, onClose }: InviteModalProps) {
  const [role, setRole] = useState<'PLAYER' | 'DT'>('PLAYER');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = token ? inviteLink(token) : '';

  async function generate() {
    setError(null);
    try {
      const created = await invitesApi.create(teamId, role);
      setToken(created.token);
    } catch (err) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'No se pudo generar la invitación');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('No se pudo copiar al portapapeles');
    }
  }

  const roleLabel = role === 'DT' ? 'Director Técnico' : 'Jugador';

  return (
    <Modal
      open
      onClose={onClose}
      title={`Invitar a ${teamName}`}
      description="Comparte el enlace o el código QR. Quien se registre quedará como miembro de este equipo con el rol indicado."
    >
      <div className="stack-3">
        {!token ? (
          <>
            <Select
              id="invite-role"
              label="Rol del invitado"
              value={role}
              onChange={(e) => setRole(e.target.value as 'PLAYER' | 'DT')}
            >
              <option value="PLAYER">Jugador</option>
              {canInviteDT && <option value="DT">Director Técnico</option>}
            </Select>
            <Button size="sm" onClick={generate}>
              Generar invitación
            </Button>
          </>
        ) : (
          <>
            <div className="invite-role-badge">Rol: {roleLabel}</div>

            <div className="invite-qr">
              <QRCodeSVG value={link} size={180} level="M" />
            </div>

            <div className="invite-link">
              <code className="mono">{link}</code>
            </div>

            {error && <Banner tone="error">{error}</Banner>}

            <div className="row-3 row-wrap">
              <Button size="sm" variant="cyan" onClick={copy}>
                {copied ? '¡Copiado!' : 'Copiar enlace'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setToken(null)}>
                Generar otro
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}