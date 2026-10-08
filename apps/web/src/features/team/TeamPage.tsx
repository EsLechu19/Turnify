import { useMemo, useState, type FormEvent } from 'react';

import { Icon } from '@/components/Icon';
import { Badge, Button, ConfirmModal, DetailRow, EmptyState, FormModal, IconButton, Modal, PageHeader, SectionCard, StatsRow } from '@/components/common';
import { formatDuration, formatPrice, initialsOf } from '@/utils/format';
import { paceOf, staffAvailabilityLabels, staffAvailabilityTone } from '@/data/mocks/staff';
import { staffRepository } from '@/data/repositories';
import { useServices } from '@/state/ServicesContext';
import type { ServiceRecord, StaffAvailability, StaffRecord, StaffRole } from '@/data/types';

type AvailabilityFilter = 'todas' | 'disponible' | 'atencion' | 'pausa';
type StatusFilter = 'todos' | 'activo' | 'inactivo';

type StaffModal =
  | { type: 'detail'; id: string }
  | { type: 'edit'; id: string }
  | { type: 'register' }
  | { type: 'services'; id: string }
  | { type: 'delete'; id: string }
  | null;

interface StaffDraft {
  name: string;
  email: string;
  role: StaffRole;
  station: number;
  shift: string;
  restStart: string;
  restEnd: string;
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

function restStateOf(member: StaffRecord): { label: string; tone: 'success' | 'brand' | 'gold' | 'neutral' } {
  if (member.availability === 'descanso') {
    return { label: 'En curso', tone: 'gold' };
  }

  if (!member.active) {
    return { label: 'Inactivo', tone: 'neutral' };
  }

  return { label: 'Programado', tone: 'brand' };
}

function emptyDraft(member: StaffRecord, serviceIds: string[]): StaffDraft {
  return {
    active: member.active,
    availability: member.availability,
    email: member.email,
    name: member.name,
    restEnd: member.restEnd,
    restStart: member.restStart,
    role: member.role,
    serviceIds,
    shift: member.shift,
    station: member.station,
  };
}

export function TeamPage() {
  const { services, saveService } = useServices();
  const [staff, setStaff] = useState<StaffRecord[]>(staffRepository.list());
  const [query, setQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [modal, setModal] = useState<StaffModal>(null);
  const [draft, setDraft] = useState<StaffDraft | null>(null);
  const [formError, setFormError] = useState('');

  const modalMember = modal && 'id' in modal ? (staff.find((member) => member.id === modal.id) ?? null) : null;

  function servicesOf(memberId: string): ServiceRecord[] {
    return services.filter((service) => service.barberIds.includes(memberId));
  }

  function applyServiceIds(memberId: string, serviceIds: string[]) {
    services.forEach((service) => {
      const shouldInclude = serviceIds.includes(service.id);
      const hasMember = service.barberIds.includes(memberId);

      if (shouldInclude === hasMember) {
        return;
      }

      saveService({
        ...service,
        barberIds: shouldInclude
          ? [...service.barberIds, memberId]
          : service.barberIds.filter((id) => id !== memberId),
      });
    });
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
      needle.length === 0 ||
      member.name.toLowerCase().includes(needle) ||
      member.email.toLowerCase().includes(needle);
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

  function openRegister() {
    setDraft({
      active: true,
      availability: 'disponible',
      email: '',
      name: '',
      restEnd: '13:00',
      restStart: '12:00',
      role: 'barbero',
      serviceIds: [],
      shift: 'Mañana (8:00 - 14:00)',
      station: 0,
    });
    setFormError('');
    setModal({ type: 'register' });
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

  function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    const name = draft.name.trim();
    const email = draft.email.trim();

    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Ingresa un correo válido.');
      return;
    }

    if (modal?.type === 'register') {
      const newMember: StaffRecord = {
        companyId: 'emp-turnify-01',
        completedToday: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        currentTicket: null,
        email,
        id: `staff-${Date.now()}`,
        name,
        restEnd: draft.restEnd,
        restStart: draft.restStart,
        role: draft.role,
        shift: draft.shift,
        station: Number(draft.station) || 0,
        active: draft.active,
        availability: draft.availability,
      };
      setStaff((current) => [...current, newMember]);
      applyServiceIds(newMember.id, draft.serviceIds);
      setModal(null);
      return;
    }

    if (!modalMember) {
      return;
    }

    const id = modalMember.id;
    setStaff((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              active: draft.active,
              availability: draft.availability,
              email,
              name,
              restEnd: draft.restEnd,
              restStart: draft.restStart,
              role: draft.role,
              shift: draft.shift,
              station: Number(draft.station) || 0,
            }
          : member,
      ),
    );
    applyServiceIds(id, draft.serviceIds);
    setModal(null);
  }

  function handleDeactivate() {
    if (!modalMember) {
      return;
    }

    const id = modalMember.id;
    const nextActive = !modalMember.active;
    setStaff((current) => current.map((member) => (member.id === id ? { ...member, active: nextActive } : member)));
    setModal(null);
  }

  const filteredServices = useMemo(() => services, [services]);

  return (
    <>
      <PageHeader
        title="Barberos y empleados"
        subtitle={`${inLocal} en el local · ${available} disponibles para llamar · ${completedToday} cortes completados hoy.`}
        actions={
          <>
            <Badge icon="users" tone="brand">
              {activeCount} activos
            </Badge>
            <Button icon="plus" onClick={openRegister}>
              Registrar usuario
            </Button>
          </>
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
        detail="Disponibilidad, estación, servicios autorizados y ritmo de cada miembro del equipo."
        action={<Badge icon="users" tone="brand">{filtered.length} personas</Badge>}
      >

        <div className="filters" style={{ justifyContent: 'space-between' }}>
          <div className="filters">
            <div className="search">
              <Icon name="search" size={17} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o correo..."
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

        {filtered.length === 0 ? (
          <EmptyState detail="Ajusta la búsqueda o los filtros para ver miembros del equipo." title="Nadie coincide" />
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Barbero</th>
                  <th>Estación</th>
                  <th>Disponibilidad</th>
                  <th>Servicios autorizados</th>
                  <th>Atendidos hoy</th>
                  <th>Ritmo promedio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const own = servicesOf(member.id);
                  const pace = paceOf(member.completedToday);

                  return (
                    <tr key={member.id} style={member.active ? undefined : { opacity: 0.6 }}>
                      <td>
                        <span style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
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
                          <span style={{ display: 'grid' }}>
                            <strong style={{ font: 'var(--text-body-strong)' }}>{member.name}</strong>
                            <span className="muted" style={{ font: 'var(--text-caption)' }}>
                              {member.email}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        {member.station > 0 ? (
                          <span className="table__code">Puesto {member.station}</span>
                        ) : (
                          <span className="muted">Sin estación</span>
                        )}
                      </td>
                      <td>
                        <Badge tone={staffAvailabilityTone[member.availability]}>
                          {staffAvailabilityLabels[member.availability]}
                        </Badge>
                      </td>
                      <td>
                        {own.length === 0 ? (
                          <span className="muted">Sin asignar</span>
                        ) : own.length === 1 ? (
                          <span>{own[0].name}</span>
                        ) : (
                          <button
                            className="badge badge--brand"
                            onClick={() => setModal({ id: member.id, type: 'services' })}
                            style={{ cursor: 'pointer' }}
                            title="Ver servicios autorizados"
                            type="button"
                          >
                            <Icon name="scissors" size={13} />
                            {own.length} asignados
                          </button>
                        )}
                      </td>
                      <td>{member.completedToday}</td>
                      <td>{pace === null ? <span className="muted">—</span> : `${pace} min/corte`}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
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
        title="Cronograma de descansos"
        detail="Horario de cada puesto y el descanso asignado dentro de su turno."
        action={<Badge icon="clock" tone="gold">{staff.length} turnos</Badge>}
      >

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Barbero</th>
                <th>Estación</th>
                <th>Turno</th>
                <th>Descanso</th>
                <th>Estado del descanso</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const state = restStateOf(member);

                return (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                    </td>
                    <td className="muted">{member.station > 0 ? `Puesto ${member.station}` : 'Sin estación'}</td>
                    <td className="muted">{member.shift}</td>
                    <td>
                      {member.restStart} — {member.restEnd}
                    </td>
                    <td>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
            <DetailRow label="Correo" value={modalMember.email} />
            <DetailRow label="Rol" value={modalMember.role === 'admin' ? 'Administrador' : 'Barbero'} />
            <DetailRow
              label="Estación"
              value={modalMember.station > 0 ? `Puesto ${modalMember.station}` : 'Sin estación'}
            />
            <DetailRow label="Disponibilidad" value={staffAvailabilityLabels[modalMember.availability]} />
            <DetailRow label="Turno" value={modalMember.shift} />
            <DetailRow label="Descanso" value={`${modalMember.restStart} — ${modalMember.restEnd}`} />
            <DetailRow label="Atendidos hoy" value={String(modalMember.completedToday)} />
            <DetailRow
              label="Ritmo promedio"
              value={paceOf(modalMember.completedToday) ? `${paceOf(modalMember.completedToday)} min/corte` : '—'}
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

      {modal?.type === 'services' && modalMember ? (
        <Modal
          detail="Servicios que este barbero está autorizado para atender."
          onClose={() => setModal(null)}
          title={`Servicios autorizados (${servicesOf(modalMember.id).length})`}
          footer={
            <>
              <Button onClick={() => setModal(null)} variant="secondary">
                Cerrar
              </Button>
              <Button icon="edit" onClick={() => openEdit(modalMember)}>
                Editar asignación
              </Button>
            </>
          }
        >
          {servicesOf(modalMember.id).length === 0 ? (
            <EmptyState detail="Asigna servicios desde la edición del empleado." title="Sin servicios autorizados" />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {servicesOf(modalMember.id).map((service) => (
                <div
                  key={service.id}
                  style={{
                    alignItems: 'center',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                  }}
                >
                  <span style={{ display: 'grid' }}>
                    <strong style={{ font: 'var(--text-body-strong)' }}>{service.name}</strong>
                    <span className="muted" style={{ font: 'var(--text-caption)' }}>
                      {service.description}
                    </span>
                  </span>
                  <span style={{ display: 'grid', gap: 2, justifyItems: 'end' }}>
                    <strong>{formatPrice(service.priceCents)}</strong>
                    <span className="muted" style={{ font: 'var(--text-caption)' }}>
                      {formatDuration(service.durationSeconds)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {(modal?.type === 'edit' || modal?.type === 'register') && draft ? (
        <FormModal
          detail={
            modal.type === 'register'
              ? 'Registra un nuevo barbero o empleado y define sus servicios autorizados.'
              : 'Actualiza sus datos, disponibilidad y servicios autorizados.'
          }
          error={formError}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
          open
          submitLabel={modal.type === 'register' ? 'Registrar usuario' : 'Guardar cambios'}
          title={modal.type === 'register' ? 'Registrar usuario' : `Editar a ${modalMember?.name ?? ''}`}
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
                  <span>Correo</span>
                  <input
                    onChange={(event) => handleDraftChange({ email: event.target.value })}
                    required
                    type="email"
                    value={draft.email}
                  />
                </label>

                <label className="field">
                  <span>Rol</span>
                  <select onChange={(event) => handleDraftChange({ role: event.target.value as StaffRole })} value={draft.role}>
                    <option value="barbero">Barbero</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>

                <label className="field">
                  <span>Estación</span>
                  <input
                    min={0}
                    onChange={(event) => handleDraftChange({ station: Number(event.target.value) })}
                    type="number"
                    value={draft.station}
                  />
                  <small>0 = sin estación asignada.</small>
                </label>

                <label className="field">
                  <span>Disponibilidad</span>
                  <select
                    onChange={(event) => handleDraftChange({ availability: event.target.value as StaffAvailability })}
                    value={draft.availability}
                  >
                    {(Object.keys(staffAvailabilityLabels) as StaffAvailability[]).map((key) => (
                      <option key={key} value={key}>
                        {staffAvailabilityLabels[key]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Turno</span>
                  <input onChange={(event) => handleDraftChange({ shift: event.target.value })} value={draft.shift} />
                </label>

                <label className="field">
                  <span>Inicio del descanso</span>
                  <input
                    onChange={(event) => handleDraftChange({ restStart: event.target.value })}
                    type="time"
                    value={draft.restStart}
                  />
                </label>

                <label className="field">
                  <span>Fin del descanso</span>
                  <input
                    onChange={(event) => handleDraftChange({ restEnd: event.target.value })}
                    type="time"
                    value={draft.restEnd}
                  />
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
              ? 'El empleado dejará de aparecer en la rotación activa.'
              : 'El empleado vuelve a la rotación activa.'
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
