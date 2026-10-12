import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../api/axios';
import { useAuthStore } from '../store/auth.store';
import { registerSchema, type RegisterForm } from '../utils/validation';
import { invitesApi, type InviteResolved } from '../api/invites';
import {
  type ErrorEnvelope,
  type SuccessEnvelope,
  type AuthPayload,
  type UserRole,
} from '../types/user';
import { BallIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';

function toDateInputValue(isoDate: string): string {
  return isoDate.split('T')[0] ?? '';
}

/** Roles que el registro publico puede crear (ver validacion del backend). */
const PUBLIC_REGISTER_ROLES: UserRole[] = ['PLAYER', 'ASSISTANT'];

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  const [invite, setInvite] = useState<InviteResolved | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Resolve the invite (if present) to show the target team and lock the role.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    invitesApi
      .resolve(inviteToken)
      .then((r) => {
        if (!cancelled) setInvite(r);
      })
      .catch((err) => {
        if (!cancelled) {
          const e = err as { response?: { data?: { error?: { message?: string } } } };
          setInviteError(e.response?.data?.error?.message ?? 'Invitación inválida');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'PLAYER' as UserRole },
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    const payload = {
      ...data,
      nickname: data.nickname || undefined,
      inviteToken: inviteToken ?? undefined,
    };
    try {
      const res = await apiClient.post<SuccessEnvelope<AuthPayload>>(
        '/auth/register',
        payload,
      );
      setAuth(res.data.data.user, res.data.data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const error = err as { response?: { data?: ErrorEnvelope } };
      const apiError = error.response?.data?.error;
      if (apiError?.issues?.length) {
        setServerError(
          apiError.issues.map((i) => `${i.path}: ${i.message}`).join(' · '),
        );
      } else {
        setServerError(apiError?.message ?? 'Registration failed');
      }
    }
  };

  return (
    <div className="kaibil-app">
      <div className="auth-screen">
        <div className="bg-halftone auth-screen__bg" aria-hidden="true" />

        <div className="auth-screen__content">
          <Card variant="rare">
            <span
              className="sticker"
              style={{ position: 'relative', top: 'auto', right: 'auto' }}
            >
              ⚽ Registro
            </span>

            <h1
              style={{
                fontSize: 'var(--text-3xl)',
                marginTop: 'var(--space-3)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Crea tu cuenta
            </h1>
            <p className="muted" style={{ marginBottom: 'var(--space-5)' }}>
              Únete a la liga y empieza a jugar.
            </p>

            <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              {invite && (
                <Banner tone="success">
                  Invitación para unirte a <strong>{invite.team.name}</strong> como{' '}
                  <strong>{invite.role === 'DT' ? 'Director Técnico' : 'Jugador'}</strong>.
                </Banner>
              )}
              {inviteError && <Banner tone="error">{inviteError}</Banner>}

              <div className="form-grid-2">
                <TextField
                  id="firstName"
                  label="Nombre"
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
                <TextField
                  id="nickname"
                  label="Apodo (opcional)"
                  {...register('nickname')}
                />
              </div>

              <div className="form-grid-2">
                <TextField
                  id="paternalSurname"
                  label="Apellido paterno"
                  error={errors.paternalSurname?.message}
                  {...register('paternalSurname')}
                />
                <TextField
                  id="maternalSurname"
                  label="Apellido materno"
                  error={errors.maternalSurname?.message}
                  {...register('maternalSurname')}
                />
              </div>

              <div className="form-grid-2">
                <TextField
                  id="birthDate"
                  label="Fecha de nacimiento"
                  type="date"
                  max={toDateInputValue(new Date().toISOString())}
                  error={errors.birthDate?.message}
                  {...register('birthDate')}
                />
                {invite ? (
                  <div>
                    <span className="input-label">Rol</span>
                    <div className="invite-role-badge">
                      {invite.role === 'DT' ? 'Director Técnico' : 'Jugador'}
                    </div>
                  </div>
                ) : (
                  <Select
                    id="role"
                    label="Rol"
                    error={errors.role?.message}
                    {...register('role')}
                  >
                    {/* Self-registration cannot mint privileged roles:
                        ADMIN / REFEREE / DT are provisioned by an admin
                        from /users. The backend enforces this too. */}
                    {PUBLIC_REGISTER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r === 'PLAYER' ? 'Jugador' : r === 'ASSISTANT' ? 'Auxiliar' : r}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="form-grid-2">
                <TextField
                  id="phoneNumber"
                  label="Teléfono"
                  placeholder="+5215555555555"
                  error={errors.phoneNumber?.message}
                  {...register('phoneNumber')}
                />
                <TextField
                  id="curp"
                  label="CURP"
                  maxLength={18}
                  style={{ textTransform: 'uppercase' }}
                  error={errors.curp?.message}
                  {...register('curp')}
                />
              </div>

              <TextField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="form-grid-2">
                <TextField
                  id="password"
                  label="Contraseña"
                  type="password"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <TextField
                  id="confirmPassword"
                  label="Confirma tu contraseña"
                  type="password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </div>

              {serverError && <Banner tone="error">{serverError}</Banner>}

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                startIcon={<BallIcon />}
              >
                {isSubmitting ? 'Creando…' : 'Crear cuenta'}
              </Button>
            </form>

            <p
              className="text-center text-muted"
              style={{ marginTop: 'var(--space-5)' }}
            >
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
