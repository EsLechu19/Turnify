import { Alert, AppState, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { AuthErrorMessage } from '@/components/auth/auth-ui';
import { WorkerButton, WorkerIcon, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { WorkerStations } from '@/components/worker/worker-stations';
import { useAuth } from '@/features/auth/use-auth';
import { staffLanding } from '@/features/public/public-route-policy';
import {
  callMyNextTicket,
  finishMyService,
  getReassignmentCandidates,
  getShopStations,
  getWorkerBarberQueue,
  markMyTicketAbsent,
  reassignCalledTicket,
  setWorkerAvailability,
  startMyService,
  translateWorkerBarberError,
  type ReassignmentCandidate,
  type ShopStation,
  type WorkerAvailability,
  type WorkerTicket,
} from '@/features/queue/worker-barber-api';
import { mapWorkerLiveOperations } from '@/features/worker/worker-live-operations';
import { getWorkerShops } from '@/features/worker/worker-membership-api';
import { getSupabase } from '@/lib/supabase';

let workerSubscriptionId = 0;

const availabilityLabel: Record<WorkerAvailability, string> = {
  disponible: 'Disponible',
  ocupado: 'Ocupado',
  fuera_de_turno: 'Fuera de turno',
};

const demoClientNames: Record<string, string> = {
  t1: 'Juan Pérez',
  t2: 'Ana Torres',
  t3: 'Luis Ramírez',
  t4: 'María Gómez',
};

const servicePrices: Record<string, string> = {
  'Corte clásico': '$20.000',
  'Corte + barba': '$35.000',
  'Perfilado de barba': '$18.000',
  'Afeitado clásico': '$15.000',
};

function demoClientName(ticket: WorkerTicket): string {
  return process.env.EXPO_PUBLIC_SKIP_AUTH === '1' ? (demoClientNames[ticket.ticketId] ?? 'Cliente') : 'Cliente';
}

function useRemainingTolerance(deadline: string | null): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  if (!deadline) return null;
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const DEMO_STATIONS: ShopStation[] = [
  { barberId: 'demo-1', name: 'Tú', operationalState: 'ocupado', ticketCode: 'A24', serviceName: 'Corte + barba', ticketState: 'en_atencion' },
  { barberId: 'demo-2', name: 'Carlos', operationalState: 'disponible', ticketCode: null, serviceName: null, ticketState: null },
  { barberId: 'demo-3', name: 'Luis', operationalState: 'fuera_de_turno', ticketCode: null, serviceName: null, ticketState: null },
];
const DEMO_TICKETS: WorkerTicket[] = [
  {
    ticketId: 't1', queueId: 'q1', queueName: 'Cortes', visibleCode: 'A24', state: 'en_atencion',
    serviceName: 'Corte + barba', requestedBarberName: null, assignedBarberName: 'Tú',
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    peopleAhead: 0, waitMinutes: 0,
  },
  {
    ticketId: 't2', queueId: 'q1', queueName: 'Cortes', visibleCode: 'A25', state: 'notificado',
    serviceName: 'Corte clásico', requestedBarberName: 'Carlos', assignedBarberName: null,
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    peopleAhead: 0, waitMinutes: 0,
  },
  {
    ticketId: 't3', queueId: 'q2', queueName: 'Barba', visibleCode: 'B11', state: 'en_espera',
    serviceName: 'Perfilado de barba', requestedBarberName: null, assignedBarberName: null,
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    peopleAhead: 1, waitMinutes: 5,
  },
  {
    ticketId: 't4', queueId: 'q1', queueName: 'Cortes', visibleCode: 'A26', state: 'en_espera',
    serviceName: 'Afeitado clásico', requestedBarberName: null, assignedBarberName: null,
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    peopleAhead: 2, waitMinutes: 10,
  },
];

export default function WorkerScreen() {
  const { profile, isProfileLoading } = useAuth();
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null);
  const [tickets, setTickets] = useState<WorkerTicket[]>([]);
  const [shopName, setShopName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ReassignmentCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [stations, setStations] = useState<ShopStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const refresh = useCallback(async () => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setAvailability('disponible');
      setTickets(DEMO_TICKETS);
      setStations(DEMO_STATIONS);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const next = await getWorkerBarberQueue();
      setAvailability(next.availability);
      setTickets(next.tickets);
      setError(null);
    } catch (reason) {
      setError(translateWorkerBarberError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsLoading(false);
    }
    try {
      setStations(await getShopStations());
    } catch {
      setStations([]);
    }
  }, []);

  const refreshShop = useCallback(async () => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setShopName('Barbería Demo');
      return;
    }
    try {
      setShopName((await getWorkerShops()).find((shop) => shop.isCurrent)?.name ?? null);
    } catch {
      setShopName(null);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    void refreshShop();
  }, [refresh, refreshShop]));

  useEffect(() => {
    if (!profile?.businessId) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`worker-barber:${profile.businessId}:${++workerSubscriptionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `empresa_id=eq.${profile.businessId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbero_operaciones', filter: `empresa_id=eq.${profile.businessId}` }, () => void refresh())
      .subscribe();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [profile?.businessId, refresh]);

  if (process.env.EXPO_PUBLIC_SKIP_AUTH !== '1' && !isProfileLoading && (profile?.role !== 'personal' || !profile.businessId)) {
    return <Redirect href={staffLanding(profile)} />;
  }

  const operations = mapWorkerLiveOperations(tickets);

  async function act(action: () => Promise<void>, success?: string) {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setNotice(success ?? 'Demo: acción simulada.');
      setError(null);
      return;
    }
    setIsActing(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await refresh();
      setNotice(success ?? null);
    } catch (reason) {
      setError(translateWorkerBarberError(reason instanceof Error ? reason.message : ''));
      await refresh();
    } finally {
      setIsActing(false);
    }
  }

  return (
    <WorkerScreenContainer activeNavigation="live" shopName={shopName}>
      <ScrollView contentContainerStyle={workerUiStyles.page}>
        {operations.calledTicket ? (
          <LifecycleScreen
            act={act}
            candidates={candidates}
            isActing={isActing}
            openCandidates={() => void act(async () => {
              setShowCandidates(true);
              setCandidates(await getReassignmentCandidates(operations.calledTicket!.ticketId));
            })}
            reassign={(candidate) => Alert.alert(
              'Reasignar turno',
              `¿Confirmas reasignar ${operations.calledTicket!.visibleCode}?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => void act(() => reassignCalledTicket(operations.calledTicket!.ticketId, candidate.barberId), 'Turno reasignado.') },
              ],
            )}
            showCandidates={showCandidates}
            ticket={operations.calledTicket}
          />
        ) : (
          <LiveQueue
            act={act}
            attentionTicket={operations.attentionTicket}
            availability={availability}
            isActing={isActing}
            isLoading={isLoading}
            setNotice={setNotice}
            shopName={shopName}
            stations={stations}
            stationsLoading={isLoading}
            tickets={operations.compatibleTickets}
          />
        )}
        <AuthErrorMessage message={error} />
        {notice ? (
          <View accessibilityRole="alert" style={workerUiStyles.card}>
            <WorkerText variant="label" color={workerColors.teal}>{notice}</WorkerText>
          </View>
        ) : null}
        {error ? (
          <WorkerButton label="Reintentar" tone="secondary" disabled={isActing} onPress={() => void refresh()} />
        ) : null}
      </ScrollView>
    </WorkerScreenContainer>
  );
}

function LiveQueue({ availability, tickets, attentionTicket, stations, stationsLoading, isLoading, isActing, act, shopName, setNotice }: {
  availability: WorkerAvailability | null;
  tickets: WorkerTicket[];
  attentionTicket: WorkerTicket | null;
  stations: ShopStation[];
  stationsLoading: boolean;
  isLoading: boolean;
  isActing: boolean;
  act(action: () => Promise<void>, success?: string): Promise<void>;
  shopName: string | null;
  setNotice: (value: string | null) => void;
}) {
  const next = tickets[0];
  const [selected, setSelected] = useState<WorkerTicket | null>(null);
  const selectedTolerance = useRemainingTolerance(selected?.calledDeadlineAt ?? null);
  const [isCallingNext, setIsCallingNext] = useState(false);

  async function callNext() {
    if (!next) return;
    setIsCallingNext(true);
    try {
      await act(() => callMyNextTicket(next.queueId), `Llamaste el turno ${next.visibleCode}.`);
    } finally {
      setIsCallingNext(false);
    }
  }

  return (
    <>
      <View style={styles.liveHeader}>
        <WorkerText variant="eyebrow" color={workerColors.teal}>Operación en vivo</WorkerText>
        <WorkerText variant="title">Mi jornada</WorkerText>
        <WorkerText color={workerColors.muted}>{shopName ?? 'Barbería demo'}</WorkerText>
      </View>

      <View style={[workerUiStyles.card, styles.operationsHeader]}>
        <View>
          <WorkerText variant="eyebrow" color={workerColors.muted}>Estado personal</WorkerText>
          <WorkerText variant="headline">{availability ? availabilityLabel[availability] : 'Sin disponibilidad'}</WorkerText>
        </View>
        <View style={styles.operationalFacts}>
          <WorkerPill label="TIEMPO REAL" tone="teal" />
          <WorkerText variant="label" color={workerColors.muted}>{tickets.length} compatibles</WorkerText>
        </View>
      </View>

      {isLoading ? (
        <View accessibilityRole="progressbar" style={workerUiStyles.card}>
          <WorkerText variant="headline">Actualizando operación…</WorkerText>
          <WorkerText color={workerColors.muted}>Consultando tu estado y cola compatible.</WorkerText>
        </View>
      ) : null}

      {!isLoading && attentionTicket ? (
        <View style={[workerUiStyles.card, styles.attentionCard]}>
          <View style={workerUiStyles.split}>
            <WorkerText variant="eyebrow" color={workerColors.teal}>En atención ahora</WorkerText>
            <WorkerPill label="EN ATENCIÓN" tone="teal" />
          </View>
          <WorkerText variant="metric">{attentionTicket.visibleCode}</WorkerText>
          <TicketDetail ticket={attentionTicket} />
          <View style={styles.attentionActions}>
            <WorkerButton
              label="Finalizar atención"
              disabled={isActing}
              onPress={() => void act(() => finishMyService(attentionTicket.ticketId), 'Turno finalizado.')}
            />
          </View>
        </View>
      ) : null}

      {!isLoading && next ? (
        <View style={[workerUiStyles.card, styles.nextCallout]}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Siguiente</WorkerText>
          <View style={workerUiStyles.split}>
            <WorkerText variant="metric">{next.visibleCode}</WorkerText>
            <WorkerIcon name="live" color={workerColors.teal} size={30} />
          </View>
          <WorkerText variant="label" color={workerColors.muted}>
            {next.waitMinutes > 0 ? `~${next.waitMinutes} min de espera` : 'Próximo en la fila'}
          </WorkerText>
          <WorkerButton label="Llamar al cliente" disabled={isActing || availability !== 'disponible'} onPress={() => void callNext()} />
        </View>
      ) : null}

      <WorkerStations stations={stations} isLoading={stationsLoading} />

      {!isLoading && tickets.length === 0 ? (
        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">No hay turnos compatibles</WorkerText>
          <WorkerText color={workerColors.muted}>
            {availability === 'fuera_de_turno' ? 'Marca tu disponibilidad para recibir nuevos turnos.' : 'Los turnos compatibles aparecerán aquí.'}
          </WorkerText>
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <WorkerText variant="headline">Cola de espera</WorkerText>
        <WorkerText color={workerColors.muted}>Turnos que puedes atender</WorkerText>
      </View>

      {tickets.map((ticket, index) => (
        <Pressable
          accessibilityLabel={`Ver detalle ${ticket.visibleCode}`}
          accessibilityRole="button"
          key={ticket.ticketId}
          onPress={() => setSelected(ticket)}
          style={workerUiStyles.card}
        >
          <View style={workerUiStyles.split}>
            <WorkerText variant="headline">{ticket.visibleCode}</WorkerText>
            <WorkerPill
              label={index === 0 ? 'SIGUIENTE' : ticket.waitMinutes > 0 ? `EN ESPERA · ~${ticket.waitMinutes} min` : 'EN ESPERA'}
              tone={index === 0 ? 'teal' : 'neutral'}
            />
          </View>
          <WorkerText variant="headline">{demoClientName(ticket)}</WorkerText>
          <TicketDetail ticket={ticket} />
          <WorkerText variant="label" color={workerColors.muted}>Barbero asignado: {ticket.assignedBarberName ?? 'Por asignar'}</WorkerText>
        </Pressable>
      ))}

      <WorkerButton label="Agregar cliente presencial" onPress={() => router.push('/(app)/worker-walk-in')} />

      {selected ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setSelected(null)}>
          <Pressable onPress={() => setSelected(null)} style={styles.modalBackdrop}>
            <Pressable onPress={() => {}} style={[workerUiStyles.card, styles.modalCard]}>
              <WorkerText variant="eyebrow" color={workerColors.teal}>Detalle del turno</WorkerText>
              <WorkerText variant="metric">{selected.visibleCode}</WorkerText>
              <WorkerText variant="label">Cliente: {demoClientName(selected)}</WorkerText>
              <WorkerText variant="label">Servicio: {selected.serviceName || selected.queueName}</WorkerText>
              <WorkerText variant="label">Barbero asignado: {selected.assignedBarberName ?? 'Por asignar'}</WorkerText>
              <WorkerText variant="label">Tolerancia: {selectedTolerance ?? '-'}</WorkerText>
              <WorkerText variant="label">Pago: {servicePrices[selected.serviceName ?? ''] ?? '-'}</WorkerText>
              <WorkerButton label="Llamar a la estación" disabled={isActing} onPress={() => void callSelectedStation(selected)} />
              <WorkerButton label="Marcar ausente" tone="danger" disabled={isActing} onPress={() => void markSelectedAbsent(selected)} />
              <WorkerButton label="Retroceder" tone="secondary" disabled={isActing} onPress={() => dismissSelected(selected)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );

  function callSelectedStation(current: WorkerTicket) {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setNotice(`Demo: turno ${current.visibleCode} llamado a la estación.`);
      setSelected(null);
      return Promise.resolve();
    }
    return act(() => callMyNextTicket(current.queueId), `Llamaste el turno ${current.visibleCode}.`).then(() => setSelected(null));
  }

  function markSelectedAbsent(current: WorkerTicket) {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setNotice(`Demo: turno ${current.visibleCode} marcado como ausente.`);
      setSelected(null);
      return Promise.resolve();
    }
    return act(() => markMyTicketAbsent(current.ticketId), 'Turno marcado como ausente.').then(() => setSelected(null));
  }

  function dismissSelected(current: WorkerTicket) {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') setNotice(`Demo: turno ${current.visibleCode} devuelto a la cola.`);
    setSelected(null);
  }
}

function LifecycleScreen({ ticket, candidates, showCandidates, isActing, act, openCandidates, reassign }: {
  ticket: WorkerTicket;
  candidates: ReassignmentCandidate[];
  showCandidates: boolean;
  isActing: boolean;
  act(action: () => Promise<void>, success?: string): Promise<void>;
  openCandidates(): void;
  reassign(candidate: ReassignmentCandidate): void;
}) {
  const remainingTolerance = useRemainingTolerance(ticket.calledDeadlineAt);
  const responseLabel = ticket.customerResponse === 'presente'
    ? 'Cliente: ya está aquí'
    : ticket.customerResponse === 'llega_en_2_min'
      ? 'Cliente: llega en 2 minutos'
      : 'Esperando respuesta del cliente';

  return (
    <>
      <View style={styles.calledTop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a la cola" onPress={() => router.replace('/(app)/worker-queue')}>
          <WorkerIcon name="back" />
        </Pressable>
        <WorkerPill label="TURNO LLAMADO" tone="teal" />
      </View>

      <View style={styles.ticketHero}>
        <WorkerText variant="eyebrow" color={workerColors.teal}>Listo para iniciar</WorkerText>
        <WorkerText variant="metric">{ticket.visibleCode}</WorkerText>
        <TicketDetail ticket={ticket} />
      </View>

      <View style={[workerUiStyles.card, styles.tolerance]}>
        <WorkerText variant="eyebrow" color={workerColors.teal}>Tolerancia de llegada</WorkerText>
        <WorkerText variant="headline">{remainingTolerance ? `${remainingTolerance} restantes` : 'Tiempo no disponible'}</WorkerText>
        <WorkerText color={workerColors.muted}>{responseLabel}</WorkerText>
        <WorkerText color={workerColors.muted}>La respuesta no inicia ni extiende la atención.</WorkerText>
      </View>

      <WorkerButton label="Iniciar atención" disabled={isActing} onPress={() => void act(() => startMyService(ticket.ticketId))} />
      <WorkerButton label="Marcar ausente" tone="danger" disabled={isActing} onPress={() => void act(() => markMyTicketAbsent(ticket.ticketId), 'Turno marcado como ausente.')} />
      <WorkerButton label="Ver cola completa" tone="secondary" onPress={() => router.push('/(app)/worker-queue')} />
      <WorkerButton label="Reasignar turno" tone="secondary" disabled={isActing} onPress={openCandidates} />

      {showCandidates ? (
        <View style={workerUiStyles.card}>
          <WorkerText variant="label">Barberos compatibles disponibles</WorkerText>
          {candidates.length ? candidates.map((candidate) => (
            <WorkerButton
              disabled={isActing}
              key={candidate.barberId}
              label={`Reasignar a ${candidate.name}`}
              onPress={() => reassign(candidate)}
              tone="secondary"
            />
          )) : (
            <WorkerText color={workerColors.muted}>No hay otro barbero disponible.</WorkerText>
          )}
        </View>
      ) : null}
    </>
  );
}

function TicketDetail({ ticket }: { ticket: WorkerTicket }) {
  return (
    <View style={styles.ticketDetails}>
      <WorkerText>{ticket.serviceName || ticket.queueName}</WorkerText>
      <WorkerText variant="label" color={workerColors.muted}>{ticket.queueName}</WorkerText>
      {ticket.requestedBarberName ? (
        <WorkerText color={workerColors.muted}>Barbero solicitado: {ticket.requestedBarberName}</WorkerText>
      ) : null}
      {ticket.assignedBarberName ? (
        <WorkerText color={workerColors.muted}>Barbero asignado: {ticket.assignedBarberName}</WorkerText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  liveHeader: { gap: 4 },
  operationsHeader: { gap: 12 },
  operationalFacts: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  stateStrip: { flexDirection: 'row', gap: 8 },
  attentionCard: { gap: 12 },
  attentionActions: { gap: 8 },
  nextCallout: { backgroundColor: workerColors.low, borderRadius: 12, gap: 12, padding: 20 },
  sectionHeading: { gap: 2, marginTop: 4 },
  queueCard: { gap: 10 },
  queueRow: { gap: 8, paddingVertical: 8 },
  ticketDetails: { gap: 3 },
  calledTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  ticketHero: {
    backgroundColor: workerColors.card,
    borderColor: workerColors.outline,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  tolerance: { backgroundColor: workerColors.low },
  modalBackdrop: { backgroundColor: 'rgba(16, 29, 74, 0.5)', flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { gap: 10 },
});
