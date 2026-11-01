import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import {
  cancelGuestTicket, createGuestTicket, getCommercialCatalog, getGuestTicketState,
  normalizeGuestDetails, rateFinishedGuestTicket, respondToCalledGuestTicket,
  validateBusinessCode, type CommercialCatalog, type GuestTicketState,
} from './customer-public-api';
import { calledSecondsRemaining, canRespondToCall, GuestSessionController, ratingState } from './guest-session';
import { clearGuestAccess, readGuestAccess, writeGuestAccess } from './guest-access-storage';

const terminal = new Set<GuestTicketState['status']>(['finalizado', 'cancelado', 'ausente']);

function statusLabel(status: GuestTicketState['status']): string {
  return { en_espera: 'En espera', notificado: 'Notificado', llamado: 'Llamado', en_atencion: 'En atención', finalizado: 'Finalizado', cancelado: 'Cancelado', ausente: 'Ausente' }[status];
}

export function CustomerPublicPage() {
  const { businessCode = '' } = useParams();
  return <CustomerBusinessPage businessCode={businessCode} key={businessCode} />;
}

function CustomerBusinessPage({ businessCode }: { businessCode: string }) {
  const controller = useMemo(() => new GuestSessionController(businessCode, {
    read: () => readGuestAccess(businessCode),
    write: (access, deadline) => writeGuestAccess(businessCode, access, deadline),
    clear: () => clearGuestAccess(businessCode),
    create: createGuestTicket,
    refresh: getGuestTicketState,
    respond: respondToCalledGuestTicket,
    rate: rateFinishedGuestTicket,
    cancel: cancelGuestTicket,
  }), [businessCode]);
  const { access, ticket, error, busy, needsRefresh, storageWarning, updatedAt } = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [catalog, setCatalog] = useState<CommercialCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [ratingSelection, setRatingSelection] = useState<number | null>(null);

  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    let live = true;
    try {
      validateBusinessCode(businessCode);
    } catch {
      setCatalogError('El código del negocio no es válido.');
      return () => { live = false; };
    }
    setCatalogError(null);
    getCommercialCatalog(businessCode).then((next) => {
      if (live) setCatalog(next);
    }).catch((cause: unknown) => {
      if (live) setCatalogError(cause instanceof Error && cause.message === 'NEGOCIO_NO_ENCONTRADO'
        ? 'No encontramos ese negocio. Revisá el código del QR.'
        : 'No pudimos cargar el catálogo. Revisá tu conexión e intentá nuevamente.');
    });
    return () => { live = false; };
  }, [businessCode, catalogAttempt]);

  useEffect(() => {
    if (!access) return;
    void controller.refresh();
    const interval = window.setInterval(() => void controller.refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [access, controller]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog?.open || !selectedService || busy || access) return;
    try {
      const details = normalizeGuestDetails({ name, phone, whatsappConsent });
      void controller.create({ serviceId: selectedService, requestedBarberId: selectedBarber || null, details });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Revisá tus datos.');
    }
  }
  const [formError, setFormError] = useState<string | null>(null);
  const compatibleBarbers = catalog?.barbers.filter((barber) => barber.serviceIds.includes(selectedService)) ?? [];

  return (
    <main className="public-page">
      <header className="public-page__header"><span className="eyebrow">TURNIFY</span><span className="badge badge--brand">Sin instalar nada</span></header>
      {access ? ticket ? (
        <TicketView ticket={ticket} error={error} storageWarning={storageWarning} updatedAt={updatedAt} busy={busy} needsRefresh={needsRefresh} ratingSelection={ratingSelection}
          onRatingSelection={setRatingSelection} onRate={() => { if (ratingSelection != null) void controller.rate(ratingSelection); }}
          onRespond={(response) => void controller.respond(response)} onRefresh={() => void controller.refresh()}
          onCancel={() => void controller.cancel()} onRestart={() => { controller.restart(); setRatingSelection(null); }} />
      ) : (
        <div className="public-state" role="status">
          <strong>{error ? 'No pudimos recuperar tu turno' : 'Recuperando tu turno…'}</strong>
          <p>Tu acceso sigue guardado. No tomes otro turno hasta confirmar el estado de este.</p>
          {storageWarning ? <p role="alert">{storageWarning}</p> : null}
          {error ? <><p role="alert">{error}</p><Button onClick={() => void controller.refresh()} variant="secondary">Reintentar</Button></> : null}
        </div>
      ) : catalogError ? (
        <div className="public-state public-state--error" role="alert"><strong>{catalogError}</strong>
          <Button onClick={() => setCatalogAttempt((attempt) => attempt + 1)} variant="secondary">Reintentar</Button></div>
      ) : !catalog ? (
        <div className="public-state" role="status"><strong>Cargando el catálogo…</strong></div>
      ) : (
        <section className="public-page__content">
           <div className="page-title"><span className="eyebrow">{catalog.name} · Turno en 3 pasos</span><h1>Sumate a la fila</h1>
             <p>Elegí un servicio, indicá tus datos y confirmá. Después seguí tu código desde este navegador.</p></div>
          {!catalog.open ? <div className="public-state public-state--gold"><strong>El negocio está cerrado.</strong>
            <p>Ahora no se pueden tomar turnos. Volvé a intentarlo durante el horario de atención.</p></div>
          : catalog.services.length === 0 ? <div className="public-state"><strong>No hay servicios disponibles.</strong></div>
          : <form className="public-form" onSubmit={submit}>
            <div className="card"><h2>Elegí un servicio</h2><div className="public-options">{catalog.services.map((service) => (
              <label className={`public-option ${selectedService === service.serviceId ? 'public-option--selected' : ''}`} key={service.serviceId}>
                <input checked={selectedService === service.serviceId} name="service" onChange={() => { setSelectedService(service.serviceId); setSelectedBarber(''); }} required type="radio" value={service.serviceId} />
                 <span><strong>{service.name}</strong><small>{Math.ceil(service.estimatedDurationSeconds / 60)} min estimados{service.referencePriceCents != null ? ` · S/ ${(service.referencePriceCents / 100).toFixed(2)} de referencia` : ''}</small>{service.description ? <small>{service.description}</small> : null}</span>
              </label>
            ))}</div></div>
             <div className="card"><h2>Profesional (opcional)</h2><p>La asignación se confirma cuando llegue tu turno.</p><select aria-label="Profesional preferido" disabled={!selectedService} onChange={(event) => setSelectedBarber(event.target.value)} value={selectedBarber}>
              <option value="">Cualquier profesional disponible</option>{compatibleBarbers.map((barber) => (
                <option disabled={barber.operationalState !== 'disponible'} key={barber.barberId} value={barber.barberId}>
                  {barber.name}{barber.operationalState !== 'disponible' ? ' (no disponible)' : ''}
                </option>
              ))}</select></div>
            <div className="card"><h2>Tus datos</h2>
               <label className="field"><span>Nombre *</span><input autoComplete="name" maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} /></label>
               <label className="field"><span>Teléfono (opcional)</span><input autoComplete="tel" inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="+549…" value={phone} /></label>
              <label className="consent"><input checked={whatsappConsent} onChange={(event) => setWhatsappConsent(event.target.checked)} type="checkbox" />
                <span>Acepto que el negocio pueda contactarme por WhatsApp. Esto no implica un envío automático.</span></label>
              <Button disabled={busy || !selectedService} size="lg" type="submit">{busy ? 'Solicitando…' : 'Tomar mi turno'}</Button>
              {error || formError ? <p className="public-form__error" role="alert">{error || formError}</p> : null}
            </div>
          </form>}
        </section>
      )}
    </main>
  );
}

