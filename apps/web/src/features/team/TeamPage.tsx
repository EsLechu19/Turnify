import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Icon } from '@/components/Icon';
import { Badge, Button, ConfirmModal, DetailRow, EmptyState, FormModal, IconButton, Modal, PageHeader, SectionCard, StatsRow } from '@/components/common';
import { formatDuration, formatPrice, initialsOf } from '@/utils/format';
import { staffAvailabilityLabels, staffAvailabilityTone } from '@/data/labels';
import { fetchShopWorkerRequests, generateWorkerInvitation, resolveWorkerRequest, updateStaff, type ShopWorkerRequest } from '@/data/live';
import { staffRepository } from '@/data/repositories';
import { useServices } from '@/state/ServicesContext';
import type { ServiceRecord, StaffAvailability, StaffRecord } from '@/data/types';

type AvailabilityFilter = 'todas' | 'disponible' | 'atencion' | 'pausa';
type StatusFilter = 'todos' | 'activo' | 'inactivo';

type StaffModal =
  | { type: 'detail'; id: string }
  | { type: 'edit'; id: string }
  | { type: 'delete'; id: string }
  | null;

interface StaffDraft {
  name: string;
  active: boolean;
  availability: StaffAvailability;
  serviceIds: string[];
}

const availabilityFilters: { label: string; value: AvailabilityFilter }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Disponible', value: 'disponible' },
  { label: 'En atención', value: 'atencion' },
  { label: 'En pausa', value: 'pausa' },
];

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activo' },
  { label: 'Inactivos', value: 'inactivo' },
];

function emptyDraft(member: StaffRecord, serviceIds: string[]): StaffDraft {
    return {
      active: member.active,
      availability: member.availability === 'disponible' || member.availability === 'fuera' ? member.availability : 'disponible',
      name: member.name,
      serviceIds,
    };
  }

