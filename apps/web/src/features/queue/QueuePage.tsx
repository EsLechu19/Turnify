import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';

import { Badge, Button, Card, CardHead, CardNote, InfoCell, MiniStat, PageHeader, SectionCard, TwoColumnGrid } from '@/components/common';
import { availabilityLabels } from '@/data/mocks/panel';
import { panelRepository } from '@/data/repositories';
import { formatWait } from '@/utils/format';
import { nextActionableTicket } from '@/data/selectors';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { QueueTicket, TeamMember, TicketStatus } from '@/data/types';
import { useQueue } from '@/state/QueueContext';

import { StatusBadge } from './components/StatusBadge';
import { QR_CELLS, buildQrMatrix } from './qr';

const business = panelRepository.business();
const serviceMix = panelRepository.serviceMix();
const branch = panelRepository.branch();

/** Display state of a station: the member plus their live ticket. */
type StationStatus = 'disponible' | 'ocupado' | 'fuera_de_turno';

/** Same copy the stations and team cards show, keyed by the station view state. */
const stationStatusLabels: Record<StationStatus, string> = {
  ocupado: availabilityLabels.atencion,
  disponible: availabilityLabels.disponible,
  fuera_de_turno: availabilityLabels.fuera,
};

function stationStatusOf(availability: TeamMember['availability']): StationStatus {
  if (availability === 'atencion') {
    return 'ocupado';
  }

  if (availability === 'fuera') {
    return 'fuera_de_turno';
  }

  return 'disponible';
}

function timeLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const chipStyle: CSSProperties = {
  alignItems: 'center',
  background: 'var(--brand-softest)',
  border: '1px solid var(--border)',
  borderRadius: '50%',
  display: 'grid',
  flex: 'none',
  font: 'var(--text-label)',
  height: 26,
  justifyContent: 'center',
  width: 26,
};

