import { useState, type FormEvent } from 'react';
import QRCode from 'qrcode';

import { Badge, Button, CardGrid, CheckboxGroup, Modal, PageHeader, RadioGroup, SectionCard, SegmentedControl, SelectField, StatsRow, SwitchField, TextareaField } from '@/components/common';
import { Icon } from '@/components/Icon';
import { panelRepository } from '@/data/repositories';

const business = panelRepository.business();

const TEAL = '#0d9488';
const tealStyle = { background: TEAL, borderColor: TEAL } as const;

type Channel = 'sms' | 'whatsapp' | 'ambos';
type ExpireAction = 'ausente' | 'confirmacion';

interface OperationalConfig {
  graceMinutes: number;
  secondNotice: boolean;
  expireAction: ExpireAction;
  autoReturn: boolean;
  capacityLimit: number;
  maxTicketsPerClient: number;
  autoPause: boolean;
  pauseMinutes: number;
  pauseMessage: string;
  qrEnabled: boolean;
  geoEnabled: boolean;
  counterAssisted: boolean;
  requireName: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
  channel: Channel;
  noticeAhead: number;
  calledTemplate: string;
}

const initialConfig: OperationalConfig = {
  autoPause: true,
  autoReturn: true,
  calledTemplate: '¡{cliente}, es tu turno! Acércate al mostrador y preséntate con tu código.',
  capacityLimit: 15,
  channel: 'whatsapp',
  counterAssisted: true,
  expireAction: 'ausente',
  geoEnabled: true,
  graceMinutes: 5,
  maxTicketsPerClient: 1,
  noticeAhead: 2,
  pauseMessage: 'Pausamos un momento la toma de turnos para ordenar el local. Volvemos enseguida.',
  pauseMinutes: 10,
  qrEnabled: true,
  requireEmail: false,
  requireName: true,
  requirePhone: true,
  secondNotice: true,
};

const CHANNEL_OPTIONS = [
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Ambos', value: 'ambos' },
];

const NOTICE_OPTIONS = [
  { label: 'Sin aviso preventivo', value: 0 },
  { label: 'Cuando falen 3 turnos', value: 3 },
  { label: 'Cuando falten 2 turnos', value: 2 },
  { label: 'Cuando falte 1 turno', value: 1 },
];

