import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextField } from './ui/TextField';
import { Select } from './ui/Select';
import { Banner } from './ui/Banner';
import { Stepper, type StepperStep } from './Stepper';
import type { Team, TeamCreateInput } from '../types/team';
import type { League } from '../types/league';
import type { Field } from '../types/field';
import type { ErrorEnvelope } from '../types/user';
import { FORMAT_LABEL, TIME_SLOT_LABEL, WEEK_DAY_SHORT } from '../types/league';
import { teamsApi } from '../api/teams';
import { fieldsApi } from '../api/fields';
import { useLeagues } from '../hooks/teams';

interface TeamFormProps {
  team?: Team | null;
  onSaved: (team: Team) => void;
  onCancel: () => void;
}

interface TeamFormValues {
  name: string;
  shortName: string;
  emoji: string;
  primaryColor: string;
  secondaryColor: string;
  leagueId: string;
  homeFieldId: string;
}

const DEFAULT_EMOJI = '⚽';
const DEFAULT_PRIMARY = '#FFE600';
const DEFAULT_SECONDARY = '#0A0A0A';

export function TeamForm({ team, onSaved, onCancel }: TeamFormProps) {
  const isEdit = Boolean(team);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const STEPS: StepperStep[] = [
    { id: 'identity', label: 'Identidad', hint: 'nombre y colores' },
    { id: 'assign', label: 'Asignación', hint: 'liga y cancha' },
  ];

  const { data: leagues } = useLeagues();
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    let cancelled = false;
    fieldsApi
      .list()
      .then((list) => {
        if (!cancelled) setFields(list);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    defaultValues: team
      ? {
          name: team.name,
          shortName: team.shortName,
          emoji: team.emoji,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
          leagueId: team.currentLeagueId ?? '',
          homeFieldId: team.homeFieldId ?? '',
        }
      : {
          name: '',
          shortName: '',
          emoji: DEFAULT_EMOJI,
          primaryColor: DEFAULT_PRIMARY,
          secondaryColor: DEFAULT_SECONDARY,
          leagueId: '',
          homeFieldId: '',
        },
  });

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        shortName: team.shortName,
        emoji: team.emoji,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        leagueId: team.currentLeagueId ?? '',
        homeFieldId: team.homeFieldId ?? '',
      });
    }
  }, [team, reset]);

  const onSubmit = async (data: TeamFormValues) => {
    setServerError(null);
    setSuccess(null);
    const payload: TeamCreateInput = {
      name: data.name.trim(),
      shortName: data.shortName.trim().toUpperCase().slice(0, 10),
      emoji: data.emoji || DEFAULT_EMOJI,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      homeFieldId: data.homeFieldId ? data.homeFieldId : null,
      currentLeagueId: data.leagueId ? data.leagueId : null,
    };
    if (!payload.name || !payload.shortName) {
      setServerError('Nombre y shortName son obligatorios');
      return;
    }
    try {
      const saved = team
        ? await teamsApi.update(team.id, payload)
        : await teamsApi.create(payload);
      setSuccess(isEdit ? '¡Equipo actualizado!' : '¡Equipo creado!');
      onSaved(saved);
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data
        ?.error;
      setServerError(apiError?.message ?? 'No se pudo guardar el equipo');
    }
  };

  const STEP_FIELDS: Array<Array<keyof TeamFormValues>> = [
    ['name', 'shortName', 'emoji', 'primaryColor', 'secondaryColor'],
    ['leagueId', 'homeFieldId'],
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
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear equipo'}
        isLast={step === STEPS.length - 1}
        submitting={isSubmitting}
      >
        {step === 0 && (
          <>
            <div className="form-grid-2">
              <TextField
                id="team-name"
                label="Nombre *"
                placeholder="Linces FC"
                error={errors.name?.message}
                {...register('name', { required: 'Requerido' })}
              />
              <TextField
                id="team-shortName"
                label="Short (3 letras)"
                placeholder="LIN"
                maxLength={3}
                error={errors.shortName?.message}
                {...register('shortName', { required: 'Requerido' })}
              />
            </div>

            <TextField
              id="team-emoji"
              label="Emoji / Escudo"
              placeholder="🦁"
              {...register('emoji')}
            />

            <div className="form-grid-2">
              <TextField
                id="team-primary"
                label="Color primario"
                type="color"
                {...register('primaryColor')}
              />
              <TextField
                id="team-secondary"
                label="Color secundario"
                type="color"
                {...register('secondaryColor')}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Select id="team-league" label="Liga actual" {...register('leagueId')}>
              <option value="">— Sin asignar —</option>
              {(leagues ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {leagueLabel(l)}
                </option>
              ))}
            </Select>

            <Select
              id="team-homeField"
              label="Cancha local (opcional)"
              {...register('homeFieldId')}
            >
              <option value="">— Sin cancha fija —</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </>
        )}

        {serverError && <Banner tone="error">{serverError}</Banner>}
        {success && <Banner tone="success">{success}</Banner>}
      </Stepper>
    </form>
  );
}

function leagueLabel(l: League): string {
  const fmt = l.format ? FORMAT_LABEL[l.format] : '';
  const day = l.dayOfWeek ? WEEK_DAY_SHORT[l.dayOfWeek] : '';
  const slot = l.timeSlot ? TIME_SLOT_LABEL[l.timeSlot] : '';
  const slotPart = [day, slot].filter(Boolean).join(' ');
  return slotPart ? `${l.name} · ${fmt} ${slotPart}` : `${l.name} · ${fmt}`;
}