export function QueuePage() {
  const { tickets: panelTickets, team, queues, changeStatus: onStatusChange } = useQueue();
  const [paused, setPaused] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTickets, setManualTickets] = useState<QueueTicket[]>([]);
  const [screenOnline, setScreenOnline] = useState(true);
  const [copied, setCopied] = useState(false);
  const [ticketOverrides, setTicketOverrides] = useState<Record<string, Partial<QueueTicket>>>({});
  const [form, setForm] = useState({
    customer: '',
    priority: false,
    queueId: queues[0].id,
    service: serviceMix[0].service,
  });

  const isCompact = useMediaQuery('(max-width: 1500px)');
  const isNarrow = useMediaQuery('(max-width: 1300px)');

  const qrMatrix = useMemo(() => buildQrMatrix(business.name), []);
  const allTickets = useMemo(
    () =>
      [...manualTickets, ...panelTickets].map((ticket) =>
        ticketOverrides[ticket.id] ? { ...ticket, ...ticketOverrides[ticket.id] } : ticket,
      ),
    [manualTickets, ticketOverrides, panelTickets],
  );

  const waiting = useMemo(
    () => allTickets.filter((ticket) => ticket.status === 'espera').sort((a, b) => b.waitedMinutes - a.waitedMinutes),
    [allTickets],
  );

  const absent = useMemo(
    () => allTickets.filter((ticket) => ticket.status === 'ausente').sort((a, b) => b.arrivesAt.localeCompare(a.arrivesAt)),
    [allTickets],
  );

  const called = allTickets.filter((ticket) => ticket.status === 'llamado');
  const next = nextActionableTicket(allTickets);
  const averageWait =
    waiting.length === 0 ? 0 : Math.round(waiting.reduce((sum, ticket) => sum + ticket.waitedMinutes, 0) / waiting.length);

  const stations = team.map((member, index) => {
    const current =
      allTickets.find((ticket) => ticket.barber === member.name && ticket.status === 'atencion') ??
      allTickets.find((ticket) => ticket.barber === member.name && ticket.status === 'llamado') ??
      null;
    const status: StationStatus = current ? 'ocupado' : stationStatusOf(member.availability);

    return { current, index: index + 1, member, status };
  });

  const occupied = stations.filter((station) => station.status === 'ocupado').length;
  const availableBarbers = team.filter((member) => member.availability === 'disponible');

  function applyLocalStatus(ticket: QueueTicket, status: TicketStatus): QueueTicket {
    if (status === 'llamado' || status === 'atencion') {
      const fallback = team.find((member) => member.availability !== 'fuera')?.name ?? null;

      return { ...ticket, barber: ticket.barber ?? fallback, status };
    }

    if (status === 'finalizado') {
      return { ...ticket, status, waitedMinutes: 0 };
    }

    return { ...ticket, status };
  }

  function handleStatus(id: string, status: TicketStatus) {
    if (id.startsWith('manual-')) {
      setManualTickets((current) => current.map((ticket) => (ticket.id === id ? applyLocalStatus(ticket, status) : ticket)));

      return;
    }

    onStatusChange(id, status);
  }

  function assignBarber(ticketId: string) {
    if (availableBarbers.length === 0) {
      return;
    }

    const currentBarber = allTickets.find((ticket) => ticket.id === ticketId)?.barber ?? null;
    const load = (name: string) =>
      allTickets.filter(
        (ticket) => ticket.barber === name && (ticket.status === 'atencion' || ticket.status === 'llamado'),
      ).length;

    const others = availableBarbers.filter((member) => member.name !== currentBarber);
    const pool = others.length > 0 ? others : availableBarbers;
    const chosen = [...pool].sort((a, b) => load(a.name) - load(b.name))[0];

    setTicketOverrides((current) => ({ ...current, [ticketId]: { ...current[ticketId], barber: chosen.name } }));
  }

  function reincorporate(ticket: QueueTicket) {
    const reset = { arrivesAt: timeLabel(new Date()), waitedMinutes: 0 };

    setTicketOverrides((current) => ({ ...current, [ticket.id]: { ...current[ticket.id], ...reset } }));

    if (ticket.id.startsWith('manual-')) {
      setManualTickets((current) =>
        current.map((item) => (item.id === ticket.id ? { ...item, ...reset, status: 'espera' } : item)),
      );

      return;
    }

    onStatusChange(ticket.id, 'espera');
  }

  function togglePaused() {
    setPaused((value) => {
      const nextValue = !value;

      if (nextValue) {
        setShowManualForm(false);
      }

      return nextValue;
    });
  }

  function handleManualSubmit(event: FormEvent) {
    event.preventDefault();

    const customer = form.customer.trim();

    if (customer === '') {
      return;
    }

    const queue = queues.find((item) => item.id === form.queueId) ?? queues[0];
    const numbers = allTickets
      .filter((ticket) => ticket.code.startsWith(queue.prefix))
      .map((ticket) => Number.parseInt(ticket.code.slice(queue.prefix.length + 1), 10))
      .filter((value) => Number.isFinite(value));
    const nextNumber = (numbers.length > 0 ? Math.max(...numbers) : 100) + 1;

    setManualTickets((current) => [
      {
        id: `manual-${Date.now()}`,
        arrivesAt: timeLabel(new Date()),
        barber: null,
        code: `${queue.prefix}-${String(nextNumber).padStart(3, '0')}`,
        customer,
        priority: form.priority,
        queueId: queue.id,
        service: form.service,
        status: 'espera',
        waitedMinutes: 0,
      },
      ...current,
    ]);

    setForm({ customer: '', priority: false, queueId: queues[0].id, service: serviceMix[0].service });
    setShowManualForm(false);
  }

  function copyAccessCode() {
    if (!navigator.clipboard) {
      return;
    }

    navigator.clipboard
      .writeText(branch.accessCode)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  }

  const nextQueueName = next ? queues.find((queue) => queue.id === next.queueId)?.name ?? '—' : '';

  return (
    <>
      <PageHeader
        title="Cola en tiempo real"
        subtitle={
          <>
            <span style={{ alignItems: 'center', display: 'flex', font: 'var(--text-body)', gap: 8 }}>
              <span
                style={{
                  background: paused ? 'var(--gold)' : 'var(--success)',
                  borderRadius: '50%',
                  boxShadow: paused ? 'none' : '0 0 0 4px var(--success-soft)',
                  display: 'inline-block',
                  flex: 'none',
                  height: 9,
                  width: 9,
                }}
              />
              {paused
                ? 'En pausa · no se están recibiendo nuevas entradas'
                : 'Operativa y recibiendo clientes por QR / mostrador'}
            </span>
            <span style={{ font: 'var(--text-body)' }}>
              Tiempo de espera actual para nuevo cliente :{' '}
              <strong style={{ color: paused ? 'var(--gold-ink)' : 'var(--brand)' }}>{formatWait(averageWait)}</strong>
              {waiting.length > 0 ? (
                <span className="muted" style={{ font: 'var(--text-caption)' }}>
                  {' '}
                  · {waiting.length} {waiting.length === 1 ? 'cliente esperando' : 'clientes esperando'}
                </span>
              ) : null}
            </span>
          </>
        }
        actions={
          <>
            <Button
              disabled={paused}
              icon="plus"
              onClick={() => setShowManualForm((value) => !value)}
              variant={paused ? 'secondary' : 'primary'}
            >
              Añadir turno manual
            </Button>
            <Button icon={paused ? 'refresh' : 'pause'} onClick={togglePaused} variant={paused ? 'primary' : 'secondary'}>
              {paused ? 'Reanudar nuevas entradas' : 'Pausar nuevas entradas'}
            </Button>
          </>
        }
      />

      {showManualForm && !paused ? (
        <Card>
          <CardHead
            action={
              <Button icon="close" onClick={() => setShowManualForm(false)} size="sm" variant="ghost">
                Cerrar
              </Button>
            }
            detail="Para clientes que llegan al mostrador sin escanear el QR."
            title="Añadir turno manual"
          />

          <form onSubmit={handleManualSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Cliente</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
                  placeholder="Nombre y apellido"
                  required
                  value={form.customer}
                />
                <small>Se agrega al final de la fila.</small>
              </label>

              <label className="field">
                <span>Servicio</span>
                <select
                  onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                  value={form.service}
                >
                  {serviceMix.map((item) => (
                    <option key={item.service} value={item.service}>
                      {item.service}
                    </option>
                  ))}
                </select>
                <small>Servicio que va a recibir.</small>
              </label>

              <label className="field">
                <span>Fila</span>
                <select
                  onChange={(event) => setForm((current) => ({ ...current, queueId: event.target.value }))}
                  value={form.queueId}
                >
                  {queues.map((queue) => (
                    <option key={queue.id} value={queue.id}>
                      {queue.name}
                    </option>
                  ))}
                </select>
                <small>Define el código del turno.</small>
              </label>
            </div>

            <div className="switch-row" style={{ marginTop: 16 }}>
              <span>
                <strong style={{ display: 'block' }}>Turno preferencial</strong>
                <span className="muted">Se atiende antes que los turnos normales.</span>
              </span>
              <input
                checked={form.priority}
                className="switch"
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.checked }))}
                type="checkbox"
              />
            </div>

            <div className="filters" style={{ marginTop: 16 }}>
              <Button icon="plus" type="submit">
                Crear turno
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <SectionCard
        title="Estaciones de trabajo"
        detail="Estado de cada puesto, barbero asignado y turno en curso"
        action={<Badge tone={occupied > 0 ? 'brand' : 'success'}>{`${occupied} / ${stations.length}`}</Badge>}
      >
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {stations.map((station) => (
            <div
              key={station.member.id}
              style={{
                background: station.status === 'fuera_de_turno' ? '#f1f3f7' : 'var(--brand-softest)',
                border: `1px solid ${station.status === 'fuera_de_turno' ? '#dde2ea' : 'var(--brand-border)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gap: 10,
                padding: 14,
              }}
            >
              <div style={{ alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <span
                  style={{
                    color: station.status === 'fuera_de_turno' ? 'var(--ink-faint)' : 'var(--ink)',
                    font: 'var(--text-eyebrow)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Estación {station.index}
                </span>
                {station.status === 'fuera_de_turno' ? (
                  <span
                    className="badge"
                    style={{ background: '#e4e9f0', borderColor: '#d3dae4', color: '#5f6b7d' }}
                  >
                    {stationStatusLabels[station.status]}
                  </span>
                ) : (
                  <Badge tone={station.status === 'ocupado' ? 'brand' : 'success'}>
                    {stationStatusLabels[station.status]}
                  </Badge>
                )}
              </div>

              <div>
                <strong
                  style={{
                    color: station.status === 'fuera_de_turno' ? 'var(--ink-muted)' : 'var(--ink)',
                    display: 'block',
                    font: 'var(--text-headline)',
                  }}
                >
                  {station.member.name}
                </strong>
                <span className="muted" style={{ font: 'var(--text-caption)' }}>
                  {station.member.completedToday} atenciones hoy
                </span>
              </div>

              {station.current ? (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    gap: 6,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <span className="table__code">{station.current.code}</span>
                    <StatusBadge ticket={station.current} />
                  </div>
                  <strong>{station.current.customer}</strong>
                  <span className="muted" style={{ font: 'var(--text-caption)' }}>
                    {station.current.service}
                  </span>
                  <span className="muted" style={{ font: 'var(--text-caption)' }}>
                    {station.current.status === 'atencion' ? 'Atiende desde' : 'Llamado a las'} {station.current.arrivesAt}
                  </span>
                </div>
              ) : (
                <span
                  className="muted"
                  style={{
                    color: station.status === 'fuera_de_turno' ? 'var(--ink-faint)' : undefined,
                    font: 'var(--text-caption)',
                  }}
                >
                  {station.status === 'disponible'
                    ? 'Disponible para el siguiente turno'
                    : 'Fuera de turno · sin asignación'}
                </span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <TwoColumnGrid>
        <SectionCard
          title="Avisar cliente"
          detail="Siguiente turno en la fila de atención"
          style={{ minHeight: 420 }}
          action={
            <Badge tone={availableBarbers.length > 0 ? 'success' : 'neutral'}>
              {availableBarbers.length === 0
                ? 'Sin barberos disponibles'
                : availableBarbers.length === 1
                  ? '1 barbero disponible'
                  : `${availableBarbers.length} barberos disponibles`}
            </Badge>
          }
        >
          <div style={{ alignContent: 'start', display: 'grid', gap: 16 }}>
            {next ? (
              <div style={{ alignContent: 'start', display: 'grid', gap: 14 }}>
                <div
                  style={{
                    background: 'var(--brand-softest)',
                    border: '1px solid var(--brand-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'grid',
                    gap: 14,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 2 }}>
                      <span
                        className="muted"
                        style={{ font: 'var(--text-caption)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                      >
                        Turno a avisar
                      </span>
                      <strong style={{ font: 'var(--text-metric)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {next.code}
                      </strong>
                    </div>

                    <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                      <StatusBadge ticket={next} />
                      <span className="muted" style={{ font: 'var(--text-caption)' }}>
                        Espera {formatWait(next.waitedMinutes)} · llegó {next.arrivesAt}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      padding: '12px 14px',
                    }}
                  >
                    <InfoCell label="Cliente" value={next.customer} />
                    <InfoCell label="Servicio" value={next.service} />
                    <InfoCell label="Fila" value={nextQueueName} />
                    <InfoCell label="Barbero" value={next.barber ?? 'Sin asignar'} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                    gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(170px, 1fr))',
                  }}
                >
                  <Button
                    disabled={availableBarbers.length === 0}
                    icon="user-plus"
                    onClick={() => assignBarber(next.id)}
                    size="lg"
                    variant="secondary"
                  >
                    {next.barber ? 'Cambiar barbero' : 'Asignar barbero'}
                  </Button>
                  <Button icon="check" onClick={() => handleStatus(next.id, 'atencion')} size="lg">
                    Confirmar atención
                  </Button>
                  <Button icon="user-xmark" onClick={() => handleStatus(next.id, 'ausente')} size="lg" variant="danger">
                    Marcar ausente
                  </Button>
                </div>

                {availableBarbers.length > 0 ? (
                  <span className="muted" style={{ font: 'var(--text-caption)' }}>
                    Disponibles ahora: {availableBarbers.map((member) => member.name).join(', ')}
                  </span>
                ) : null}
              </div>
            ) : (
              <CardNote>Sin turnos por avisar, la cola está al día.</CardNote>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Ausentes recientes"
          detail="Clientes que no se presentaron al servicio tras el periodo de tolerancia asignado"
          style={{ minHeight: 420 }}
          action={<Badge tone={absent.length > 0 ? 'danger' : 'neutral'}>{absent.length}</Badge>}
        >
          <div style={{ alignContent: 'start', display: 'grid', gap: 16 }}>
            {absent.length === 0 ? (
              <CardNote>Nadie se ha marcado ausente hoy.</CardNote>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {absent.map((ticket, index) => (
                  <article
                    key={ticket.id}
                    style={{
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'grid',
                      gap: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span style={chipStyle}>{index + 1}</span>
                      <strong style={{ font: 'var(--text-body-strong)' }}>{ticket.customer}</strong>
                      <Badge tone="danger">Ausente</Badge>
                      <span
                        className="muted"
                        style={{
                          font: 'var(--text-caption)',
                          marginLeft: isCompact ? 0 : 'auto',
                          textAlign: isCompact ? 'left' : 'right',
                        }}
                      >
                        {ticket.code} · {ticket.service}
                      </span>
                    </div>

                    <div
                      style={{
                        alignItems: isCompact ? 'flex-start' : 'center',
                        borderTop: '1px dashed var(--border)',
                        display: 'flex',
                        flexDirection: isCompact ? 'column' : 'row',
                        flexWrap: 'wrap',
                        gap: 10,
                        justifyContent: isCompact ? 'flex-start' : 'space-between',
                        paddingTop: 10,
                      }}
                    >
                      <span className="muted" style={{ font: 'var(--text-caption)' }}>
                        Motivo: no se presentó al llamado · tiempo de tolerancia agotado
                      </span>
                      <Button icon="refresh" onClick={() => reincorporate(ticket)} size="sm" variant="secondary">
                        Reincorporar al final de la cola
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </TwoColumnGrid>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: isNarrow ? 'minmax(0, 1fr)' : 'minmax(0, 1.6fr) minmax(260px, 1fr)',
        }}
      >
        <Card>
          <div style={{ alignContent: 'start', display: 'grid', gap: 16 }}>
            <CardHead
              detail="Ordenados por el tiempo que llevan esperando"
              title="Esperando en el local"
            />

            {waiting.length === 0 ? (
              <CardNote>Nadie esperando en el local.</CardNote>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Turno</th>
                      <th>Cliente</th>
                      <th>Servicio</th>
                      <th>Barbero</th>
                      <th>Check-in</th>
                      <th>Tiempo en espera</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waiting.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <span className="table__code">{ticket.code}</span>
                        </td>
                        <td>{ticket.customer}</td>
                        <td className="muted">{ticket.service}</td>
                        <td>{ticket.barber ?? <span className="muted">Sin asignar</span>}</td>
                        <td className="muted">{ticket.arrivesAt}</td>
                        <td>{formatWait(ticket.waitedMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead
            action={
              <Badge tone={screenOnline ? 'success' : 'danger'} icon={screenOnline ? 'check-circle' : 'close'}>
                {screenOnline ? 'Conectada' : 'Sin conexión'}
              </Badge>
            }
            detail="QR de acceso y pantalla de la sala"
            title="Mostrador"
          />

          <div
            style={{
              background: 'var(--brand-softest)',
              border: '1px solid var(--brand-border)',
              borderRadius: 'var(--radius-md)',
              display: 'grid',
              gap: 10,
              justifyItems: 'center',
              padding: 12,
            }}
          >
            <div
              aria-label={`Código QR de ${business.name}`}
              role="img"
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'grid',
                gridTemplateColumns: `repeat(${QR_CELLS}, 1fr)`,
                padding: 6,
                width: 118,
              }}
            >
              {qrMatrix.flatMap((row, y) =>
                row.map((on, x) => (
                  <span key={`${y}-${x}`} style={{ aspectRatio: '1', background: on ? 'var(--ink)' : '#fff' }} />
                )),
              )}
            </div>

            <span className="muted" style={{ font: 'var(--text-caption)', textAlign: 'center' }}>
              Escanean para tomar turno · {business.branch}
            </span>

            <div
              style={{
                alignItems: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'space-between',
                padding: '8px 10px',
                width: '100%',
              }}
            >
              <div style={{ display: 'grid' }}>
                <span
                  className="muted"
                  style={{ font: 'var(--text-caption)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  Código en la app
                </span>
                <strong style={{ font: 'var(--text-headline)', letterSpacing: '0.08em' }}>{branch.accessCode}</strong>
              </div>
              <Button icon={copied ? 'check' : 'copy'} onClick={copyAccessCode} size="sm" variant="secondary">
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'grid',
              gap: 10,
              padding: 12,
            }}
          >
            <div style={{ display: 'grid', gap: 2 }}>
              <span
                className="muted"
                style={{ font: 'var(--text-caption)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Pantalla principal de la sala
              </span>
              <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                <span
                  style={{
                    background: screenOnline ? 'var(--success)' : 'var(--danger)',
                    borderRadius: '50%',
                    flex: 'none',
                    height: 9,
                    width: 9,
                  }}
                />
                <strong style={{ font: 'var(--text-body-strong)' }}>
                  {screenOnline ? 'Transmitiendo la cola en vivo' : 'Desconectada'}
                </strong>
              </span>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                padding: '8px 6px',
              }}
            >
              <MiniStat label="Llamando" value={called.length} />
              <MiniStat label="Esperando" value={waiting.length} />
              <MiniStat label="Estaciones" value={`${occupied}/${stations.length}`} />
            </div>

            <Button
              icon={screenOnline ? 'pause' : 'refresh'}
              onClick={() => setScreenOnline((value) => !value)}
              size="sm"
              variant={screenOnline ? 'secondary' : 'primary'}
            >
              {screenOnline ? 'Simular desconexión' : 'Reconectar pantalla'}
            </Button>

            {paused ? (
              <Badge tone="gold" icon="pause">
                Entradas pausadas para el QR
              </Badge>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}