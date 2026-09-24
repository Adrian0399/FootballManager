import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaguesApi } from '../api/leagues';
import { fieldsApi } from '../api/fields';
import {
  leagueCreateSchema,
  type LeagueCreateForm,
} from '../utils/validation';
import type { Field } from '../types/field';
import type { League, LeagueFormat, WeekDay, TimeSlot } from '../types/league';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { ErrorEnvelope } from '../types/user';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { TextArea } from './ui/TextArea';
import { Select } from './ui/Select';
import { Banner } from './ui/Banner';
import { FieldError } from './ui/FieldError';

interface LeagueFormProps {
  /** When provided, the form is in "edit" mode and pre-populated. */
  league?: League | null;
  onSaved: (league: League) => void;
  onCancel: () => void;
}

/**
 * Create / edit form for a single League.
 *
 * Organized into 4 visual sections (the "wizard" feel without the
 * multi-step navigation):
 *   1. Datos básicos       — name, season, description
 *   2. Formato & categoría — format (F1/F5/F7/…), category, type
 *   3. Calendario & cupo   — dayOfWeek, timeSlot, maxTeams, fechas
 *   4. Canchas             — multi-select (filtered by supportedFormats when set)
 *
 * The form's submit posts to the real leagues API. The new fields
 * (format, category, type, etc.) are sent in the payload; if the
 * backend doesn't recognize them yet, it ignores the extras (REST
 * convention). When the v1.0.0 backend lands, all fields round-trip.
 */
