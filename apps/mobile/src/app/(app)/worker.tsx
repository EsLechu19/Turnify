import { Alert, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { AuthButton, AuthErrorMessage } from '@/components/auth/auth-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { ThemedText } from '@/components/themed-text';
import { AppCard, StatusBadge } from '@/components/ui/surface';
import { useAuth } from '@/features/auth/use-auth';
import {
  callMyNextTicket,
  finishMyService,
  getReassignmentCandidates,
  getWorkerBarberQueue,
  markMyTicketAbsent,
  reassignCalledTicket,
  setWorkerAvailability,
  startMyService,
  translateWorkerBarberError,
  type ReassignmentCandidate,
  type WorkerAvailability,
  type WorkerTicket,
} from '@/features/queue/worker-barber-api';
import { useTheme } from '@/hooks/use-theme';
import { getSupabase } from '@/lib/supabase';

let workerSubscriptionId = 0;

const availabilityLabel: Record<WorkerAvailability, string> = {
  disponible: 'Disponible',
  ocupado: 'Con turno activo',
  fuera_de_turno: 'Fuera de turno',
};

export default function WorkerScreen() {
  const theme = useTheme();
  const { profile, isProfileLoading } = useAuth();
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null);
  const [tickets, setTickets] = useState<WorkerTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reassignmentCandidates, setReassignmentCandidates] = useState<ReassignmentCandidate[]>([]);
  const [isReassignmentOpen, setIsReassignmentOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const refresh = useCallback(async () => {
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
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    if (!profile?.businessId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`worker-barber:${profile.businessId}:${++workerSubscriptionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `empresa_id=eq.${profile.businessId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbero_operaciones', filter: `empresa_id=eq.${profile.businessId}` }, () => void refresh())
      .subscribe();
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { appState.remove(); void supabase.removeChannel(channel); };
  }, [profile?.businessId, refresh]);

  if (!isProfileLoading && (profile?.role !== 'personal' || !profile.businessId)) return <Redirect href="/(app)" />;

  const activeTicket = tickets.find((ticket) => ticket.state === 'llamado' || ticket.state === 'en_atencion') ?? null;
  const compatibleTickets = tickets.filter((ticket) => ticket.state === 'en_espera' || ticket.state === 'notificado');

  async function act(action: () => Promise<void>, successMessage?: string) {
    setIsActing(true);
    setError(null);
    setNotice(null);
    try { await action(); await refresh(); setNotice(successMessage ?? null); } catch (reason) {
      setError(translateWorkerBarberError(reason instanceof Error ? reason.message : ''));
      await refresh();
    } finally { setIsActing(false); }
  }

  return (
    <WorkerScreenContainer activeNavigation="live">
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Mi operación</ThemedText>
        {isLoading ? <ThemedText type="small">Actualizando tu cola…</ThemedText> : (
          <>
            <AppCard style={styles.card}>
              <ThemedText type="eyebrow" themeColor="primary">Disponibilidad</ThemedText>
              <StatusBadge label={availability ? availabilityLabel[availability] : 'No disponible'} tone={availability === 'fuera_de_turno' ? 'destructive' : 'primary'} />
              {availability === 'ocupado' && <ThemedText type="small">Tu disponibilidad se actualiza al finalizar o marcar ausente el turno activo.</ThemedText>}
              {availability !== 'ocupado' && <View style={styles.actions}>
                <AuthButton label="Estoy disponible" variant="secondary" onPress={() => void act(() => setWorkerAvailability('disponible'))} disabled={isActing || availability === 'disponible'} />
                <AuthButton label="Salir de turno" variant="destructive" onPress={() => void act(() => setWorkerAvailability('fuera_de_turno'))} disabled={isActing || availability === 'fuera_de_turno'} />
              </View>}
            </AppCard>
            {activeTicket ? <ActiveTicket ticket={activeTicket} candidates={reassignmentCandidates} isReassignmentOpen={isReassignmentOpen} isActing={isActing} act={act} loadCandidates={() => void act(async () => { setIsReassignmentOpen(true); setReassignmentCandidates(await getReassignmentCandidates(activeTicket.ticketId)); })} reassign={(candidate) => Alert.alert('Reasignar turno', `¿Confirmas reasignar ${activeTicket.visibleCode} a ${candidate.name}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => void act(() => reassignCalledTicket(activeTicket.ticketId, candidate.barberId), `Turno reasignado a ${candidate.name}.`) }])} /> : <CompatibleQueue tickets={compatibleTickets} availability={availability} isActing={isActing} act={act} theme={theme} />}
          </>
        )}
        <AuthErrorMessage message={error} />
        {notice && <AppCard><ThemedText type="smallBold">{notice}</ThemedText></AppCard>}
        {error && <AuthButton label="Reintentar" variant="secondary" onPress={() => void refresh()} disabled={isActing} />}
        <AuthButton label="Actualizar" variant="secondary" onPress={() => void refresh()} disabled={isActing} />
        <AuthButton label="Ver cola compatible" variant="secondary" onPress={() => router.replace('/(app)/worker-queue')} disabled={isActing} />
      </ScrollView>
    </WorkerScreenContainer>
  );
}

function ActiveTicket({ ticket, candidates, isReassignmentOpen, isActing, act, loadCandidates, reassign }: { ticket: WorkerTicket; candidates: ReassignmentCandidate[]; isReassignmentOpen: boolean; isActing: boolean; act(action: () => Promise<void>): Promise<void>; loadCandidates(): void; reassign(candidate: ReassignmentCandidate): void }) {
  return <AppCard style={styles.card}>
    <ThemedText type="eyebrow" themeColor="primary">Turno asignado</ThemedText>
    <ThemedText type="title">{ticket.visibleCode}</ThemedText>
    <StatusBadge label={ticket.state === 'llamado' ? 'Llamado' : 'En atención'} tone="primary" />
    <TicketFacts ticket={ticket} />
    {ticket.state === 'llamado' ? <View style={styles.actions}>
      <AuthButton label="Iniciar atención" onPress={() => void act(() => startMyService(ticket.ticketId))} disabled={isActing} isLoading={isActing} />
      <AuthButton label="Reasignar turno" variant="secondary" onPress={loadCandidates} disabled={isActing} />
      {isReassignmentOpen && (candidates.length > 0 ? <View style={styles.queue}><ThemedText type="small">Selecciona un barbero disponible y compatible. Esta acción no se puede hacer después de iniciar la atención.</ThemedText>{candidates.map((candidate) => <AuthButton key={candidate.barberId} label={`Reasignar a ${candidate.name}`} variant="secondary" onPress={() => reassign(candidate)} disabled={isActing} />)}</View> : <ThemedText type="small">No hay otro barbero disponible y compatible para reasignar este turno.</ThemedText>)}
      <AuthButton label="Marcar ausente" variant="destructive" onPress={() => void act(() => markMyTicketAbsent(ticket.ticketId))} disabled={isActing} />
    </View> : <AuthButton label="Finalizar atención" onPress={() => void act(() => finishMyService(ticket.ticketId))} disabled={isActing} isLoading={isActing} />}
  </AppCard>;
}

function CompatibleQueue({ tickets, availability, isActing, act, theme }: { tickets: WorkerTicket[]; availability: WorkerAvailability | null; isActing: boolean; act(action: () => Promise<void>): Promise<void>; theme: ReturnType<typeof useTheme> }) {
  if (availability === 'fuera_de_turno') return <AppCard><ThemedText type="smallBold">No estás disponible</ThemedText><ThemedText type="small">Marca tu disponibilidad para ver y llamar turnos compatibles.</ThemedText></AppCard>;
  if (tickets.length === 0) return <AppCard><ThemedText type="smallBold">No hay turnos compatibles</ThemedText><ThemedText type="small">Los turnos solicitados para otro barbero y los servicios no compatibles no aparecen aquí.</ThemedText></AppCard>;
  return <View style={styles.queue}><ThemedText type="smallBold">Cola compatible</ThemedText>{tickets.map((ticket) => <Pressable key={ticket.ticketId} style={[styles.ticket, { borderColor: theme.border }]} accessibilityRole="button" onPress={() => void act(() => callMyNextTicket(ticket.queueId))} disabled={isActing || availability !== 'disponible'}><ThemedText type="smallBold">{ticket.visibleCode}</ThemedText><TicketFacts ticket={ticket} /><ThemedText type="small" themeColor="primary">Llamar este turno</ThemedText></Pressable>)}</View>;
}

function TicketFacts({ ticket }: { ticket: WorkerTicket }) {
  return <View style={styles.facts}><ThemedText type="small">{ticket.queueName}</ThemedText>{ticket.serviceName && <ThemedText type="small">Servicio: {ticket.serviceName}</ThemedText>}{ticket.requestedBarberName && <ThemedText type="small">Solicitó: {ticket.requestedBarberName}</ThemedText>}{ticket.assignedBarberName && <ThemedText type="small">Asignado: {ticket.assignedBarberName}</ThemedText>}</View>;
}

const styles = StyleSheet.create({ content: { gap: 16, paddingHorizontal: 20, paddingVertical: 24 }, card: { gap: 10 }, actions: { gap: 8 }, queue: { gap: 8 }, ticket: { borderWidth: 1, borderRadius: 10, gap: 6, padding: 12 }, facts: { gap: 2 } });
