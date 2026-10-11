import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Icon } from '@/components/Icon';
import { Badge, Button, ConfirmModal, DetailRow, EmptyState, FormModal, IconButton, Modal, PageHeader, SectionCard, StatsRow } from '@/components/common';
import { availabilityLabels } from '@/data/labels';
import { computeServiceMix } from '@/data/compute';
import { fetchServicePerformance, type ServicePerformance } from '@/data/live';
import { formatDuration, formatPrice } from '@/utils/format';
import { useServices } from '@/state/ServicesContext';
import { useQueue } from '@/state/QueueContext';
import type { ServiceRecord, TeamMember } from '@/data/types';

type StatusFilter = 'todos' | 'activo' | 'inactivo';

type ModalState =
  | { type: 'detail'; id: string }
  | { type: 'form'; id: string | null }
  | { type: 'barbers'; id: string }
  | { type: 'delete'; id: string }
  | null;

interface ServiceDraft {
  name: string;
  description: string;
  durationMinutes: number;
  priceSoles: number;
  active: boolean;
  barberIds: string[];
}

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activo' },
  { label: 'Inactivos', value: 'inactivo' },
];

function emptyDraft(): ServiceDraft {
  return {
    active: true,
    barberIds: [],
    description: '',
    durationMinutes: 30,
    name: '',
    priceSoles: 25,
  };
}

function draftFrom(service: ServiceRecord): ServiceDraft {
  return {
    active: service.active,
    barberIds: [...service.barberIds],
    description: service.description,
    durationMinutes: Math.max(1, Math.round(service.durationSeconds / 60)),
    name: service.name,
    priceSoles: service.priceCents / 100,
  };
}