const channelLabels: Record<Channel, string> = {
  ambos: 'Ambos',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

function CardIcon({ name }: { name: 'clock' | 'users' | 'store' | 'bell' }) {
  return (
    <span
      style={{
        alignItems: 'center',
        background: 'var(--brand-softest)',
        border: '1px solid var(--brand-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--brand)',
        display: 'inline-flex',
        flex: 'none',
        height: 36,
        justifyContent: 'center',
        width: 36,
      }}
    >
      <Icon name={name} size={18} />
    </span>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />;
}

export function SettingsPage() {
  const [config, setConfig] = useState<OperationalConfig>(initialConfig);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [lastModified, setLastModified] = useState('Sin cambios en esta sesión');
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  async function generateQr() {
    try {
      const dataUrl = await QRCode.toDataURL(business.ticketUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  }

  function update<K extends keyof OperationalConfig>(key: K, value: OperationalConfig[K]) {
    setSaved(false);
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function save(event?: FormEvent) {
    event?.preventDefault();
    setSaved(false);
    setStatus('saving');

    window.setTimeout(() => {
      setStatus('idle');
      setSaved(true);
      setLastModified(
        new Date().toLocaleString('es-PE', {
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      );
    }, 500);
  }

  function reset() {
    setConfig(initialConfig);
    setSaved(false);
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Configuración"
        subtitle="Reglas de gracia, capacidad de fila, toma de turnos y avisos a clientes."
        actions={
          <Button disabled={status === 'saving'} style={tealStyle} type="submit">
            {status === 'saving' ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        }
      />

      <StatsRow
        stats={[
          { label: 'Tolerancia actual', value: `${config.graceMinutes} min`, icon: 'clock', foot: 'Ventana antes de marcar ausente' },
          { label: 'Capacidad máxima', value: `${config.capacityLimit} personas`, icon: 'users', foot: 'Límite de fila dentro del local' },
          { label: 'Geocerca QR', value: config.geoEnabled ? 'Activada' : 'Desactivada', icon: 'store', foot: 'Radio de 80 m sobre el QR del mostrador' },
          { label: 'Canal directo', value: channelLabels[config.channel], icon: 'bell', foot: 'Canal de avisos a clientes' },
        ]}
      />

      <CardGrid>
        <SectionCard
          title="Tiempo de gracia y expiración"
          detail="Define cuánto tolera el local antes de liberar un turno y qué pasa al vencer."
          icon={<CardIcon name="clock" />}
        >
          <SelectField
            label="Tiempo de gracia"
            value={config.graceMinutes}
            onChange={(v) => update('graceMinutes', Number(v))}
            options={[
              { label: '1 minuto', value: 1 },
              { label: '3 minutos', value: 3 },
              { label: '5 minutos', value: 5 },
              { label: '10 minutos', value: 10 },
              { label: '15 minutos', value: 15 },
            ]}
            help={`El barbero puede retrasarse hasta ${config.graceMinutes} min antes de liberar el turno.`}
          />

          <Divider />

          <SwitchField
            id="second-notice"
            label="Segundo aviso preventivo"
            detail="Aviso recordatorio al cliente justo antes de vencer la gracia."
            checked={config.secondNotice}
            onChange={(v) => update('secondNotice', v)}
          />

          <Divider />

          <RadioGroup
            name="expire-action"
            label="Acción automática al expirar"
            options={[
              { value: 'ausente', label: 'Marcar ausente y liberar el turno', detail: 'El turno pasa a ausente y la cola avanza sin pedir nada al cliente.' },
              { value: 'confirmacion', label: 'Mantener el turno y pedir confirmación al cliente', detail: 'El turno queda congelado hasta que el cliente confirma su llegada o vence el tiempo máximo.' },
            ]}
            value={config.expireAction}
            onChange={(v) => update('expireAction', v as ExpireAction)}
          />

          <Divider />

          <SwitchField
            id="auto-return"
            label="Reincorporación automática (30 min)"
            detail="Si llega dentro de los 30 minutos siguientes, vuelve a la cola con su prioridad original."
            checked={config.autoReturn}
            onChange={(v) => update('autoReturn', v)}
          />
        </SectionCard>

        <SectionCard
          title="Reglas de Turnos Activos y Capacidad de Fila"
          detail="Cuánta gente puede esperar dentro y cuántos turnos puede tomar el mismo cliente."
          icon={<CardIcon name="users" />}
        >
          <SelectField
            label="Límite de personas en el local"
            value={config.capacityLimit}
            onChange={(v) => update('capacityLimit', Number(v))}
            options={[
              { label: '10 personas', value: 10 },
              { label: '15 personas', value: 15 },
              { label: '20 personas', value: 20 },
              { label: '25 personas', value: 25 },
            ]}
            help="Recomendado: 15"
          />

          <SelectField
            label="Turnos máximos por cliente"
            value={config.maxTicketsPerClient}
            onChange={(v) => update('maxTicketsPerClient', Math.max(1, Number(v) || 1))}
            options={[
              { label: '1 turno', value: 1 },
              { label: '2 turnos', value: 2 },
              { label: '3 turnos', value: 3 },
            ]}
            help="Regla estricta: 1 turno activo por cliente en el local."
          />

          <Divider />

          <SwitchField
            id="auto-pause"
            label="Pausa automática de turnos"
            detail="Se detiene la toma de turnos cuando la fila supera la capacidad configurada."
            checked={config.autoPause}
            onChange={(v) => update('autoPause', v)}
          />

          {config.autoPause ? (
            <>
              <Divider />

              <SelectField
                label="Duración de la pausa"
                value={config.pauseMinutes}
                onChange={(v) => update('pauseMinutes', Number(v))}
                options={[
                  { label: '5 minutos', value: 5 },
                  { label: '10 minutos', value: 10 },
                  { label: '15 minutos', value: 15 },
                  { label: '30 minutos', value: 30 },
                ]}
                help="Tiempo mínimo reabierto tras la pausa."
              />

              <TextareaField
                label="Mensaje mostrado al cliente"
                value={config.pauseMessage}
                onChange={(v) => update('pauseMessage', v)}
                help="Se muestra en el QR mientras los turnos están pausados."
              />
            </>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Política de Toma de Turno"
          detail="Cómo entra la gente al sistema: QR, ubicación, mostrador y datos obligatorios."
          icon={<CardIcon name="store" />}
        >
          <SwitchField
            id="qr-enabled"
            label="QR de toma de turnos"
            detail="El cliente escanea el QR del mostrador para tomar su turno."
            checked={config.qrEnabled}
            onChange={(v) => update('qrEnabled', v)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge tone={config.qrEnabled ? 'success' : 'neutral'}>
              {config.qrEnabled ? 'QR activo' : 'QR desactivado'}
            </Badge>
            <Button onClick={() => { setShowQr(true); generateQr(); }} variant="secondary">
              Previsualizar QR
            </Button>
          </div>

          <Divider />

          <SwitchField
            id="geo-enabled"
            label="Geocerca GPS"
            detail="Solo permite escanear dentro de un radio de 80 m del local, verificado por GPS."
            checked={config.geoEnabled}
            onChange={(v) => update('geoEnabled', v)}
          />

          <SwitchField
            id="counter-assisted"
            label="Mostrador asistido"
            detail="El staff puede registrar el turno por el cliente cuando lo pide en mostrador."
            checked={config.counterAssisted}
            onChange={(v) => update('counterAssisted', v)}
          />

          <Divider />

          <CheckboxGroup
            label="Datos requeridos al tomar turno"
            options={[
              { value: 'name', label: 'Nombre del cliente', checked: config.requireName },
              { value: 'phone', label: 'Teléfono o WhatsApp', checked: config.requirePhone },
              { value: 'email', label: 'Correo electrónico', checked: config.requireEmail },
            ]}
            onToggle={(val, checked) => {
              if (val === 'name') update('requireName', checked);
              if (val === 'phone') update('requirePhone', checked);
              if (val === 'email') update('requireEmail', checked);
            }}
          />
        </SectionCard>

        <SectionCard
          title="Preferencias de Notificaciones"
          detail="Canales, avisos de posición y plantillas que reciben tus clientes."
          icon={<CardIcon name="bell" />}
        >
          <div className="field">
            <span>Canal de envío</span>
            <SegmentedControl options={CHANNEL_OPTIONS} value={config.channel} onChange={(v) => update('channel', v as Channel)} />
            <small>Los avisos salen por {channelLabels[config.channel]}.</small>
          </div>

          <Divider />

          <SelectField
            label="Aviso preventivo"
            value={config.noticeAhead}
            onChange={(v) => update('noticeAhead', Number(v))}
            options={NOTICE_OPTIONS}
            help={config.noticeAhead === 0 ? 'El cliente solo se avisa cuando es su turno.' : `Se avisa cuando falten ${config.noticeAhead} turnos.`}
          />

          <TextareaField
            label="Plantilla de turno llamado"
            value={config.calledTemplate}
            onChange={(v) => update('calledTemplate', v)}
            help="Usa {cliente} para el nombre y {codigo} para el código del turno."
          />
        </SectionCard>
      </CardGrid>

      <SectionCard
        title="Configuración operativa lista para producción"
        detail={`Última modificación: ${lastModified}`}
        action={<Badge tone={saved ? 'success' : 'neutral'}>{saved ? 'Cambios guardados' : 'Lista para producción'}</Badge>}
      >
        <div className="filters">
          <Button onClick={reset} variant="secondary">
            Restablecer valores
          </Button>
          <Button disabled={status === 'saving'} style={{ ...tealStyle, width: '100%' }} type="submit">
            {status === 'saving' ? 'Guardando…' : 'Guardar configuración operativa'}
          </Button>
          {saved ? <span className="muted">Cambios guardados en este dispositivo.</span> : null}
        </div>
      </SectionCard>

      {showQr ? (
        <Modal
          detail="Coloca este código en el mostrador para que los clientes tomen su turno."
          maxWidth={480}
          onClose={() => setShowQr(false)}
          title="Previsualizar QR"
        >
          <div
            style={{
              alignItems: 'center',
              background: 'var(--brand-softest)',
              border: '1.5px dashed var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              display: 'grid',
              gap: 12,
              justifyItems: 'center',
              padding: '28px 20px',
              textAlign: 'center',
            }}
          >
            <span className="eyebrow">Escanea para tomar turno</span>
            <strong style={{ font: 'var(--text-headline)' }}>{business.name}</strong>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR para tomar turno" style={{ width: 200, height: 200 }} />
            ) : (
              <span className="muted">Generando QR...</span>
            )}
            <span className="muted">{business.ticketUrl}</span>
          </div>

          <p className="muted" style={{ margin: 0 }}>
            {config.qrEnabled
              ? 'El QR está activo y acepta turnos mientras la empresa esté abierta.'
              : 'El QR está desactivado: el enlace no aceptará turnos nuevos.'}
          </p>
        </Modal>
      ) : null}
    </form>
  );
}