type TicketViewProps = {
  ticket: GuestTicketState;
  error: string | null;
  storageWarning: string | null;
  updatedAt: number | null;
  busy: boolean;
  needsRefresh: boolean;
  ratingSelection: number | null;
  onRatingSelection: (rating: number) => void;
  onRate: () => void;
  onRespond: (response: 'presente' | 'llega_en_2_min') => void;
  onRefresh: () => void;
  onCancel: () => void;
  onRestart: () => void;
};

function TicketView({ ticket, error, storageWarning, updatedAt, busy, needsRefresh, ratingSelection, onRatingSelection, onRate, onRespond, onRefresh, onCancel, onRestart }: TicketViewProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const finished = terminal.has(ticket.status);
  const waiting = ticket.status === 'en_espera' || ticket.status === 'notificado';
  const remaining = calledSecondsRemaining(ticket, now);
  const canRespond = !needsRefresh && canRespondToCall(ticket, now);
  const rating = ticket.status === 'finalizado' ? ratingState(ticket, now) : null;

  return <section className="public-page__content">
    <div className="page-title"><span className="eyebrow">TU TURNO</span>
      <h1 aria-live="polite">{ticket.status === 'llamado' ? 'Te están esperando' : finished ? statusLabel(ticket.status) : ticket.status === 'en_atencion' ? 'En atención' : 'Tu turno está registrado'}</h1>
      <p>{ticket.status === 'llamado' ? 'Avisá si ya estás presente o si llegás en los próximos dos minutos.'
        : ticket.status === 'finalizado' ? 'Gracias por visitarnos. La puntuación está disponible durante 24 horas desde que terminó la atención.'
        : ticket.status === 'en_atencion' ? 'Tu atención está en curso. Si ya terminó, actualizá el turno.'
        : ticket.status === 'cancelado' ? 'Este turno fue cancelado y ya no conserva tu lugar.'
        : ticket.status === 'ausente' ? 'Se agotó el plazo de presentación. Este turno ya no está activo.'
        : 'Guardá este código y prestá atención cuando te llamen en el local.'}</p>
    </div>
    <div className="ticket-hero"><span>CÓDIGO DE TURNO</span><strong>{ticket.visibleCode}</strong><b>{statusLabel(ticket.status)}</b></div>
    {ticket.serviceName || ticket.assignedBarberName || ticket.requestedBarberName ? <div className="card public-ticket-details">
      {ticket.serviceName ? <span>Servicio: <strong>{ticket.serviceName}</strong></span> : null}
      {ticket.assignedBarberName ? <span>Te atiende: <strong>{ticket.assignedBarberName}</strong></span>
        : ticket.requestedBarberName ? <span>Profesional preferido: <strong>{ticket.requestedBarberName}</strong> (pendiente de asignación)</span> : null}
    </div> : null}
    <p className="public-updated" role="status">{error ? 'No se pudo actualizar. Los datos pueden estar desactualizados. ' : ''}{updatedAt ? `Última actualización: ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(updatedAt)}.` : 'Esperando la primera actualización.'} <span>Se consulta cada 15 segundos mientras esta página esté abierta.</span></p>
    {waiting ? <div className="public-ticket-stats">
      <div className="card"><span>POSICIÓN</span><strong>{Number.isInteger(ticket.peopleAhead) && ticket.peopleAhead >= 0 ? ticket.peopleAhead + 1 : 'Sin datos'}</strong><small>{Number.isInteger(ticket.peopleAhead) && ticket.peopleAhead >= 0 ? `personas delante: ${ticket.peopleAhead}` : 'Actualizá para consultar'}</small></div>
      <div className="card"><span>ESPERA ESTIMADA</span><strong>{Number.isFinite(ticket.waitMinutes) && ticket.waitMinutes >= 0 ? `${ticket.waitMinutes} min` : 'Sin datos'}</strong><small>estimación, puede variar</small></div>
    </div> : null}
    {ticket.status === 'llamado' && !ticket.customerResponse ? <div className="card public-called">
      <h2>¿Llegaste?</h2>
      <p role="status">{remaining === null ? 'No hay un plazo disponible. Actualizá el turno para confirmar.'
        : remaining === 0 ? 'El plazo terminó. Actualizá el turno para conocer su estado.'
        : `Tiempo para responder: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}</p>
      <div className="public-actions"><Button disabled={busy || !!error || !canRespond} onClick={() => onRespond('presente')} variant="success">Estoy presente</Button>
        <Button disabled={busy || !!error || !canRespond} onClick={() => onRespond('llega_en_2_min')} variant="secondary">Llego en 2 minutos</Button></div>
    </div> : ticket.status === 'llamado' && ticket.customerResponse ? <div className="public-state public-state--gold">
      <strong>Respuesta registrada</strong><p>{ticket.customerResponse === 'presente' ? 'Le avisaste al negocio que ya estás presente.' : 'Le avisaste al negocio que llegás en los próximos dos minutos.'}</p>
    </div> : null}
    {ticket.status === 'finalizado' ? <div className="card public-rating">
      <h2>{rating === 'rated' ? 'Puntuación enviada' : rating === 'pending' ? '¿Cómo fue tu atención?' : 'Puntuación no disponible'}</h2>
      {rating === 'rated' ? <p>Gracias por tu puntuación de {ticket.rating} de 5.</p>
        : rating === 'expired' ? <p>El plazo de 24 horas para puntuar terminó.</p>
        : rating === 'unavailable' ? <p>No hay una fecha de finalización válida. No podemos habilitar la puntuación.</p> : <>
        <p>Elegí de 1 a 5 estrellas. Tu voto no se puede cambiar.</p>
        <div className="public-rating__choices" role="group" aria-label="Puntuación de la atención">{[1, 2, 3, 4, 5].map((value) => (
          <button aria-label={`${value} de 5`} aria-pressed={ratingSelection === value} className={ratingSelection != null && value <= ratingSelection ? 'public-rating__star public-rating__star--selected' : 'public-rating__star'} key={value} onClick={() => onRatingSelection(value)} type="button">★</button>
        ))}</div><Button disabled={busy || !!error || needsRefresh || ratingSelection == null} onClick={onRate}>Enviar puntuación</Button>
      </>}
    </div> : null}
    {storageWarning ? <div className="public-state public-state--error" role="alert"><strong>{storageWarning}</strong></div> : null}
    {error ? <div className="public-state public-state--error" role="alert"><strong>{error}</strong></div> : null}
    <div className="public-actions"><Button disabled={busy} onClick={onRefresh} variant="secondary" icon="refresh">Actualizar</Button>
      {waiting ? <Button disabled={busy || !!error || needsRefresh} onClick={onCancel} variant="danger">Cancelar turno</Button> : null}
      {finished ? <Button disabled={busy || needsRefresh} onClick={onRestart} variant="secondary">Tomar otro turno</Button> : null}
    </div>
  </section>;
}
