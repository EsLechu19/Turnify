import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import {
  cancelGuestTicket,
  createGuestTicket,
  getCommercialCatalog,
  getGuestTicketState,
  normalizeGuestDetails,
  validateBusinessCode,
  type CommercialCatalog,
  type GuestTicketAccess,
  type GuestTicketState,
} from './customer-public-api';

const TERMINAL_STATUSES = new Set<GuestTicketState['status']>(['finalizado', 'cancelado', 'ausente']);
const ACTIVE_STATUSES = new Set<GuestTicketState['status']>(['en_espera', 'notificado', 'llamado', 'en_atencion']);

function storageKey(businessCode: string): string {
  return `turnify.public-ticket-session.v1:${businessCode}`;
}

function readStoredAccess(businessCode: string): GuestTicketAccess | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(businessCode)) ?? 'null') as Partial<GuestTicketAccess> | null;
    return value?.ticketId && value.visibleCode && value.capability ? value as GuestTicketAccess : null;
  } catch {
    return null;
  }
}

function writeStoredAccess(businessCode: string, access: GuestTicketAccess) {
  sessionStorage.setItem(storageKey(businessCode), JSON.stringify(access));
}

function clearStoredAccess(businessCode: string) {
  sessionStorage.removeItem(storageKey(businessCode));
}

function errorCopy(error: unknown): string {
  if (error instanceof Error && error.message === 'NEGOCIO_NO_ENCONTRADO') return 'No encontramos ese negocio. Revisá el código del QR.';
  return 'No pudimos cargar la información. Revisá tu conexión e intentá nuevamente.';
}

function statusLabel(status: GuestTicketState['status']): string {
  return { en_espera: 'En espera', notificado: 'Notificado', llamado: 'Llamado', en_atencion: 'En atención', finalizado: 'Finalizado', cancelado: 'Cancelado', ausente: 'Ausente' }[status];
}

