import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';

import { Badge, Button, ConfirmModal, Modal, PageHeader, SectionCard, SelectField, StatsRow, SwitchField } from '@/components/common';
import { Icon } from '@/components/Icon';
import { fetchShopSettings, saveShopSettings, type ShopSettings } from '@/data/live';
import { isSupabaseConfigured } from '@/data/supabase';
import { useShop } from '@/state/ShopContext';
import { ShopLocationPicker } from './ShopLocationPicker';
import type { ShopPoint } from './shop-location';

const TEAL = '#0d9488';
const tealStyle = { background: TEAL, borderColor: TEAL } as const;

interface ShopConfig {
  open: boolean;
  graceMinutes: number;
  noticeAhead: number;
  preferentialEvery: number;
  shopLatitude: number | null;
  shopLongitude: number | null;
  shopAddress: string | null;
}

const demoConfig: ShopConfig = {
  open: true,
  graceMinutes: 5,
  noticeAhead: 2,
  preferentialEvery: 3,
  shopLatitude: null,
  shopLongitude: null,
  shopAddress: null,
};

function CardIcon({ name }: { name: 'clock' | 'users' | 'store' | 'bell' | 'info' }) {
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
  const { business } = useShop();
  const ticketUrl = business?.ticketUrl ?? '';
  const [config, setConfig] = useState<ShopConfig>(demoConfig);
  const [identity, setIdentity] = useState<{ name: string; code: string; timezone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState('Sin cambios en esta sesión');
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showDiscard, setShowDiscard] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    fetchShopSettings()
      .then((settings: ShopSettings) => {
        if (!active) return;
        setConfig({
          open: settings.open,
          graceMinutes: settings.graceMinutes,
          noticeAhead: settings.noticeAhead,
          preferentialEvery: settings.preferentialEvery,
          shopLatitude: settings.shopLatitude,
          shopLongitude: settings.shopLongitude,
          shopAddress: settings.shopAddress,
        });
        setIdentity({ name: settings.name, code: settings.code, timezone: settings.timezone });
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function generateQr() {
    try {
      const dataUrl = await QRCode.toDataURL(ticketUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  }

  function update<K extends keyof ShopConfig>(key: K, value: ShopConfig[K]) {
    setSaved(false);
    setError(null);
    setConfig((current) => ({ ...current, [key]: value }));
  }

  /** Abrir/cerrar se aplica al instante: es lo único aquí que mueve plata. */
  async function toggleOpen(next: boolean) {
    if (togglingOpen || loading) return;
    setTogglingOpen(true);
    setError(null);
    const previous = config.open;
    setConfig((current) => ({ ...current, open: next }));
    try {
      if (!isSupabaseConfigured()) {
        setSaved(true);
        setLastModified('Modo demo: el cambio no sale de este dispositivo.');
        return;
      }
      await saveShopSettings({ ...config, open: next });
      setSaved(true);
      setLastModified(
        new Date().toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      );
    } catch {
      setConfig((current) => ({ ...current, open: previous }));
      setError('No pudimos cambiar el estado del local. Intenta de nuevo.');
    } finally {
      setTogglingOpen(false);
    }
  }

  function save(event?: FormEvent) {
    event?.preventDefault();

    if (!isSupabaseConfigured()) {
      setSaved(true);
      setLastModified('Modo demo: los cambios no salen de este dispositivo.');
      return;
    }

    setSaved(false);
    setError(null);
    setStatus('saving');

    saveShopSettings(config)
      .then(() => {
        setStatus('idle');
        setSaved(true);
        setLastModified(
          new Date().toLocaleString('es-PE', {
            timeZone: 'America/Lima',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        );
      })
      .catch(() => {
        setStatus('idle');
        setError('No pudimos guardar en el servidor. Intenta de nuevo.');
      });
  }

  function reset() {
    setSaved(false);
    setError(null);

    if (!isSupabaseConfigured()) {
      setConfig(demoConfig);
      return;
    }

    setLoading(true);
    fetchShopSettings()
      .then((settings: ShopSettings) => {
        setConfig({
          open: settings.open,
          graceMinutes: settings.graceMinutes,
          noticeAhead: settings.noticeAhead,
          preferentialEvery: settings.preferentialEvery,
           shopLatitude: settings.shopLatitude,
           shopLongitude: settings.shopLongitude,
            shopAddress: settings.shopAddress,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Configuración"
        subtitle="Reglas vivas del local: lo que cambies aquí mueve la app y el panel."
        actions={
          <Button disabled={status === 'saving'} style={tealStyle} type="submit">
            {status === 'saving' ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        }
      />

      <StatsRow
        stats={[
          { label: 'Estado del local', value: config.open ? 'Abierto' : 'Cerrado', icon: 'store', foot: config.open ? 'Recibe turnos' : 'No recibe turnos' },
          { label: 'Tolerancia actual', value: `${config.graceMinutes} min`, icon: 'clock', foot: 'Ventana antes de marcar ausente' },
          { label: 'Aviso al cliente', value: `${config.noticeAhead} pos.`, icon: 'bell', foot: 'Cuándo se le avisa en la fila' },
          { label: 'Preferencial cada', value: `${config.preferentialEvery}`, icon: 'users', foot: 'Intercalado de preferenciales' },
        ]}
      />

      {!isSupabaseConfigured() ? (
        <SectionCard
          title="Modo demo"
          detail="Sin Supabase: todo lo que cambies aquí vive solo en este dispositivo."
          icon={<CardIcon name="info" />}
        >
          <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
            Conecta Supabase para mover la app real y el panel del equipo.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Estado del local"
        detail="Abrir o cerrar se aplica al instante, sin pasar por Guardar."
        icon={<CardIcon name="store" />}
      >
        <SwitchField
          id="shop-open"
          label={togglingOpen ? 'Cambiando estado…' : 'Local abierto'}
          detail="Cerrado: la app no acepta turnos nuevos hasta reabrir."
          checked={config.open}
          onChange={(v) => void toggleOpen(v)}
        />

        <Divider />

        <div style={{ display: 'grid', gap: 8 }}>
          <div className="muted" style={{ font: 'var(--text-body)' }}>
            Local: <strong style={{ color: 'var(--ink)' }}>{identity?.name ?? business?.name ?? '—'}</strong>
          </div>
          <div className="muted" style={{ font: 'var(--text-body)' }}>
            Código: <strong style={{ color: 'var(--ink)' }}>{identity?.code ?? business?.accessCode ?? '—'}</strong>
            {' · '}
            Zona: <strong style={{ color: 'var(--ink)' }}>{identity?.timezone ?? 'America/Lima'}</strong>
          </div>
        </div>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button onClick={() => { setShowQr(true); generateQr(); }} variant="secondary">
            Previsualizar QR
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Tiempos y avisos"
        detail="Gracia de ausencia, aviso de posición e intercalado preferencial."
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
            { label: '7 minutos', value: 7 },
            { label: '10 minutos', value: 10 },
            { label: '12 minutos', value: 12 },
            { label: '15 minutos', value: 15 },
          ]}
          help={`Al vencer ${config.graceMinutes} min sin presentarse, el turno se marca ausente.`}
        />

        <Divider />

        <SelectField
          label="Aviso al cliente"
          value={config.noticeAhead}
          onChange={(v) => update('noticeAhead', Number(v))}
          options={[
            { label: 'Cuando falte 1 turno', value: 1 },
            { label: 'Cuando falten 2 turnos', value: 2 },
            { label: 'Cuando falten 3 turnos', value: 3 },
          ]}
          help="Posición en la fila a la que el cliente recibe su aviso."
        />

        <Divider />

        <SelectField
          label="Preferencial cada"
          value={config.preferentialEvery}
          onChange={(v) => update('preferentialEvery', Number(v))}
          options={[
            { label: 'Cada 2 turnos', value: 2 },
            { label: 'Cada 3 turnos', value: 3 },
            { label: 'Cada 4 turnos', value: 4 },
            { label: 'Cada 5 turnos', value: 5 },
          ]}
          help="Cada cuántos turnos entra uno preferencial en la cola."
        />
      </SectionCard>

      <SectionCard
        title="Ubicación del local"
        detail="Fija el punto del local para que los clientes vean cómo llegar. Sin punto, la app no muestra distancia ni tiempo."
        icon={<CardIcon name="store" />}
      >
        <ShopLocationPicker
          value={
            config.shopLatitude !== null && config.shopLongitude !== null
              ? { lat: config.shopLatitude, lng: config.shopLongitude }
              : null
          }
           onChange={(point: ShopPoint | null) => {
            setSaved(false);
            setError(null);
            setConfig((current) => ({
              ...current,
              shopLatitude: point?.lat ?? null,
              shopLongitude: point?.lng ?? null,
            }));
           }}
           address={config.shopAddress}
           onAddressChange={(address) => update('shopAddress', address)}
           disabled={status === 'saving'}
        />
      </SectionCard>

      <SectionCard
        title="Reglas fijas del sistema"
        detail="Las define el producto y no se configuran aquí."
        icon={<CardIcon name="info" />}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
            · 1 turno activo por cliente (lo garantiza el servidor).
          </p>
          <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
            · Al vencer la gracia, el turno se marca ausente y la cola avanza.
          </p>
          <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
            · El invitado se identifica con su nombre al tomar el turno.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Guardar cambios"
        detail={`Última modificación: ${lastModified}`}
        action={<Badge tone={saved ? 'success' : 'gold'}>{saved ? 'Guardado' : 'Cambios sin guardar'}</Badge>}
      >
        {loading ? (
          <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
            Trayendo la configuración del local…
          </p>
        ) : null}
        {error ? (
          <p className="auth__error" role="alert" style={{ font: 'var(--text-body)', margin: 0 }}>
            {error}
          </p>
        ) : null}
        <div className="filters">
          <Button onClick={() => setShowDiscard(true)} variant="secondary">
            Descartar cambios
          </Button>
          <Button disabled={status === 'saving'} style={{ ...tealStyle, width: '100%' }} type="submit">
            {status === 'saving' ? 'Guardando…' : 'Guardar configuración operativa'}
          </Button>
          {saved ? <span className="muted">Cambios guardados{saved && isSupabaseConfigured() ? ' en el servidor.' : ' en este dispositivo.'}</span> : null}
        </div>
      </SectionCard>

      <ConfirmModal
        confirmIcon="refresh"
        confirmLabel="Descartar"
        confirmVariant="primary"
        detail="Se pierden los cambios sin guardar y vuelve lo del servidor."
        onCancel={() => setShowDiscard(false)}
        onConfirm={() => { setShowDiscard(false); reset(); }}
        open={showDiscard}
        title="¿Descartar cambios?"
      />

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
            <strong style={{ font: 'var(--text-headline)' }}>{business?.name ?? 'Turnify'}</strong>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR para tomar turno" style={{ width: 200, height: 200 }} />
            ) : (
              <span className="muted">Generando QR...</span>
            )}
            <span className="muted">{ticketUrl}</span>
          </div>

            <p className="muted" style={{ margin: 0 }}>
              {config.open
                ? 'El local recibe turnos: este código acepta turnos nuevos.'
                : 'Local cerrado: el papel sigue en el mostrador, pero el servidor rechaza turnos nuevos hasta reabrir.'}
            </p>
        </Modal>
      ) : null}
    </form>
  );
}
