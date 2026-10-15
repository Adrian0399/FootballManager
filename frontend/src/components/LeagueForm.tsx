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
import { Stepper, type StepperStep } from './Stepper';

/** Adds `days` days to a `YYYY-MM-DD` date (local time, no TZ drift). */
function addDaysISO(startISO: string, days: number): string {
  const d = new Date(`${startISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Adds `weeks` weeks to a `YYYY-MM-DD` date (local time, no TZ drift). */
function addWeeksISO(startISO: string, weeks: number): string {
  return addDaysISO(startISO, weeks * 7);
}

/**
 * Days the knockout (liguilla) adds after the last round-robin matchday,
 * mirroring the backend schedule: the playoff starts 7 days after the last
 * jornada (cuartos +0/+2, semis +9, final +12) → 19 days. With home/away
 * ties each round gets a second leg a week later → 42 days.
 */
const KNOCKOUT_DAYS_SINGLE = 19;
const KNOCKOUT_DAYS_DOUBLE = 42;

/**
 * Number of round-robin matchdays for `teams` sides. Even counts give
 * `teams - 1` rounds; odd counts give `teams` (one side rests each round).
 * With `homeAndAway` the whole schedule is doubled.
 */
function roundRobinMatchdays(teams: number, homeAndAway: boolean): number {
  if (teams < 2) return 0;
  const single = teams % 2 === 0 ? teams - 1 : teams;
  return homeAndAway ? single * 2 : single;
}

interface LeagueFormProps {
  /** When provided, the form is in "edit" mode and pre-populated. */
  league?: League | null;
  onSaved: (league: League) => void;
  onCancel: () => void;
}

/**
 * Create / edit form for a single League.
 *
 * Organized into 3 visual steps (the "wizard" feel):
 *   1. Datos básicos          — name, season, category, description
 *   2. Formato, cupo y fechas — maxTeams (primero, porque sugiere las
 *                               jornadas), matchdays, format, type,
 *                               dayOfWeek, timeSlot, startDate/endDate
 *   3. Canchas                — multi-select
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
  const [step, setStep] = useState(0);

  const STEPS: StepperStep[] = [
    { id: 'basic', label: 'Datos básicos', hint: 'nombre y categoría' },
    { id: 'format', label: 'Formato y calendario', hint: 'cupo, jornadas y fechas' },
    { id: 'fields', label: 'Canchas', hint: 'asignar canchas' },
  ];

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    trigger,
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

  // --- Auto-cálculo de fecha fin ----------------------------------------
  // La fecha de fin se deriva del inicio + jornadas (una jornada por
  // semana). Si no hay jornadas indicadas y el torneo es round-robin, se
  // estiman a partir del número de equipos (ida y/o vuelta). Cuando el
  // torneo define liguilla, se añade la fase de eliminatorias.
  const startDate = watch('startDate');
  const matchdaysVal = watch('matchdays');
  const maxTeamsVal = watch('maxTeams');
  const homeAndAwayVal = watch('homeAndAway');
  const knockoutHomeAndAwayVal = watch('knockoutHomeAndAway');
  const typeVal = watch('type');

  /** ¿El torneo define un campeón por eliminatorias (liguilla)? */
  const hasKnockout = typeVal === 'GROUPS_KNOCKOUT' || typeVal === 'KNOCKOUT_ONLY';
  /** Modo de campeón en 2 opciones: tabla (round-robin) o liguilla. */
  const championMode: 'ROUND_ROBIN' | 'GROUPS_KNOCKOUT' =
    typeVal === 'ROUND_ROBIN' ? 'ROUND_ROBIN' : 'GROUPS_KNOCKOUT';

  const suggestedMatchdays = roundRobinMatchdays(
    Number(maxTeamsVal) || 0,
    Boolean(homeAndAwayVal),
  );

  useEffect(() => {
    if (!startDate) return;
    const explicit = Number(matchdaysVal);
    const md =
      explicit > 0
        ? explicit
        : typeVal === 'ROUND_ROBIN'
          ? roundRobinMatchdays(Number(maxTeamsVal) || 0, Boolean(homeAndAwayVal))
          : 0;
    if (md <= 0) return;
    const knockoutDays = !hasKnockout
      ? 0
      : knockoutHomeAndAwayVal
        ? KNOCKOUT_DAYS_DOUBLE
        : KNOCKOUT_DAYS_SINGLE;
    const lastRoundRobin = addWeeksISO(startDate, md - 1);
    setValue('endDate', addDaysISO(lastRoundRobin, knockoutDays), { shouldValidate: true });
  }, [
    startDate,
    matchdaysVal,
    maxTeamsVal,
    homeAndAwayVal,
    knockoutHomeAndAwayVal,
    typeVal,
    hasKnockout,
    setValue,
  ]);

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
        knockoutHomeAndAway: data.knockoutHomeAndAway,
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

  // Fields that must validate before leaving each step.
  const STEP_FIELDS: Array<Array<keyof LeagueCreateForm>> = [
    ['name', 'season', 'category', 'description'],
    ['maxTeams', 'matchdays', 'format', 'type', 'homeAndAway', 'knockoutHomeAndAway', 'dayOfWeek', 'timeSlot', 'startDate', 'endDate'],
    ['fieldIds'],
  ];

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step] ?? []);
    if (!valid) return;
    if (step === STEPS.length - 1) {
      await handleSubmit(onSubmit)();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <form className="form" noValidate>
      <Stepper
        steps={STEPS}
        current={step}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={goNext}
        onCancel={onCancel}
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear liga'}
        isLast={step === STEPS.length - 1}
        submitting={isSubmitting}
      >
      {step === 0 && (
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
      )}
      {step === 1 && (
        <fieldset className="form-section">
          <legend className="form-section__legend">Formato, cupo y calendario</legend>

          <div className="form-grid-2">
            <TextField
              id="league-maxTeams"
              label="Máx. equipos *"
              type="number"
              inputMode="numeric"
              min={2}
              placeholder="8"
              hint="Cupo de la liga: define cuántos equipos entran y sugiere las jornadas."
              error={errors.maxTeams?.message}
              {...register('maxTeams')}
            />

            <div>
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
              {typeVal === 'ROUND_ROBIN' && suggestedMatchdays > 0 && (
                <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                  Sugerido para {maxTeamsVal} equipos
                  {homeAndAwayVal ? ' (ida y vuelta)' : ''}:{' '}
                  <strong>{suggestedMatchdays} jornadas</strong>{' '}
                  <button
                    type="button"
                    onClick={() =>
                      setValue('matchdays', String(suggestedMatchdays), { shouldValidate: true })
                    }
                    style={{
                      background: 'none',
                      border: 0,
                      padding: 0,
                      font: 'inherit',
                      color: 'var(--color-cyan)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    usar
                  </button>
                </p>
              )}
            </div>
          </div>

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

            <div>
              <span className="input-label">¿Cómo se decide el campeón?</span>
              <div className="check-list" style={{ marginTop: 'var(--space-2)' }}>
                <label className="check-list__item">
                  <input
                    type="radio"
                    name="championMode"
                    checked={championMode === 'ROUND_ROBIN'}
                    onChange={() => setValue('type', 'ROUND_ROBIN', { shouldValidate: true })}
                  />
                  <span>
                    <strong>Por tabla</strong> — gana el 1º al terminar todas las jornadas.
                  </span>
                </label>
                <label className="check-list__item">
                  <input
                    type="radio"
                    name="championMode"
                    checked={championMode === 'GROUPS_KNOCKOUT'}
                    onChange={() =>
                      setValue('type', 'GROUPS_KNOCKOUT', { shouldValidate: true })
                    }
                  />
                  <span>
                    <strong>Por liguilla</strong> — fase regular + cuartos, semifinal y final.
                  </span>
                </label>
              </div>
              <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                En ambas opciones hay 1º, 2º y 3º lugar.
              </p>
            </div>
          </div>

          <div>
            <span className="input-label">Modalidad</span>
            <label className="check-list__item" style={{ marginTop: 'var(--space-2)' }}>
              <input type="checkbox" {...register('homeAndAway')} />
              <span>Fase regular a ida y vuelta</span>
            </label>
            {hasKnockout && (
              <label className="check-list__item">
                <input type="checkbox" {...register('knockoutHomeAndAway')} />
                <span>Eliminatorias a ida y vuelta</span>
              </label>
            )}
          </div>

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
            {startDate ? (
              <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                Fecha fin calculada automáticamente desde el inicio, las jornadas
                {hasKnockout ? ' y la fase de liguilla' : ''} (podés ajustarla).
              </p>
            ) : null}
            {errors.endDate && <FieldError message={errors.endDate.message} />}
          </div>
        </fieldset>
      )}
      {step === 2 && (
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

      )}
      {serverError && <Banner tone="error">{serverError}</Banner>}
      </Stepper>
    </form>
  );
}
