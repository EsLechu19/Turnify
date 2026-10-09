import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { WorkerButton, WorkerIcon, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { useAuth } from '@/features/auth/use-auth';
import { callMyNextTicket, getWorkerBarberQueue, translateWorkerBarberError, type WorkerTicket } from '@/features/queue/worker-barber-api';
import { useRemainingTolerance } from '@/features/worker/use-remaining-tolerance';
import { getSupabase } from '@/lib/supabase';

let queueSubscriptionId = 0;

const DEMO_QUEUE: WorkerTicket[] = [
  {
    ticketId: 't2', queueId: 'q1', queueName: 'Cortes', visibleCode: 'A25', state: 'notificado',
    serviceName: 'Corte clásico', requestedBarberName: 'Carlos', assignedBarberName: null,
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    inicioEn: null, peopleAhead: 0, waitMinutes: 0,
  },
  {
    ticketId: 't3', queueId: 'q2', queueName: 'Barba', visibleCode: 'B11', state: 'en_espera',
    serviceName: 'Perfilado de barba', requestedBarberName: null, assignedBarberName: null,
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    inicioEn: null, peopleAhead: 1, waitMinutes: 5,
  },
  {
    ticketId: 't4', queueId: 'q1', queueName: 'Cortes', visibleCode: 'A26', state: 'en_espera',
    serviceName: 'Afeitado clásico', requestedBarberName: null, assignedBarberName: null,
    calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
    inicioEn: null, peopleAhead: 2, waitMinutes: 10,
  },
];

function waitingTickets(tickets: WorkerTicket[]): WorkerTicket[] {
  return tickets.filter((ticket) => ticket.state === 'en_espera' || ticket.state === 'notificado');
}

export default function WorkerQueueScreen() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<WorkerTicket[]>([]);
  const [availability, setAvailability] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setAvailability('disponible');
      setTickets(DEMO_QUEUE);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const queue = await getWorkerBarberQueue();
      setAvailability(queue.availability);
      setTickets(queue.tickets);
      setError(null);
    } catch (reason) {
      setError(translateWorkerBarberError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  useEffect(() => {
    if (!profile?.businessId || process.env.EXPO_PUBLIC_SKIP_AUTH === '1') return;
    const supabase = getSupabase();
    const channel = supabase.channel(`worker-queue:${profile.businessId}:${++queueSubscriptionId}`)
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

  // Same short re-sync as En vivo while a llamado ticket is active: the +2 min
  // extension is computed server-side, so the Cola countdown follows the
  // client even when the realtime event does not arrive.
  useEffect(() => {
    if (!tickets.some((ticket) => ticket.state === 'llamado')) return;
    const poll = setInterval(() => {
      void refresh();
    }, 10_000);
    return () => clearInterval(poll);
  }, [tickets, refresh]);

  async function call(ticket: WorkerTicket) {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setError(null);
      return;
    }
    setIsCalling(ticket.ticketId);
    try {
      await callMyNextTicket(ticket.queueId);
      await refresh();
    } catch (reason) {
      setError(translateWorkerBarberError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsCalling(null);
    }
  }

  const canCall = availability === 'disponible';
  const isOffShift = availability === 'fuera_de_turno';
  const waiting = waitingTickets(tickets);
  const calledTicket = tickets.find((ticket) => ticket.state === 'llamado') ?? null;
  const calledRemaining = useRemainingTolerance(calledTicket?.calledDeadlineAt ?? null);
  const calledResponse = calledTicket?.customerResponse === 'presente'
    ? 'Cliente: ya está aquí'
    : calledTicket?.customerResponse === 'llega_en_2_min'
      ? 'Cliente: llega en 2 minutos'
      : 'Esperando respuesta del cliente';

  return (
    <WorkerScreenContainer activeNavigation="queue">
      <ScrollView contentContainerStyle={workerUiStyles.page}>
        <View style={styles.heading}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Operación en vivo</WorkerText>
          <WorkerText variant="title">Cola de espera</WorkerText>
          <WorkerText color={workerColors.muted}>Solo aparecen turnos que puedes atender.</WorkerText>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCopy}>
            <WorkerIcon name="queue" color={workerColors.teal} size={20} />
            <WorkerText variant="label">{waiting.length} turnos disponibles</WorkerText>
          </View>
          <WorkerPill
            label={canCall ? 'LISTO PARA LLAMAR' : isOffShift ? 'FUERA DE TURNO' : 'OCUPADO'}
            tone={canCall ? 'teal' : 'neutral'}
          />
        </View>

        {!isLoading && !error && calledTicket ? (
          <View style={[workerUiStyles.card, styles.calledCard]}>
            <View style={workerUiStyles.split}>
              <WorkerText variant="eyebrow" color={workerColors.teal}>Turno llamado</WorkerText>
              <WorkerPill label="LLAMADO" tone="teal" />
            </View>
            <WorkerText variant="metric">{calledTicket.visibleCode}</WorkerText>
            <WorkerText variant="headline">
              {calledRemaining ? `${calledRemaining} restantes` : 'Tiempo no disponible'}
            </WorkerText>
            <WorkerText color={workerColors.muted}>{calledResponse}</WorkerText>
            <WorkerText color={workerColors.muted}>El mismo tiempo que ve el cliente, en vivo.</WorkerText>
            <WorkerButton label="Abrir en En vivo" tone="secondary" onPress={() => router.push('/(app)/worker')} />
          </View>
        ) : null}

        {isLoading ? (
          <View accessibilityRole="progressbar" style={workerUiStyles.card}>
            <ActivityIndicator color={workerColors.teal} />
            <WorkerText color={workerColors.muted}>Actualizando cola compatible…</WorkerText>
          </View>
        ) : null}

        {error ? (
          <View style={[workerUiStyles.card, { backgroundColor: workerColors.errorContainer }]}>
            <WorkerText variant="label" color={workerColors.error}>No pudimos actualizar la cola</WorkerText>
            <WorkerText color={workerColors.error}>{error}</WorkerText>
            <WorkerButton label="Reintentar" tone="secondary" onPress={() => void refresh()} />
          </View>
        ) : null}

        {!isLoading && !error && isOffShift ? (
          <EmptyState label="Estás fuera de turno" detail="Marca tu disponibilidad en En vivo para llamar turnos." />
        ) : null}

        {!isLoading && !error && !isOffShift && waiting.length === 0 && !calledTicket ? (
          <EmptyState label="No hay turnos compatibles" detail="Los nuevos turnos compatibles aparecerán aquí." />
        ) : null}

        {waiting.map((ticket) => (
          <TicketCard
            disabled={!canCall || isCalling !== null}
            isCalling={isCalling === ticket.ticketId}
            key={ticket.ticketId}
            onCall={() => void call(ticket)}
            readyToCall={canCall}
            ticket={ticket}
          />
        ))}

        <WorkerButton label="Agregar cliente presencial" onPress={() => router.push('/(app)/worker-walk-in')} />
      </ScrollView>
    </WorkerScreenContainer>
  );
}

function TicketCard({ ticket, disabled, isCalling, readyToCall, onCall }: {
  ticket: WorkerTicket;
  disabled: boolean;
  isCalling: boolean;
  readyToCall: boolean;
  onCall(): void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Llamar turno ${ticket.visibleCode}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onCall}
      style={({ pressed }) => [
        workerUiStyles.card,
        styles.ticket,
        { opacity: pressed || !readyToCall ? 0.65 : 1 },
      ]}
    >
      <View style={workerUiStyles.split}>
        <WorkerText variant="metric">{ticket.visibleCode}</WorkerText>
        <WorkerPill
          label={ticket.state === 'notificado' ? 'NOTIFICADO' : 'EN ESPERA'}
          tone={ticket.state === 'notificado' ? 'teal' : 'neutral'}
        />
      </View>
      <WorkerText variant="headline">{ticket.serviceName || ticket.queueName}</WorkerText>
      <WorkerText color={workerColors.muted}>
        {ticket.queueName} · {ticket.waitMinutes > 0 ? `~${ticket.waitMinutes} min de espera` : 'Próximo'}
      </WorkerText>
      {ticket.requestedBarberName ? (
        <WorkerText color={workerColors.muted}>Solicitó: {ticket.requestedBarberName}</WorkerText>
      ) : null}
      <WorkerText variant="label" color={workerColors.teal}>
        {isCalling ? 'Llamando…' : readyToCall ? 'Llamar turno' : 'Marca disponibilidad para llamar'}
      </WorkerText>
    </Pressable>
  );
}

function EmptyState({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={workerUiStyles.card}>
      <WorkerText variant="headline">{label}</WorkerText>
      <WorkerText color={workerColors.muted}>{detail}</WorkerText>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  calledCard: { backgroundColor: workerColors.low, gap: 8 },
  summary: {
    alignItems: 'center',
    backgroundColor: workerColors.low,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  summaryCopy: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  ticket: { gap: 8 },
});
