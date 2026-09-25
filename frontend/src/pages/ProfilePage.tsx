import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { useAuthStore } from '../store/auth.store';
import { updateProfileSchema, type UpdateProfileForm } from '../utils/validation';
import { roleLabel } from '../utils/roleChip';
import type { User, ErrorEnvelope } from '../types/user';
import { PhotoUploader } from '../components/PhotoUploader';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Banner } from '../components/ui/Banner';
import { FieldError } from '../components/ui/FieldError';
import {
  AwardListSection,
  MatchListSection,
  StatsStrip,
} from '../components/profile-sections';

function isoToDateInput(iso: string): string {
  return iso.split('T')[0] ?? '';
}

function fullName(user: User): string {
  return `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`.trim();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: user
      ? {
          firstName: user.firstName,
          paternalSurname: user.paternalSurname,
          maternalSurname: user.maternalSurname,
          birthDate: isoToDateInput(user.birthDate),
          nickname: user.nickname ?? '',
          phoneNumber: user.phoneNumber,
        }
      : undefined,
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        birthDate: isoToDateInput(user.birthDate),
        nickname: user.nickname ?? '',
        phoneNumber: user.phoneNumber,
      });
    }
  }, [user, reset]);

  // Live-computed age for the read-only banner. The server is the source of truth on save.
  const birthDateValue = watch('birthDate');
  const computedAge = birthDateValue
    ? (() => {
        const d = new Date(birthDateValue);
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
        return age;
      })()
    : user?.age ?? 0;

  const onSubmit = async (data: UpdateProfileForm) => {
    setServerError(null);
    setSuccess(null);
    const payload = {
      ...data,
      nickname: data.nickname === '' ? null : data.nickname,
    };
    try {
      const res = await apiClient.patch<{ success: true; data: User }>(
        '/users/me',
        payload,
      );
      setUser(res.data.data);
      setSuccess('¡Perfil actualizado!');
    } catch (err) {
      const error = err as { response?: { data?: ErrorEnvelope } };
      const apiError = error.response?.data?.error;
      if (apiError?.issues?.length) {
        setServerError(
          apiError.issues.map((i) => `${i.path}: ${i.message}`).join(' · '),
        );
      } else {
        setServerError(apiError?.message ?? 'Update failed');
      }
    }
  };

  if (!user) return null;

  return (
    <div className="container section-stack">
      {/* =============================================================
       * Hero: cover with avatar + meta side-by-side inside
       * ============================================================= */}
      <div className="profile-cover">
        <div className="profile-cover__halftone" aria-hidden="true" />
        <PhotoUploader
          kind="cover"
          currentUrl={user.coverPhotoUrl}
          userId={user.id}
          onChange={(url) => setUser({ ...user, coverPhotoUrl: url ?? null })}
        />
        <div className="profile-cover__overlay">
          <div className="profile-avatar-wrap">
            <PhotoUploader
              kind="profile"
              currentUrl={user.profilePhotoUrl}
              userId={user.id}
              onChange={(url) => setUser({ ...user, profilePhotoUrl: url ?? null })}
            />
          </div>
          <div className="profile-meta">
            <h1 style={{ fontSize: 'var(--text-3xl)' }}>{fullName(user)}</h1>
            {user.nickname && (
              <span className="profile-nickname">"{user.nickname}"</span>
            )}
            <div className="row-3 row-wrap">
              <Chip
                tone={
                  user.role === 'ADMIN'
                    ? 'admin'
                    : user.role === 'REFEREE'
                      ? 'ref'
                      : user.role === 'TECHNICAL_DIRECTOR'
                        ? 'td'
                        : user.role === 'ASSISTANT'
                          ? 'asst'
                          : 'player'
                }
              >
                {roleLabel(user.role)}
              </Chip>
              <Chip>📧 {user.email}</Chip>
            </div>
          </div>
        </div>
      </div>

      {/* =============================================================
       * Visual dashboard: stats + recent matches + awards
       * ============================================================= */}
      <StatsStrip userId={user.id} />

      <div className="profile-dashboard-grid">
        <MatchListSection userId={user.id} />
        <AwardListSection userId={user.id} />
      </div>

      {/* =============================================================
       * Edit form
       * ============================================================= */}
      <Card>
        <div className="stack-2" style={{ marginBottom: 'var(--space-4)' }}>
          <h2>Edita tu perfil</h2>
          <p className="muted">
            Estás editando tu propio perfil (
            <code className="mono">{user.id}</code>).
          </p>
        </div>

        <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
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

          <label htmlFor="birthDate">
            <span className="input-label">Fecha de nacimiento</span>
            <input
              id="birthDate"
              type="date"
              className={`input ${errors.birthDate ? 'input--error' : ''}`}
              {...register('birthDate')}
            />
            {errors.birthDate && (
              <FieldError message={errors.birthDate.message} />
            )}
            <div
              className="form-banner"
              style={{
                marginTop: 'var(--space-3)',
                background: 'var(--color-cyan)',
                borderColor: 'var(--color-ink)',
                color: 'var(--color-ink)',
              }}
            >
              La edad se calcula automáticamente desde la fecha de nacimiento.
              Valor actual: <strong>{computedAge}</strong> años.
            </div>
          </label>

          <TextField
            id="phoneNumber"
            label="Teléfono"
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />

          <div className="form-grid-2">
            <TextField
              id="profile-email"
              label="Email"
              defaultValue={user.email}
              disabled
              readOnly
            />
            <TextField
              id="profile-curp"
              label="CURP"
              defaultValue={user.curp}
              disabled
              readOnly
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {serverError && <Banner tone="error">{serverError}</Banner>}
          {success && <Banner tone="success">¡Perfil actualizado!</Banner>}

          <div
            className="row-3 row-end row-wrap"
            style={{ marginTop: 'var(--space-3)' }}
          >
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