export function TeamPage() {
  const { services, reloadServices } = useServices();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [query, setQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [modal, setModal] = useState<StaffModal>(null);
  const [draft, setDraft] = useState<StaffDraft | null>(null);
  const [formError, setFormError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [requests, setRequests] = useState<ShopWorkerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function loadStaff() {
    setLoadingStaff(true);
    staffRepository
      .list()
      .then((members) => {
        setStaff(members);
        setLoadingStaff(false);
      })
      .catch(() => setLoadingStaff(false));
  }

  function loadRequests() {
    setLoadingRequests(true);
    fetchShopWorkerRequests()
      .then((rows) => {
        setRequests(rows);
        setLoadingRequests(false);
      })
      .catch(() => setLoadingRequests(false));
  }

  useEffect(() => {
    loadStaff();
    loadRequests();
  }, []);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();

    if (!inviteEmail.includes('@') || inviting) {
      if (!inviteEmail.includes('@')) setInviteError('Ingresa un correo válido.');
      return;
    }

    setInviting(true);
    setInviteError('');
    setCopiedInvite(false);

    try {
      setInviteCode(await generateWorkerInvitation(inviteEmail));
    } catch {
      setInviteError('No pudimos generar la invitación. Intenta de nuevo.');
    } finally {
      setInviting(false);
    }
  }

  function copyInviteCode() {
    if (!inviteCode || !navigator.clipboard) {
      return;
    }

    navigator.clipboard
      .writeText(inviteCode)
      .then(() => {
        setCopiedInvite(true);
        window.setTimeout(() => setCopiedInvite(false), 1600);
      })
      .catch(() => undefined);
  }

  async function handleResolve(requestId: string, approve: boolean) {
    if (resolvingId) return;
    setResolvingId(requestId);

    try {
      await resolveWorkerRequest(requestId, approve);
      loadRequests();
      loadStaff();
    } finally {
      setResolvingId(null);
    }
  }

  const modalMember = modal && 'id' in modal ? (staff.find((member) => member.id === modal.id) ?? null) : null;

  function servicesOf(memberId: string): ServiceRecord[] {
    return services.filter((service) => service.barberIds.includes(memberId));
  }

  const inLocal = staff.filter((member) => member.active && member.availability !== 'fuera').length;
  const available = staff.filter((member) => member.active && member.availability === 'disponible').length;
  const paused = staff.filter((member) => member.active && member.availability === 'descanso').length;
  const offShift = staff.filter((member) => member.active && member.availability === 'fuera').length;
  const completedToday = staff.reduce((sum, member) => sum + member.completedToday, 0);
  const activeCount = staff.filter((member) => member.active).length;

  const filtered = staff.filter((member) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      needle.length === 0 || member.name.toLowerCase().includes(needle);
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'activo' && member.active) ||
      (statusFilter === 'inactivo' && !member.active);
    const matchesAvailability =
      availabilityFilter === 'todas' ||
      (availabilityFilter === 'disponible' && member.availability === 'disponible') ||
      (availabilityFilter === 'atencion' && member.availability === 'atencion') ||
      (availabilityFilter === 'pausa' && (member.availability === 'descanso' || member.availability === 'fuera'));

    return matchesQuery && matchesStatus && matchesAvailability;
  });

  function openEdit(member: StaffRecord) {
    setDraft(emptyDraft(member, servicesOf(member.id).map((service) => service.id)));
    setFormError('');
    setModal({ id: member.id, type: 'edit' });
  }

  function handleDraftChange(patch: Partial<StaffDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleService(serviceId: string) {
    if (!draft) {
      return;
    }

    const next = draft.serviceIds.includes(serviceId)
      ? draft.serviceIds.filter((id) => id !== serviceId)
      : [...draft.serviceIds, serviceId];

    handleDraftChange({ serviceIds: next });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!draft || !modalMember || savingDraft) {
      return;
    }

    const name = draft.name.trim();

    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setSavingDraft(true);
    setFormError('');

    try {
      await updateStaff({
        barberId: modalMember.id,
        name,
        availability: draft.availability === 'fuera' ? 'fuera_de_turno' : 'disponible',
        active: draft.active,
        serviceIds: draft.serviceIds,
      });
      setModal(null);
      loadStaff();
      reloadServices();
    } catch {
      setFormError('No pudimos guardar. Si atiende un turno, terminalo antes de cambiar su estado.');
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleDeactivate() {
    if (!modalMember || savingDraft) {
      return;
    }

    const nextActive = !modalMember.active;
    setSavingDraft(true);

    try {
      await updateStaff({
        barberId: modalMember.id,
        name: modalMember.name,
        availability: 'fuera_de_turno',
        active: nextActive,
        serviceIds: servicesOf(modalMember.id).map((service) => service.id),
      });
      setModal(null);
      loadStaff();
      reloadServices();
    } catch {
      setFormError('No pudimos cambiar su estado. Si atiende un turno, terminalo antes.');
      setModal(null);
    } finally {
      setSavingDraft(false);
    }
  }

  const filteredServices = useMemo(() => services, [services]);

  return (
    <>
      <PageHeader
        title="Barberos y empleados"
        subtitle={`${inLocal} en el local · ${available} disponibles para llamar · ${completedToday} servicios completados hoy.`}
        actions={
          <Badge icon="users" tone="brand">
            {activeCount} activos
          </Badge>
        }
      />

      <StatsRow
        stats={[
          { label: 'Barberos en el local', value: String(inLocal), icon: 'users', foot: `${activeCount} activos · ${staff.length} registrados` },
          { label: 'Disponibles para llamar', value: String(available), icon: 'zap', foot: 'Listos para el siguiente turno' },
          { label: 'En pausa', value: String(paused), icon: 'pause', foot: `${offShift} fuera de atención` },
          { label: 'Cortes completados', value: String(completedToday), icon: 'scissors', foot: 'Acumulado del turno de hoy' },
        ]}
      />

      <SectionCard
        title="Plantilla del turno"
        detail="Disponibilidad, servicios autorizados y ritmo de cada miembro del equipo."
        action={<Badge icon="users" tone="brand">{filtered.length} personas</Badge>}
      >

        <div className="filters" style={{ justifyContent: 'space-between' }}>
          <div className="filters">
            <div className="search">
              <Icon name="search" size={17} />
              <input
                aria-label="Buscar por nombre"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre..."
                type="search"
                value={query}
              />
            </div>

            <div className="segment">
              {availabilityFilters.map((option) => (
                <button
                  aria-pressed={availabilityFilter === option.value}
                  key={option.value}
                  onClick={() => setAvailabilityFilter(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="segment">
              {statusOptions.map((option) => (
                <button
                  aria-pressed={statusFilter === option.value}
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <span className="muted" style={{ font: 'var(--text-caption)' }}>
            {filtered.length} de {staff.length} empleados
          </span>
        </div>

        {loadingStaff ? (
          <EmptyState detail="Trayendo al equipo del local…" title="Cargando equipo" />
        ) : filtered.length === 0 ? (
          <EmptyState detail="Ajusta la búsqueda o los filtros para ver miembros del equipo." title="Nadie coincide" />
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Barbero</th>
                  <th scope="col">Disponibilidad</th>
                  <th scope="col">Servicios autorizados</th>
                  <th scope="col">Atendidos hoy</th>
                  <th scope="col">Ritmo promedio</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const own = servicesOf(member.id);

                  return (
                    <tr key={member.id} style={member.active ? undefined : { opacity: 0.6 }}>
                      <td>
                        <span style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                          {member.fotoUrl ? (
                            <img
                              alt=""
                              src={member.fotoUrl}
                              style={{ borderRadius: '50%', flex: 'none', height: 34, objectFit: 'cover', width: 34 }}
                            />
                          ) : (
                            <span
                              style={{
                                alignItems: 'center',
                                background: 'var(--brand-softest)',
                                border: '1px solid var(--brand-border)',
                                borderRadius: '50%',
                                color: 'var(--brand-deep)',
                                display: 'flex',
                                flex: 'none',
                                font: 'var(--text-label)',
                                height: 34,
                                justifyContent: 'center',
                                width: 34,
                              }}
                            >
                              {initialsOf(member.name)}
                            </span>
                          )}
                          <span style={{ display: 'grid', minWidth: 0 }}>
                            <strong style={{ font: 'var(--text-body-strong)' }}>{member.name}</strong>
                            <span className="muted" style={{ font: 'var(--text-caption)' }}>
                              {member.role === 'admin' ? 'Administrador' : 'Barbero'}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="cell--nowrap">
                        <Badge tone={staffAvailabilityTone[member.availability]}>
                          {staffAvailabilityLabels[member.availability]}
                        </Badge>
                      </td>
                      <td className="cell--nowrap">
                        {own.length === 0 ? (
                          <span className="muted">Sin asignar</span>
                        ) : own.length === 1 ? (
                          <span>{own[0].name}</span>
                        ) : (
                            <button
                              className="badge badge--brand"
                              onClick={() => setModal({ id: member.id, type: 'detail' })}
                              style={{ cursor: 'pointer' }}
                              title="Ver ficha y servicios autorizados"
                              type="button"
                            >
                            <Icon name="scissors" size={13} />
                            {own.length} asignados
                          </button>
                        )}
                      </td>
                      <td>{member.completedToday}</td>
                      <td>{member.paceMinutes == null ? <span className="muted">—</span> : `${member.paceMinutes} min/servicio`}</td>
                      <td className="cell--nowrap">
                        <div className="table__actions">
                          <IconButton
                            icon="eye"
                            label={`Ver detalle de ${member.name}`}
                            onClick={() => setModal({ id: member.id, type: 'detail' })}
                          />
                          <IconButton
                            icon="edit"
                            label={`Editar ${member.name}`}
                            onClick={() => openEdit(member)}
                          />
                          <IconButton
                            icon={member.active ? 'trash' : 'refresh'}
                            label={member.active ? `Desactivar ${member.name}` : `Reactivar ${member.name}`}
                            onClick={() => setModal({ id: member.id, type: 'delete' })}
                            tone={member.active ? 'danger' : 'ghost'}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Invitar trabajador por correo"
        detail="Solo esa cuenta puede canjear el código, válido por 7 días."
        action={<Badge icon="users" tone="brand">Nominativa</Badge>}
      >
        <form onSubmit={handleInvite}>
          <div className="filters">
            <div className="search">
              <Icon name="search" size={17} />
              <input
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                  setInviteError('');
                  setInviteCode(null);
                }}
                placeholder="correo@ejemplo.com"
                type="email"
                value={inviteEmail}
              />
            </div>
            <Button disabled={inviting} icon="plus" type="submit">
              {inviting ? 'Generando…' : 'Generar invitación'}
            </Button>
          </div>
        </form>

        {inviteError ? (
          <p className="auth__error" role="alert" style={{ margin: '12px 0 0' }}>
            {inviteError}
          </p>
        ) : null}

        {inviteCode ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <span className="muted" style={{ font: 'var(--text-caption)' }}>
              Pasale este código al trabajador por donde quieras. Sirve una vez y solo para {inviteEmail}.
            </span>
            <div style={{ alignItems: 'center', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ font: 'var(--text-headline)', letterSpacing: '0.06em' }}>{inviteCode}</strong>
              <Button icon={copiedInvite ? 'check' : 'copy'} onClick={copyInviteCode} size="sm" variant="secondary">
                {copiedInvite ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Solicitudes pendientes"
        detail="Aprueba o deniega el ingreso a tu barbería."
        action={<Badge icon="users" tone="brand">{requests.length} pendientes</Badge>}
      >
        {loadingRequests ? (
          <EmptyState detail="Trayendo las solicitudes…" title="Cargando solicitudes" />
        ) : requests.length === 0 ? (
          <EmptyState detail="Cuando un trabajador canjee su invitación, aparece aquí para aprobar." title="Sin solicitudes" />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {requests.map((request) => (
              <div
                key={request.requestId}
                className="row-split"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                }}
              >
                <span style={{ display: 'grid' }}>
                  <strong style={{ font: 'var(--text-body-strong)' }}>{request.name ?? 'Trabajador'}</strong>
                  <span className="muted" style={{ font: 'var(--text-caption)' }}>
                    Solicitada {request.requestedAt ? new Date(request.requestedAt).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <Button
                    disabled={resolvingId !== null}
                    onClick={() => void handleResolve(request.requestId, true)}
                    size="sm"
                  >
                    Aprobar
                  </Button>
                  <Button
                    disabled={resolvingId !== null}
                    onClick={() => void handleResolve(request.requestId, false)}
                    size="sm"
                    variant="secondary"
                  >
                    Denegar
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {modal?.type === 'detail' && modalMember ? (
        <Modal
          detail="Ficha del empleado y servicios que está autorizado para atender."
          onClose={() => setModal(null)}
          title={modalMember.name}
          footer={
            <>
              <Button onClick={() => setModal(null)} variant="secondary">
                Cerrar
              </Button>
              <Button icon="edit" onClick={() => openEdit(modalMember)}>
                Editar
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <DetailRow label="Rol" value={modalMember.role === 'admin' ? 'Administrador' : 'Barbero'} />
            <DetailRow label="Disponibilidad" value={staffAvailabilityLabels[modalMember.availability]} />
            <DetailRow label="Atendidos hoy" value={String(modalMember.completedToday)} />
            <DetailRow
              label="Ritmo promedio"
              value={modalMember.paceMinutes == null ? '—' : `${modalMember.paceMinutes} min/servicio`}
            />
            <DetailRow label="Estado" value={modalMember.active ? 'Activo' : 'Inactivo'} />
            <DetailRow
              label="Servicios autorizados"
              value={
                servicesOf(modalMember.id).length === 0
                  ? 'Sin asignar'
                  : servicesOf(modalMember.id).map((service) => service.name).join(', ')
              }
            />
          </div>
        </Modal>
      ) : null}

      {modal?.type === 'edit' && draft ? (
        <FormModal
          detail="Actualiza su nombre, disponibilidad y servicios autorizados. Se guarda en el servidor."
          error={formError}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
          open
          submitLabel={savingDraft ? 'Guardando…' : 'Guardar cambios'}
          title={`Editar a ${modalMember?.name ?? ''}`}
        >
          <>
            <div className="form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  onChange={(event) => handleDraftChange({ name: event.target.value })}
                  required
                  value={draft.name}
                />
              </label>

              <label className="field">
                <span>Disponibilidad</span>
                <select
                  onChange={(event) =>
                    handleDraftChange({ availability: event.target.value as 'disponible' | 'fuera' })
                  }
                  value={draft.availability === 'fuera' ? 'fuera' : 'disponible'}
                >
                  <option value="disponible">Disponible</option>
                  <option value="fuera">Fuera de turno</option>
                </select>
                <small>El estado ocupado lo pone el sistema al llamar.</small>
              </label>
            </div>

              <label className="switch-row" htmlFor="staff-active">
                <span>
                  <strong style={{ display: 'block' }}>Empleado activo</strong>
                  <span className="muted">Los empleados inactivos no aparecen en la rotación de estaciones.</span>
                </span>
                <input
                  checked={draft.active}
                  className="switch"
                  id="staff-active"
                  onChange={(event) => handleDraftChange({ active: event.target.checked })}
                  type="checkbox"
                />
              </label>

              <fieldset style={{ border: 0, display: 'grid', gap: 8, margin: 0, padding: 0 }}>
                <legend className="muted" style={{ font: 'var(--text-label)', marginBottom: 4 }}>
                  Servicios autorizados
                </legend>

                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {filteredServices.map((service) => (
                    <label
                      key={service.id}
                      style={{
                        alignItems: 'center',
                        background: draft.serviceIds.includes(service.id)
                          ? 'var(--brand-softest)'
                          : 'var(--surface-muted)',
                        border: `1px solid ${
                          draft.serviceIds.includes(service.id) ? 'var(--brand-border)' : 'var(--border)'
                        }`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 10,
                        padding: '8px 10px',
                      }}
                    >
                      <input
                        checked={draft.serviceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        type="checkbox"
                      />
                      <span style={{ display: 'grid' }}>
                        <strong style={{ font: 'var(--text-body-strong)' }}>{service.name}</strong>
                        <span className="muted" style={{ font: 'var(--text-caption)' }}>
                          {formatDuration(service.durationSeconds)} · {formatPrice(service.priceCents)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
          </>
        </FormModal>
      ) : null}

      {modal?.type === 'delete' && modalMember ? (
        <ConfirmModal
          confirmIcon={modalMember.active ? 'trash' : 'refresh'}
          confirmLabel={modalMember.active ? 'Desactivar' : 'Reactivar'}
          confirmVariant={modalMember.active ? 'danger' : 'primary'}
          detail={
            modalMember.active
              ? 'Se revoca su acceso y sale de la rotación. Su historial se conserva.'
              : 'Recupera su acceso y vuelve a la rotación activa.'
          }
          onCancel={() => setModal(null)}
          onConfirm={handleDeactivate}
          open
          title={modalMember.active ? 'Desactivar empleado' : 'Reactivar empleado'}
        >
          <p style={{ font: 'var(--text-body)', margin: 0 }}>
            ¿Seguro que quieres {modalMember.active ? 'desactivar' : 'reactivar'} a{' '}
            <strong>«{modalMember.name}»</strong>?
          </p>
          <p className="muted" style={{ font: 'var(--text-caption)', margin: 0 }}>
            {modalMember.active
              ? 'Conserva su historial y sus servicios autorizados; puedes reactivarlo cuando vuelva al local.'
              : 'Volverá a recibir turnos y aparecerá en las estaciones.'}
          </p>
        </ConfirmModal>
      ) : null}
    </>
  );
}