function ServiceForm({
  draft,
  onChange,
  team,
}: {
  draft: ServiceDraft;
  onChange: (patch: Partial<ServiceDraft>) => void;
  team: TeamMember[];
}) {
  function toggleBarber(id: string) {
    const next = draft.barberIds.includes(id)
      ? draft.barberIds.filter((barberId) => barberId !== id)
      : [...draft.barberIds, id];

    onChange({ barberIds: next });
  }

  return (
    <>
      <div className="form-grid">
          <label className="field">
            <span>Nombre</span>
            <input
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="Ej. Corte caballero"
              required
              value={draft.name}
            />
            <small>Nombre visible para el cliente en el QR.</small>
          </label>

          <label className="field">
            <span>Detalle</span>
            <input
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="Breve descripción del servicio"
              value={draft.description}
            />
            <small>Se muestra bajo el nombre en la app.</small>
          </label>

          <label className="field">
            <span>Duración estimada (min)</span>
            <input
              min={1}
              onChange={(event) => onChange({ durationMinutes: Number(event.target.value) })}
              type="number"
              value={draft.durationMinutes}
            />
            <small>Usada para estimar la espera.</small>
          </label>

          <label className="field">
            <span>Precio base (S/)</span>
            <input
              min={0}
              onChange={(event) => onChange({ priceSoles: Number(event.target.value) })}
              step="0.5"
              type="number"
              value={draft.priceSoles}
            />
            <small>Precio de referencia del servicio.</small>
          </label>
        </div>

        <label className="switch-row" htmlFor="service-active">
          <span>
            <strong style={{ display: 'block' }}>Servicio activo</strong>
            <span className="muted">Los servicios inactivos no aceptan turnos nuevos.</span>
          </span>
          <input
            checked={draft.active}
            className="switch"
            id="service-active"
            onChange={(event) => onChange({ active: event.target.checked })}
            type="checkbox"
          />
        </label>

        <fieldset style={{ border: 0, display: 'grid', gap: 8, margin: 0, padding: 0 }}>
          <legend className="muted" style={{ font: 'var(--text-label)', marginBottom: 4 }}>
            Barberos que atienden este servicio
          </legend>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {team.map((member) => (
              <label
                key={member.id}
                style={{
                  alignItems: 'center',
                  background: draft.barberIds.includes(member.id) ? 'var(--brand-softest)' : 'var(--surface-muted)',
                  border: `1px solid ${
                    draft.barberIds.includes(member.id) ? 'var(--brand-border)' : 'var(--border)'
                  }`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  padding: '8px 10px',
                }}
              >
                <input
                  checked={draft.barberIds.includes(member.id)}
                  onChange={() => toggleBarber(member.id)}
                  type="checkbox"
                />
                <span style={{ display: 'grid' }}>
                  <strong style={{ font: 'var(--text-body-strong)' }}>{member.name}</strong>
                  <span className="muted" style={{ font: 'var(--text-caption)' }}>
                    {availabilityLabels[member.availability]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
    </>
  );
}

export function ServicesPage() {
  const { services, createService, updateService, removeService } = useServices();
  const { tickets, team } = useQueue();
  const serviceMix = useMemo(() => computeServiceMix(tickets), [tickets]);
  const [performance, setPerformance] = useState<Record<string, ServicePerformance>>({});

  useEffect(() => {
    let active = true;

    fetchServicePerformance()
      .then((rows) => {
        if (active) setPerformance(rows);
      })
      .catch(() => {
        if (active) setPerformance({});
      });

    return () => {
      active = false;
    };
  }, []);

  const measuredAverages = Object.values(performance)
    .map((entry) => entry.suggestedMinutes)
    .filter((value): value is number => typeof value === 'number');
  const measuredAvg =
    measuredAverages.length === 0
      ? null
      : Math.round(measuredAverages.reduce((sum, value) => sum + value, 0) / measuredAverages.length);
  const totalVotes = Object.values(performance).reduce((sum, entry) => sum + entry.votes, 0);
  const ratedAverages = Object.values(performance)
    .map((entry) => entry.avgRating)
    .filter((value): value is number => typeof value === 'number');
  const globalRating =
    ratedAverages.length === 0
      ? null
      : Math.round((ratedAverages.reduce((sum, value) => sum + value, 0) / ratedAverages.length) * 10) / 10;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [barberFilter, setBarberFilter] = useState('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [acting, setActing] = useState(false);

  function barberName(id: string): string {
    return team.find((member) => member.id === id)?.name ?? 'Barbero no disponible';
  }

  const activeCount = services.filter((service) => service.active).length;

  const filtered = services.filter((service) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      needle.length === 0 ||
      service.name.toLowerCase().includes(needle) ||
      service.description.toLowerCase().includes(needle);
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'activo' && service.active) ||
      (statusFilter === 'inactivo' && !service.active);
    const matchesBarber =
      barberFilter === 'all' ||
      (barberFilter === 'none' ? service.barberIds.length === 0 : service.barberIds.includes(barberFilter));

    return matchesQuery && matchesStatus && matchesBarber;
  });

  const modalService =
    modal && modal.id ? (services.find((service) => service.id === modal.id) ?? null) : null;

  function openCreate() {
    setDraft(emptyDraft());
    setFormError('');
    setModal({ id: null, type: 'form' });
  }

  function openEdit(service: ServiceRecord) {
    setDraft(draftFrom(service));
    setFormError('');
    setModal({ id: service.id, type: 'form' });
  }

  function handleDraftChange(patch: Partial<ServiceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (acting) return;

    const name = draft.name.trim();
    const durationMinutes = Number(draft.durationMinutes);

    if (!name) {
      setFormError('El nombre del servicio es obligatorio.');
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      setFormError('La duración estimada debe ser al menos 1 minuto.');
      return;
    }

    const priceSoles = Number.isFinite(Number(draft.priceSoles)) ? Number(draft.priceSoles) : 0;
    const input = {
      active: draft.active,
      barberIds: draft.barberIds,
      description: draft.description.trim(),
      durationSeconds: Math.round(durationMinutes * 60),
      name,
      priceCents: Math.max(0, Math.round(priceSoles * 100)),
    };

    setActing(true);
    setFormError('');

    try {
      if (modal?.type === 'form' && modal.id && modalService) {
        await updateService(modal.id, input);
      } else {
        await createService(input);
      }

      setModal(null);
    } catch {
      setFormError('No pudimos guardar el servicio. Revisa el nombre duplicado e intenta de nuevo.');
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!modalService || acting) {
      return;
    }

    const id = modalService.id;
    setActing(true);
    setDeleteError('');

    try {
      await removeService(id);
      setModal(null);
    } catch {
      setDeleteError('No pudimos eliminar el servicio. Intenta de nuevo.');
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Gestión de servicios"
        subtitle="Catálogo que ven tus clientes al escanear el QR del mostrador."
        actions={
          <Button icon="plus" onClick={openCreate}>
            Crear nuevo servicio
          </Button>
        }
      />

      <StatsRow
        stats={[
          { label: 'Servicios registrados', value: String(services.length), icon: 'ticket', foot: `${activeCount} activos · ${services.length - activeCount} inactivos` },
          { label: 'Tiempo medido prom.', value: measuredAvg == null ? '—' : formatDuration(measuredAvg * 60), icon: 'clock', foot: 'Medido en atención' },
          { label: 'Satisfacción global', value: globalRating == null ? '—' : String(globalRating), icon: 'star', foot: totalVotes === 0 ? 'Sin votos aún' : `${totalVotes} votos` },
        ]}
      />
      <SectionCard
        title="Catálogo de servicios"
        detail="Duración, precio, barberos habilitados y estado de cada servicio. La duración estimada mueve las esperas que ve el cliente en la app."
        action={<Badge icon="list" tone="brand">{services.length} en catálogo</Badge>}
      >

        <div className="filters" style={{ justifyContent: 'space-between' }}>
          <div className="filters">
            <div className="search">
              <Icon name="search" size={17} />
              <input
                aria-label="Buscar servicios"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o detalle..."
                type="search"
                value={query}
              />
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

            <select
              aria-label="Filtrar por barbero"
              onChange={(event) => setBarberFilter(event.target.value)}
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                font: 'var(--text-body)',
                minHeight: 40,
                padding: '0 12px',
              }}
              value={barberFilter}
            >
              <option value="all">Todos los barberos</option>
              <option value="none">Sin barberos asignados</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <span className="muted" style={{ font: 'var(--text-caption)' }}>
            {filtered.length} de {services.length} servicios
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            detail="Ajusta la búsqueda o los filtros para ver servicios."
            title="Ningún servicio coincide"
          />
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Servicio</th>
                  <th scope="col">Duración estimada</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Barberos</th>
                  <th scope="col">Satisfacción</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong className="cell--truncate" title={service.name}>
                        {service.name}
                      </strong>
                    </td>
                    <td>
                      <span style={{ display: 'grid', gap: 2 }}>
                        <span>{formatDuration(service.durationSeconds)}</span>
                        <span className="muted" style={{ font: 'var(--text-caption)' }}>
                          {performance[service.name]?.suggestedMinutes == null
                            ? 'Medido: —'
                            : `Sugerido ${performance[service.name]?.suggestedMinutes} min · hoy ${performance[service.name]?.todayCount ?? 0}`}
                        </span>
                      </span>
                    </td>
                    <td>{formatPrice(service.priceCents)}</td>
                    <td className="cell--nowrap">
                      {service.barberIds.length === 0 ? (
                        <span className="muted">Sin asignar</span>
                      ) : service.barberIds.length === 1 ? (
                        <span>{barberName(service.barberIds[0])}</span>
                      ) : (
                        <button
                          className="badge badge--brand"
                          onClick={() => setModal({ id: service.id, type: 'barbers' })}
                          style={{ cursor: 'pointer' }}
                          title="Ver barberos asignados"
                          type="button"
                        >
                          <Icon name="users" size={13} />
                          {service.barberIds.length} asignados
                        </button>
                      )}
                    </td>
                    <td>
                      {performance[service.name]?.avgRating == null ? (
                        <span className="muted">—</span>
                      ) : (
                        <span style={{ display: 'grid', gap: 2 }}>
                          <span>★ {performance[service.name]?.avgRating?.toFixed(1)}</span>
                          <span className="muted" style={{ font: 'var(--text-caption)' }}>
                            {performance[service.name]?.votes} {performance[service.name]?.votes === 1 ? 'voto' : 'votos'}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="cell--nowrap">
                      <Badge tone={service.active ? 'success' : 'neutral'} icon={service.active ? 'check-circle' : 'pause'}>
                        {service.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="cell--nowrap">
                      <div className="table__actions">
                        <IconButton
                          icon="eye"
                          label={`Ver detalle de ${service.name}`}
                          onClick={() => setModal({ id: service.id, type: 'detail' })}
                        />
                        <IconButton
                          icon="edit"
                          label={`Editar ${service.name}`}
                          onClick={() => openEdit(service)}
                        />
                        <IconButton
                          icon="trash"
                          label={`Eliminar ${service.name}`}
                          onClick={() => setModal({ id: service.id, type: 'delete' })}
                          tone="danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {modal?.type === 'form' ? (
        <FormModal
          detail={
            modal.id
              ? 'Actualiza los datos del servicio y sus barberos.'
              : 'Completa los datos para publicarlo en el QR del mostrador.'
          }
          error={formError}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
          open
          submitLabel="Guardar servicio"
          title={modal.id ? 'Editar servicio' : 'Crear nuevo servicio'}
        >
          <ServiceForm draft={draft} onChange={handleDraftChange} team={team} />
        </FormModal>
      ) : null}

      {modal?.type === 'detail' && modalService ? (
        <Modal
          detail="Ficha completa del servicio."
          onClose={() => setModal(null)}
          title={modalService.name}
          footer={
            <>
              <Button onClick={() => setModal(null)} variant="secondary">
                Cerrar
              </Button>
              <Button icon="edit" onClick={() => openEdit(modalService)}>
                Editar servicio
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <DetailRow label="Detalle" value={modalService.description || 'Sin descripción'} />
            <DetailRow label="Duración estimada" value={formatDuration(modalService.durationSeconds)} />
            <DetailRow
              label="Duración medida"
              value={
                performance[modalService.name]?.suggestedMinutes == null
                  ? 'Sin mediciones aún'
                  : `${performance[modalService.name]?.suggestedMinutes} min (últimas ${performance[modalService.name]?.measuredCount ?? 0} atenciones)`
              }
            />
            <DetailRow
              label="Satisfacción"
              value={
                performance[modalService.name]?.avgRating == null
                  ? 'Sin votos aún'
                  : `${performance[modalService.name]?.avgRating?.toFixed(1)} · ${performance[modalService.name]?.votes} votos`
              }
            />
            <DetailRow label="Precio base" value={formatPrice(modalService.priceCents)} />
            <DetailRow label="Estado" value={modalService.active ? 'Activo' : 'Inactivo'} />
            <DetailRow
              label="Barberos asignados"
              value={
                modalService.barberIds.length === 0
                  ? 'Sin asignar'
                  : modalService.barberIds.map(barberName).join(', ')
              }
            />
            <DetailRow
              label="Solicitado hoy"
              value={`${
                serviceMix.find((item) => item.service === modalService.name)?.count ?? 0
              } veces`}
            />
            <DetailRow label="Creado el" value={modalService.createdAt} />
          </div>
        </Modal>
      ) : null}

      {modal?.type === 'barbers' && modalService ? (
        <Modal
          detail="Barberos habilitados para atender este servicio."
          onClose={() => setModal(null)}
          title={`Barberos asignados (${modalService.barberIds.length})`}
          footer={
            <>
              <Button onClick={() => setModal(null)} variant="secondary">
                Cerrar
              </Button>
              <Button icon="edit" onClick={() => openEdit(modalService)}>
                Editar asignación
              </Button>
            </>
          }
        >
          {modalService.barberIds.length === 0 ? (
            <EmptyState detail="Asigna barberos desde el formulario de edición." title="Sin barberos asignados" />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {modalService.barberIds.map((id) => {
                const member = team.find((person) => person.id === id);

                return (
                  <div
                    key={id}
                    className="row-split"
                    style={{
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                    }}
                  >
                    <span style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                      <span className="stat__icon">
                        <Icon name="user" size={17} />
                      </span>
                      <span style={{ display: 'grid' }}>
                        <strong style={{ font: 'var(--text-body-strong)' }}>
                          {member?.name ?? 'Barbero no disponible'}
                        </strong>
                        <span className="muted" style={{ font: 'var(--text-caption)' }}>
                          {member?.currentTicket ? `Atendiendo ${member.currentTicket}` : 'Sin turno asignado'}
                        </span>
                      </span>
                    </span>

                    <Badge
                      tone={
                        member?.availability === 'disponible'
                          ? 'success'
                          : member?.availability === 'atencion'
                            ? 'brand'
                            : 'neutral'
                      }
                    >
                      {member ? availabilityLabels[member.availability] : 'Sin datos'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      ) : null}

{modal?.type === 'delete' && modalService ? (
        <ConfirmModal
          confirmIcon="trash"
          confirmLabel="Eliminar servicio"
          detail="Esta acción quita el servicio del catálogo."
          onCancel={() => setModal(null)}
          onConfirm={handleDelete}
          open
          title="Eliminar servicio"
        >
          <p style={{ font: 'var(--text-body)', margin: 0 }}>
            ¿Seguro que quieres eliminar <strong>«{modalService.name}»</strong>?
          </p>
          <p className="muted" style={{ font: 'var(--text-caption)', margin: 0 }}>
            Dejará de estar disponible para tomar turnos. Los tickets ya generados conservan su copia del servicio.
          </p>
          {deleteError ? (
            <p role="alert" style={{ color: 'var(--danger)', font: 'var(--text-body)', margin: 0 }}>
              {deleteError}
            </p>
          ) : null}
        </ConfirmModal>
      ) : null}
    </>
  );
}
