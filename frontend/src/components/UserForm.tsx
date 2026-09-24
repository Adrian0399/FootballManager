import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterForm } from '../utils/validation';
import { usersApi, type UserCreateInput } from '../api/users';
import type { User, UserRole } from '../types/user';
import type { ErrorEnvelope } from '../types/user';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { Select } from './ui/Select';
import { Banner } from './ui/Banner';
import { USER_ROLES } from '../types/user';

interface UserFormProps {
  /** When provided, the form is in "edit" mode and pre-populated. */
  user?: User | null;
  /** Limit the role choices (DT can only create PLAYER / ASSISTANT). */
  allowedRoles?: UserRole[];
  onSaved: (user: User) => void;
  onCancel: () => void;
}

/**
 * Create / edit form for a single User.
 *
 * Used by:
 *   - Admin (`/users` page) → all 5 roles available.
 *   - DT (`/teams/:id/plantilla`) → only PLAYER + ASSISTANT.
 *
 * In v1.0.0 mock the submit is a no-op: it returns a synthetic user
 * and surfaces a "Demo" success banner. The form UX is what we want
 * to review; the real write happens against the backend in v1.1.
 */
export function UserForm({ user, allowedRoles, onSaved, onCancel }: UserFormProps) {
  const isEdit = Boolean(user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const roles = allowedRoles && allowedRoles.length > 0 ? allowedRoles : USER_ROLES;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: user
      ? {
          firstName: user.firstName,
          paternalSurname: user.paternalSurname,
          maternalSurname: user.maternalSurname,
          birthDate: user.birthDate,
          role: user.role,
          nickname: user.nickname ?? '',
          phoneNumber: user.phoneNumber,
          email: user.email,
          curp: user.curp,
          password: '',
          confirmPassword: '',
        }
      : {
          firstName: '',
          paternalSurname: '',
          maternalSurname: '',
          birthDate: '2000-01-01',
          role: roles[0]!,
          nickname: '',
          phoneNumber: '',
          email: '',
          curp: '',
          password: '',
          confirmPassword: '',
        },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        birthDate: user.birthDate,
        role: user.role,
        nickname: user.nickname ?? '',
        phoneNumber: user.phoneNumber,
        email: user.email,
        curp: user.curp,
        password: '',
        confirmPassword: '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    setSuccess(null);
    const payload: UserCreateInput = {
      firstName: data.firstName.trim(),
      paternalSurname: data.paternalSurname.trim(),
      maternalSurname: data.maternalSurname.trim(),
      birthDate: data.birthDate,
      role: data.role,
      nickname: data.nickname && data.nickname.length > 0 ? data.nickname : null,
      phoneNumber: data.phoneNumber,
      email: data.email,
      curp: data.curp,
      password: data.password,
    };
    try {
      const saved =
        isEdit && user
          ? await usersApi.update(user.id, payload)
          : await usersApi.create(payload);
      onSaved(saved);
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      if (apiError?.error?.issues?.length) {
        setServerError(
          apiError.error.issues.map((i) => `${i.path}: ${i.message}`).join(' · '),
        );
      } else {
        setServerError(apiError?.error?.message ?? 'No se pudo guardar el usuario');
      }
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-grid-2">
        <TextField
          id="user-firstName"
          label="Nombre *"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextField
          id="user-nickname"
          label="Apodo (opcional)"
          {...register('nickname')}
        />
      </div>
      <div className="form-grid-2">
        <TextField
          id="user-paternalSurname"
          label="Apellido paterno *"
          error={errors.paternalSurname?.message}
          {...register('paternalSurname')}
        />
        <TextField
          id="user-maternalSurname"
          label="Apellido materno *"
          error={errors.maternalSurname?.message}
          {...register('maternalSurname')}
        />
      </div>
      <div className="form-grid-2">
        <TextField
          id="user-birthDate"
          label="Fecha de nacimiento *"
          type="date"
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <Select
          id="user-role"
          label="Rol *"
          error={errors.role?.message}
          {...register('role')}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>
      <TextField
        id="user-phoneNumber"
        label="Teléfono *"
        placeholder="+52 55 1234 5678"
        error={errors.phoneNumber?.message}
        {...register('phoneNumber')}
      />
      <TextField
        id="user-email"
        label="Email *"
        type="email"
        placeholder="usuario@kaibil.local"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        id="user-curp"
        label="CURP *"
        placeholder="AAAA000101HDFXXX00"
        error={errors.curp?.message}
        {...register('curp')}
      />
      {!isEdit && (
        <div className="form-grid-2">
          <TextField
            id="user-password"
            label="Contraseña *"
            type="password"
            hint="Mínimo 8 caracteres, con letras y números."
            error={errors.password?.message}
            {...register('password')}
          />
          <TextField
            id="user-confirmPassword"
            label="Confirmar contraseña *"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
      )}

      {serverError && <Banner tone="error">{serverError}</Banner>}
      {success && <Banner tone="success">{success}</Banner>}

      <div
        className="row-3 row-end row-wrap"
        style={{ marginTop: 'var(--space-3)' }}
      >
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  REFEREE: 'Árbitro',
  TECHNICAL_DIRECTOR: 'Director Técnico',
  ASSISTANT: 'Auxiliar Técnico',
  PLAYER: 'Jugador',
};
