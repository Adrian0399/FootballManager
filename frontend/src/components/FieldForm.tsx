import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fieldsApi } from '../api/fields';
import { fieldCreateSchema, type FieldCreateForm } from '../utils/validation';
import type { Field } from '../types/field';
import type { ErrorEnvelope } from '../types/user';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { TextArea } from './ui/TextArea';
import { Banner } from './ui/Banner';

interface FieldFormProps {
  /** When provided, the form is in "edit" mode and pre-populated. */
  field?: Field | null;
  onSaved: (field: Field) => void;
  onCancel: () => void;
}

/**
 * Create / edit form for a single Field (cancha).
 *
 * The form is intentionally minimal: name is required, the rest are
 * optional. The numeric `capacity` is a text input on the UI and gets
 * coerced server-side; we send it as a string for the create endpoint
 * but the backend accepts numbers too.
 *
 * Errors from the API are surfaced inline via `<Banner>` so the user
 * can see which constraint failed (e.g. `FIELD_NAME_TAKEN`).
 */
export function FieldForm({ field, onSaved, onCancel }: FieldFormProps) {
  const isEdit = Boolean(field);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FieldCreateForm>({
    resolver: zodResolver(fieldCreateSchema),
    defaultValues: field
      ? {
          name: field.name,
          address: field.address ?? '',
          description: field.description ?? '',
          capacity:
            field.capacity === null || field.capacity === undefined
              ? ''
              : String(field.capacity),
        }
      : { name: '', address: '', description: '', capacity: '' },
  });

  useEffect(() => {
    if (field) {
      reset({
        name: field.name,
        address: field.address ?? '',
        description: field.description ?? '',
        capacity:
          field.capacity === null || field.capacity === undefined
            ? ''
            : String(field.capacity),
      });
    }
  }, [field, reset]);

  const onSubmit = async (data: FieldCreateForm) => {
    setServerError(null);
    try {
      // Normalize empty strings → null for optional fields so the backend
      // stores `null` instead of `""`. Capacity comes in as a string from
      // the input; we coerce to a positive integer or null.
      const capacityNum =
        data.capacity === '' || data.capacity === undefined
          ? null
          : Number(data.capacity);
      const payload = {
        name: data.name.trim(),
        address: data.address && data.address !== '' ? data.address : null,
        description:
          data.description && data.description !== '' ? data.description : null,
        capacity: capacityNum,
      };
      const saved = isEdit
        ? await fieldsApi.update(field!.id, payload)
        : await fieldsApi.create(payload);
      onSaved(saved);
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      if (apiError?.error?.issues?.length) {
        setServerError(
          apiError.error.issues.map((i) => `${i.path}: ${i.message}`).join(' · '),
        );
      } else {
        setServerError(apiError?.error?.message ?? 'No se pudo guardar la cancha');
      }
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        id="field-name"
        label="Nombre *"
        placeholder="Estadio Kaibil"
        error={errors.name?.message}
        {...register('name')}
      />

      <TextField
        id="field-address"
        label="Dirección"
        placeholder="Av. Siempre Viva 742"
        {...register('address')}
      />

      <TextArea
        id="field-description"
        label="Descripción"
        rows={3}
        placeholder="Césped sintético, gradas para 200 personas…"
        {...register('description')}
      />

      <TextField
        id="field-capacity"
        label="Capacidad"
        type="number"
        inputMode="numeric"
        min={1}
        placeholder="200"
        error={errors.capacity?.message}
        {...register('capacity')}
      />

      {serverError && <Banner tone="error">{serverError}</Banner>}

      <div
        className="row-3 row-end row-wrap"
        style={{ marginTop: 'var(--space-3)' }}
      >
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear cancha'}
        </Button>
      </div>
    </form>
  );
}
