import { useState, type ReactNode } from 'react';
import {
  Plus, Trash2, Download, Pencil, ArrowLeft, ArrowRight,
  Check, X, AlertTriangle, Info, CheckCircle2, Search,
} from 'lucide-react';
import {
  Button, Chip, Card, Banner, PageHeader, EmptyState,
  TextField, TextArea, Select, FieldError,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Stepper } from '../components/Stepper';

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */

function Section({ title, hint, children }: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-sec">
      <header className="ui-sec__head">
        <h2 className="ui-sec__title">{title}</h2>
        {hint && <p className="ui-sec__hint">{hint}</p>}
      </header>
      <div className="ui-sec__body">{children}</div>
    </section>
  );
}

/** A framed demo surface with a caption for the prop being shown. */
function Stage({ label, children, wide }: {
  label?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`ui-stage${wide ? ' ui-stage--wide' : ''}`}>
      <div className="ui-stage__demo">{children}</div>
      {label && <span className="ui-stage__label">{label}</span>}
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="ui-row">{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const BUTTON_VARIANTS = ['primary', 'cyan', 'coral', 'magenta', 'lime', 'ghost', 'dark'] as const;
const CHIP_TONES = ['default', 'admin', 'ref', 'td', 'asst', 'player', 'cyan', 'magenta', 'lime', 'coral', 'success', 'warning'] as const;
const CARD_VARIANTS = ['default', 'rare', 'legend', 'dark', 'cream'] as const;
const BANNER_TONES = ['error', 'success', 'info', 'warning'] as const;

const STEPS = [
  { id: 'info', label: 'Datos', hint: 'Nombre y liga' },
  { id: 'config', label: 'Config', hint: 'Formato' },
  { id: 'done', label: 'Listo', hint: 'Resumen' },
];

export function ComponentGallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step, setStep] = useState(0);

  const resetStepper = () => setStep(0);

  return (
    <div className="container section-stack">
      <PageHeader
        title="Componentes UI/UX"
        description="Galería del design system: botones, chips, tarjetas, formularios y superposiciones. Cada demo respeta el tema activo."
      />

      <div className="ui-gallery">
        {/* ---------------------------------------------------------- */}
        <Section title="Botones" hint="7 variantes · 3 tamaños · iconos, block, disabled y como link.">
          <Stage label="variant">
            <Row>
              {BUTTON_VARIANTS.map((v) => (
                <Button key={v} variant={v}>{v}</Button>
              ))}
            </Row>
          </Stage>

          <Stage label="size">
            <Row>
              <Button size="sm">sm</Button>
              <Button size="md">md</Button>
              <Button size="lg">lg</Button>
            </Row>
          </Stage>

          <Stage label="startIcon / endIcon">
            <Row>
              <Button variant="primary" startIcon={<Plus size={16} />}>Crear liga</Button>
              <Button variant="cyan" startIcon={<Pencil size={16} />}>Editar</Button>
              <Button variant="ghost" endIcon={<Download size={16} />}>Exportar</Button>
            </Row>
          </Stage>

          <Stage label="disabled · block">
            <div className="ui-stack">
              <Button variant="primary" disabled>Guardando…</Button>
              <Button variant="coral" block startIcon={<Trash2 size={16} />}>Eliminar registro</Button>
            </div>
          </Stage>

          <Stage label="to (renderiza como Link)">
            <Row>
              <Button variant="lime" to="/dashboard">Ir al dashboard</Button>
              <Button variant="ghost" to="/leagues">Ver ligas</Button>
            </Row>
          </Stage>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Chips" hint="Etiquetas de rol, tonos de color y estados.">
          <Stage label="tone">
            <Row>
              {CHIP_TONES.map((t) => (
                <Chip key={t} tone={t}>{t}</Chip>
              ))}
            </Row>
          </Stage>

          <Stage label="uso típico: roles">
            <Row>
              <Chip tone="admin">ADMIN</Chip>
              <Chip tone="ref">Árbitro</Chip>
              <Chip tone="td">DT</Chip>
              <Chip tone="asst">Asistente</Chip>
              <Chip tone="player">Jugador</Chip>
            </Row>
          </Stage>

          <Stage label="style (escape hatch)">
            <Row>
              <Chip style={{ background: 'var(--color-fog)' }}>Inactiva</Chip>
              <Chip style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}>Custom</Chip>
            </Row>
          </Stage>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Tarjetas" hint="5 variantes + efecto scanlines retro.">
          <div className="ui-grid">
            {CARD_VARIANTS.map((v) => (
              <Card key={v} variant={v} className="ui-card-demo">
                <strong className="ui-card-demo__name">{v}</strong>
                <span className="ui-card-demo__meta">Card variant="{v}"</span>
              </Card>
            ))}
            <Card variant="dark" scanlines className="ui-card-demo">
              <strong className="ui-card-demo__name">scanlines</strong>
              <span className="ui-card-demo__meta">scanlines + dark</span>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Banners" hint="Mensajes de sistema: error, éxito, info y warning.">
          <div className="ui-stack">
            {BANNER_TONES.map((t) => (
              <Banner key={t} tone={t}>
                {t === 'error' && 'No se pudo guardar. Revisa los campos marcados.'}
                {t === 'success' && 'Liga creada correctamente.'}
                {t === 'info' && 'Se enviará una invitación al correo del jugador.'}
                {t === 'warning' && 'Esta acción desactivará el equipo para todos.'}
              </Banner>
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Formularios" hint="TextField, TextArea, Select y FieldError (conectan con react-hook-form vía ref).">
          <div className="ui-form-demo">
            <TextField
              id="ui-name"
              label="Nombre de la liga"
              placeholder="Ej. Liga Kaibil"
              hint="Se muestra públicamente en el directorio."
            />
            <TextField
              id="ui-email"
              label="Correo"
              type="email"
              defaultValue="no-valido@"
              error="Ingresa un correo válido."
            />
            <TextArea
              id="ui-desc"
              label="Descripción"
              placeholder="Breve descripción de la liga…"
              rows={3}
            />
            <Select id="ui-format" label="Formato" defaultValue="7v7">
              <option value="1v1">1v1</option>
              <option value="5v5">5v5</option>
              <option value="7v7">7v7</option>
              <option value="11v11">11v11</option>
            </Select>
            <div>
              <span className="input-label">FieldError suelto</span>
              <FieldError message="Este campo es obligatorio." />
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Feedback" hint="Estado vacío con título, descripción y acción.">
          <Stage wide>
            <EmptyState
              title="Aún no hay ligas"
              description="Crea tu primera liga para empezar a organizar torneos y equipos."
              actions={<Button variant="primary" startIcon={<Plus size={16} />}>Crear liga</Button>}
            />
          </Stage>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Superposiciones" hint="Modal y ConfirmDialog (pruébalos aquí).">
          <Row>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Abrir Modal
            </Button>
            <Button variant="coral" onClick={() => setConfirmOpen(true)} startIcon={<Trash2 size={16} />}>
              Abrir ConfirmDialog
            </Button>
          </Row>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Crear equipo"
            description="Ejemplo de Modal con header, body y footer."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>Guardar</Button>
              </>
            }
          >
            <div className="ui-form-demo">
              <TextField id="ui-team" label="Nombre del equipo" placeholder="Ej. Halcones FC" />
              <Select id="ui-team-format" label="Formato" defaultValue="7v7">
                <option value="5v5">5v5</option>
                <option value="7v7">7v7</option>
                <option value="11v11">11v11</option>
              </Select>
            </div>
          </Modal>

          <ConfirmDialog
            open={confirmOpen}
            title="¿Eliminar liga?"
            message="Esta acción desactivará la liga y todos sus equipos quedarán sin torneo activo."
            confirmLabel="Sí, eliminar"
            onConfirm={() => { setConfirmOpen(false); }}
            onClose={() => setConfirmOpen(false)}
          />
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Stepper" hint="Indicador de pasos para formularios multi-paso.">
          <Stage wide>
            <Stepper
              steps={STEPS}
              current={step}
              onBack={() => setStep((s) => Math.max(0, s - 1))}
              onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              onCancel={resetStepper}
              submitLabel="Crear liga"
              isLast={step === STEPS.length - 1}
              submitting={false}
            >
              <div className="ui-step-body">
                {step === 0 && (
                  <div className="ui-form-demo">
                    <TextField id="ui-step-name" label="Nombre" placeholder="Liga Kaibil" />
                    <Select id="ui-step-league" label="Liga" defaultValue="">
                      <option value="">Selecciona…</option>
                      <option value="a">Liga A</option>
                      <option value="b">Liga B</option>
                    </Select>
                  </div>
                )}
                {step === 1 && (
                  <div className="ui-form-demo">
                    <Select id="ui-step-format" label="Formato" defaultValue="7v7">
                      <option value="5v5">5v5</option>
                      <option value="7v7">7v7</option>
                      <option value="11v11">11v11</option>
                    </Select>
                    <TextField id="ui-step-season" label="Temporada" placeholder="2026" />
                  </div>
                )}
                {step === 2 && (
                  <Banner tone="info">
                    Revisa los datos y pulsa <strong>Crear liga</strong> para finalizar.
                  </Banner>
                )}
              </div>
            </Stepper>
          </Stage>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Iconos" hint="Iconos del app (components/icons) + lucide-react ya disponible.">
          <Row>
            <span className="ui-ico"><Check size={18} /><em>Check</em></span>
            <span className="ui-ico"><X size={18} /><em>X</em></span>
            <span className="ui-ico"><AlertTriangle size={18} /><em>Alert</em></span>
            <span className="ui-ico"><Info size={18} /><em>Info</em></span>
            <span className="ui-ico"><CheckCircle2 size={18} /><em>Success</em></span>
            <span className="ui-ico"><Search size={18} /><em>Search</em></span>
            <span className="ui-ico"><ArrowLeft size={18} /><em>Back</em></span>
            <span className="ui-ico"><ArrowRight size={18} /><em>Next</em></span>
            <span className="ui-ico"><Plus size={18} /><em>Add</em></span>
            <span className="ui-ico"><Trash2 size={18} /><em>Delete</em></span>
          </Row>
        </Section>
      </div>
    </div>
  );
}