export function LeagueForm({ league, onSaved, onCancel }: LeagueFormProps) {
  const isEdit = Boolean(league);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[] | null>(null);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeagueCreateForm>({
    resolver: zodResolver(leagueCreateSchema),
    defaultValues: league
      ? {
          name: league.name,
          description: league.description ?? '',
          season: league.season ?? '',
          startDate: league.startDate ?? '',
          endDate: league.endDate ?? '',
          fieldIds: league.fieldIds,
          format: league.format,
          category: league.category ?? '',
          type: league.type,
          matchdays: league.matchdays ? String(league.matchdays) : '',
          homeAndAway: league.homeAndAway ?? false,
          maxTeams: league.maxTeams ? String(league.maxTeams) : '8',
          dayOfWeek: league.dayOfWeek ?? undefined,
          timeSlot: league.timeSlot ?? undefined,
        }
      : {
          name: '',
          description: '',
          season: '',
          startDate: '',
          endDate: '',
          fieldIds: [],
          format: '7V7',
          category: 'LIBRE',
          type: 'ROUND_ROBIN',
          matchdays: '14',
          homeAndAway: true,
          maxTeams: '8',
          dayOfWeek: undefined,
          timeSlot: undefined,
        },
  });

  useEffect(() => {
    if (league) {
      reset({
        name: league.name,
        description: league.description ?? '',
        season: league.season ?? '',
        startDate: league.startDate ?? '',
        endDate: league.endDate ?? '',
        fieldIds: league.fieldIds,
        format: league.format,
        category: league.category ?? '',
        type: league.type,
        matchdays: league.matchdays ? String(league.matchdays) : '',
        homeAndAway: league.homeAndAway ?? false,
        maxTeams: league.maxTeams ? String(league.maxTeams) : '8',
        dayOfWeek: league.dayOfWeek ?? undefined,
        timeSlot: league.timeSlot ?? undefined,
      });
    }
  }, [league, reset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fieldsApi.list();
        if (!cancelled) setFields(list);
      } catch (err) {
        const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
        if (!cancelled) {
          setFieldsError(apiError?.error?.message ?? 'No se pudieron cargar las canchas');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (data: LeagueCreateForm) => {
    setServerError(null);
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description ?? null,
        season: data.season ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        fieldIds: data.fieldIds,
        // New v1.0.0 fields — backend can ignore until implemented.
        format: data.format,
        category: data.category || null,
        type: data.type,
        matchdays: data.matchdays ? Number(data.matchdays) : undefined,
        homeAndAway: data.homeAndAway,
        maxTeams: data.maxTeams ? Number(data.maxTeams) : undefined,
        dayOfWeek: data.dayOfWeek ?? null,
        timeSlot: data.timeSlot ?? null,
      };
      const saved = isEdit
        ? await leaguesApi.update(league!.id, payload)
        : await leaguesApi.create(payload);
      onSaved(saved);
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      if (apiError?.error?.issues?.length) {
        setServerError(
          apiError.error.issues.map((i) => `${i.path}: ${i.message}`).join(' · '),
        );
      } else {
        setServerError(apiError?.error?.message ?? 'No se pudo guardar la liga');
      }
    }
  };

  // Watch the selected format so the canchas checkbox list can be
  // filtered (mock: we just show all fields; the real backend will
  // filter by supportedFormats).
  const selectedFormat = watch('format');
  void selectedFormat;

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ----- 1. Datos básicos ----- */}
      <fieldset className="form-section">
        <legend className="form-section__legend">Datos básicos</legend>

        <TextField
          id="league-name"
          label="Nombre *"
          placeholder="Liga Kaibil Apertura 2026"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="form-grid-2">
          <TextField
            id="league-season"
            label="Temporada"
            placeholder="Apertura 2026"
            {...register('season')}
          />
          <TextField
            id="league-category"
            label="Categoría"
            placeholder="LIBRE, SUB-17, JUVENIL MATUTINA…"
            list="league-category-suggestions"
            {...register('category')}
          />
          <datalist id="league-category-suggestions">
            <option value="LIBRE" />
            <option value="FEMENIL" />
            <option value="VARONIL" />
            <option value="MIXTO" />
            <option value="VETERANOS" />
            <option value="SUB-17" />
            <option value="SUB-21" />
            <option value="JUVENIL" />
            <option value="EMPRESAS" />
            <option value="INDIVIDUAL" />
          </datalist>
        </div>

        <TextArea
          id="league-description"
          label="Descripción"
          rows={2}
          placeholder="Torneo relámpago de fin de semana, regla de Fair Play activa…"
          {...register('description')}
        />
      </fieldset>

      {/* ----- 2. Formato & estructura ----- */}
      <fieldset className="form-section">
        <legend className="form-section__legend">Formato & estructura</legend>

        <div className="form-grid-2">
          <Select
            id="league-format"
            label="Formato *"
            error={errors.format?.message}
            {...register('format')}
          >
            {(['1V1', '3V3', '5V5', '6V6', '7V7', '9V9', '11V11'] as LeagueFormat[]).map(
              (f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ),
            )}
          </Select>

          <Select
            id="league-type"
            label="Tipo de torneo"
            error={errors.type?.message}
            {...register('type')}
          >
            <option value="ROUND_ROBIN">Round-robin (todos contra todos)</option>
            <option value="GROUPS_KNOCKOUT">Grupos + eliminatorias</option>
            <option value="KNOCKOUT_ONLY">Eliminatorias directas</option>
          </Select>
        </div>

        <div className="form-grid-2">
          <TextField
            id="league-matchdays"
            label="Jornadas (round-robin)"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="14"
            error={errors.matchdays?.message}
            {...register('matchdays')}
          />

          <div>
            <span className="input-label">Modalidad</span>
            <label
              className="check-list__item"
              style={{ marginTop: 'var(--space-2)' }}
            >
              <input
                type="checkbox"
                {...register('homeAndAway')}
              />
              <span>Ida y vuelta (home/away doble)</span>
            </label>
          </div>
        </div>
      </fieldset>

      {/* ----- 3. Calendario & cupo ----- */}
      <fieldset className="form-section">
        <legend className="form-section__legend">Calendario & cupo</legend>

        <div className="form-grid-2">
          <Select
            id="league-dayOfWeek"
            label="Día de la semana"
            {...register('dayOfWeek')}
          >
            <option value="">— Sin día fijo —</option>
            {(
              [
                'MONDAY',
                'TUESDAY',
                'WEDNESDAY',
                'THURSDAY',
                'FRIDAY',
                'SATURDAY',
                'SUNDAY',
              ] as WeekDay[]
            ).map((d) => (
              <option key={d} value={d}>
                {WEEK_DAY_SHORT[d]}
              </option>
            ))}
          </Select>

          <Select
            id="league-timeSlot"
            label="Turno"
            {...register('timeSlot')}
          >
            <option value="">— Sin turno fijo —</option>
            {(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as TimeSlot[]).map((t) => (
              <option key={t} value={t}>
                {TIME_SLOT_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>

        <div className="form-grid-2">
          <TextField
            id="league-maxTeams"
            label="Máx. equipos"
            type="number"
            inputMode="numeric"
            min={2}
            placeholder="8"
            hint="Tope editable. La UI avisa si los asignados lo superan."
            error={errors.maxTeams?.message}
            {...register('maxTeams')}
          />
          <div>
            <span className="input-label">Rango de fechas</span>
            <div className="row-3" style={{ gap: 'var(--space-2)' }}>
              <input
                id="league-startDate"
                type="date"
                className={`input ${errors.startDate ? 'input--error' : ''}`}
                style={{ minWidth: 0 }}
                {...register('startDate')}
              />
              <span className="muted">→</span>
              <input
                id="league-endDate"
                type="date"
                className={`input ${errors.endDate ? 'input--error' : ''}`}
                style={{ minWidth: 0 }}
                {...register('endDate')}
              />
            </div>
            {errors.endDate && (
              <FieldError message={errors.endDate.message} />
            )}
          </div>
        </div>
      </fieldset>

      {/* ----- 4. Canchas ----- */}
      <fieldset className="form-section">
        <legend className="form-section__legend">Canchas</legend>

        <div>
          <span className="input-label">Canchas *</span>
          {fields === null && !fieldsError && (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Cargando canchas…
            </p>
          )}
          {fieldsError && <Banner tone="error">{fieldsError}</Banner>}
          {fields && fields.length === 0 && (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Aún no hay canchas. Crea al menos una antes de crear una liga.
            </p>
          )}
          {fields && fields.length > 0 && (
            <Controller
              name="fieldIds"
              control={control}
              render={({ field: fieldCtrl }) => (
                <div
                  className="check-list"
                  role="group"
                  aria-label="Canchas de la liga"
                >
                  {fields.map((f) => {
                    const checked = fieldCtrl.value.includes(f.id);
                    return (
                      <label key={f.id} className="check-list__item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...fieldCtrl.value, f.id]
                              : fieldCtrl.value.filter((id) => id !== f.id);
                            fieldCtrl.onChange(next);
                          }}
                        />
                        <span>
                          <strong>{f.name}</strong>
                          {f.address ? (
                            <span className="muted"> · {f.address}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          )}
          {errors.fieldIds && (
            <FieldError message={errors.fieldIds.message as string} />
          )}
        </div>
      </fieldset>

      {serverError && <Banner tone="error">{serverError}</Banner>}

      <div
        className="row-3 row-end row-wrap"
        style={{ marginTop: 'var(--space-3)' }}
      >
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear liga'}
        </Button>
      </div>
    </form>
  );
}