export function CustomerPublicPage() {
  const { businessCode = '' } = useParams();
  const [catalog, setCatalog] = useState<CommercialCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [access, setAccess] = useState<GuestTicketAccess | null>(null);
  const [ticket, setTicket] = useState<GuestTicketState | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validCode = useMemo(() => {
    try { validateBusinessCode(businessCode); return true; } catch { return false; }
  }, [businessCode]);

  const loadCatalog = () => {
    if (!validCode) { setCatalogError('El código del negocio no es válido.'); setLoadingCatalog(false); return; }
    setLoadingCatalog(true);
    setCatalogError(null);
    getCommercialCatalog(businessCode).then(setCatalog).catch((error: unknown) => setCatalogError(errorCopy(error))).finally(() => setLoadingCatalog(false));
  };

  useEffect(() => { loadCatalog(); }, [businessCode]);

  useEffect(() => {
    const stored = readStoredAccess(businessCode);
    if (stored) setAccess(stored);
  }, []);

  const refreshTicket = async () => {
    if (!access) return;
    setTicketError(null);
    try {
      const next = await getGuestTicketState(access);
      setTicket(next);
      if (TERMINAL_STATUSES.has(next.status)) clearStoredAccess(businessCode);
    } catch {
      setTicketError('No pudimos actualizar tu turno. Podés reintentar sin perder tu lugar.');
    }
  };

  useEffect(() => {
    if (!access) return;
    void refreshTicket();
    const interval = window.setInterval(() => void refreshTicket(), 15000);
    return () => window.clearInterval(interval);
  }, [access]);

  const compatibleBarbers = catalog?.barbers.filter((barber) => barber.serviceIds.includes(selectedService)) ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setTicketError(null);
    try {
      const details = normalizeGuestDetails({ name, phone, whatsappConsent });
      const nextAccess = await createGuestTicket({ businessCode, serviceId: selectedService, requestedBarberId: selectedBarber || null, details });
      writeStoredAccess(businessCode, nextAccess);
      setAccess(nextAccess);
      setTicket({ visibleCode: nextAccess.visibleCode, status: 'en_espera', peopleAhead: 0, waitMinutes: 0, serviceName: null, requestedBarberName: null, assignedBarberName: null });
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : 'No pudimos crear tu turno. Intentá nuevamente.');
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (!access || !ticket || !ACTIVE_STATUSES.has(ticket.status)) return;
    setBusy(true);
    try {
      await cancelGuestTicket(access);
      clearStoredAccess(businessCode);
      setTicket({ ...ticket, status: 'cancelado' });
    }
    catch { setTicketError('No pudimos cancelar el turno. Intentá nuevamente.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="public-page">
      <header className="public-page__header"><span className="eyebrow">TURNIFY</span><span className="badge badge--brand">Sin instalar nada</span></header>
      {loadingCatalog ? <div className="public-state"><strong>Cargando el catálogo…</strong></div> : catalogError ? <div className="public-state public-state--error" role="alert"><strong>{catalogError}</strong><p>Podés volver a intentar cuando quieras.</p><Button onClick={loadCatalog} variant="secondary">Reintentar</Button></div> : catalog && access && ticket ? (
        <TicketView ticket={ticket} error={ticketError} busy={busy} onRefresh={() => void refreshTicket()} onCancel={() => void cancel()} onRestart={() => { clearStoredAccess(businessCode); setAccess(null); setTicket(null); setTicketError(null); }} />
      ) : catalog ? (
        <section className="public-page__content"><div className="page-title"><span className="eyebrow">{catalog.name}</span><h1>Sumate a la fila</h1><p>Elegí tu servicio y recibí un código para seguir tu turno desde este navegador.</p></div>{!catalog.open ? <div className="public-state public-state--gold"><strong>El negocio está cerrado.</strong><p>Ahora no se pueden tomar turnos. Volvé a intentarlo durante el horario de atención.</p></div> : catalog.services.length === 0 ? <div className="public-state"><strong>No hay servicios disponibles.</strong><p>El negocio todavía no publicó servicios para tomar turnos.</p></div> : <form className="public-form" onSubmit={submit}><div className="card"><h2>Elegí un servicio</h2><div className="public-options">{catalog.services.map((service) => <label className={`public-option ${selectedService === service.serviceId ? 'public-option--selected' : ''}`} key={service.serviceId}><input checked={selectedService === service.serviceId} name="service" onChange={() => { setSelectedService(service.serviceId); setSelectedBarber(''); }} required type="radio" value={service.serviceId} /><span><strong>{service.name}</strong><small>{service.description || `${Math.ceil(service.estimatedDurationSeconds / 60)} min estimados`}</small></span></label>)}</div></div><div className="card"><h2>Profesional (opcional)</h2><select disabled={!selectedService} onChange={(event) => setSelectedBarber(event.target.value)} value={selectedBarber}><option value="">Cualquier profesional disponible</option>{compatibleBarbers.map((barber) => <option disabled={barber.operationalState !== 'disponible'} key={barber.barberId} value={barber.barberId}>{barber.name}{barber.operationalState !== 'disponible' ? ' (no disponible)' : ''}</option>)}</select></div><div className="card"><h2>Tus datos</h2><label className="field"><span>Nombre *</span><input maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} /></label><label className="field"><span>Teléfono (opcional)</span><input inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="+549…" value={phone} /></label><label className="consent"><input checked={whatsappConsent} onChange={(event) => setWhatsappConsent(event.target.checked)} type="checkbox" /><span>Acepto que el negocio pueda contactarme por WhatsApp. Esto no implica un envío automático.</span></label><Button disabled={busy || !selectedService} size="lg" type="submit">{busy ? 'Solicitando…' : 'Tomar mi turno'}</Button>{ticketError ? <p className="public-form__error" role="alert">{ticketError}</p> : null}</div></form>}</section>
      ) : null}
    </main>
  );
}

function TicketView({ ticket, error, busy, onRefresh, onCancel, onRestart }: { ticket: GuestTicketState; error: string | null; busy: boolean; onRefresh: () => void; onCancel: () => void; onRestart: () => void }) {
  const terminal = TERMINAL_STATUSES.has(ticket.status);
  return <section className="public-page__content"><div className="page-title"><span className="eyebrow">TU TURNO</span><h1>{terminal ? statusLabel(ticket.status) : 'Tu turno está registrado'}</h1><p>{terminal ? 'Este turno ya no está activo.' : 'Guardá este código y seguí la fila desde tu teléfono.'}</p></div><div className="ticket-hero"><span>CÓDIGO DE TURNO</span><strong>{ticket.visibleCode}</strong><b>{statusLabel(ticket.status)}</b></div><div className="public-ticket-stats"><div className="card"><span>POSICIÓN</span><strong>{terminal ? '—' : ticket.peopleAhead + 1}</strong><small>personas delante: {terminal ? '—' : ticket.peopleAhead}</small></div><div className="card"><span>ESPERA ESTIMADA</span><strong>{terminal ? '—' : `${ticket.waitMinutes} min`}</strong><small>se actualiza automáticamente</small></div></div>{error ? <div className="public-state public-state--error" role="alert"><strong>{error}</strong></div> : null}<div className="public-actions"><Button disabled={busy} onClick={onRefresh} variant="secondary" icon="refresh">Actualizar</Button>{!terminal && (ticket.status === 'en_espera' || ticket.status === 'notificado') ? <Button disabled={busy} onClick={onCancel} variant="danger">Cancelar turno</Button> : null}{terminal ? <Button onClick={onRestart}>Tomar otro turno</Button> : null}</div></section>;
}
