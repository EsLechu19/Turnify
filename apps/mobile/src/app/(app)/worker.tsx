import { Alert, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { AuthErrorMessage } from '@/components/auth/auth-ui';
import { WorkerButton, WorkerIcon, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { useAuth } from '@/features/auth/use-auth';
import { callMyNextTicket, finishMyService, getReassignmentCandidates, getWorkerBarberQueue, markMyTicketAbsent, reassignCalledTicket, setWorkerAvailability, startMyService, translateWorkerBarberError, type ReassignmentCandidate, type WorkerAvailability, type WorkerTicket } from '@/features/queue/worker-barber-api';
import { getSupabase } from '@/lib/supabase';

let workerSubscriptionId = 0;
const availabilityLabel: Record<WorkerAvailability, string> = { disponible: 'Disponible', ocupado: 'Con turno activo', fuera_de_turno: 'Fuera de turno' };

function useRemainingTolerance(deadline: string | null): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  if (!deadline) return null;
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function WorkerScreen() {
  const { profile, isProfileLoading } = useAuth();
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null);
  const [tickets, setTickets] = useState<WorkerTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ReassignmentCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try { const next = await getWorkerBarberQueue(); setAvailability(next.availability); setTickets(next.tickets); setError(null); }
    catch (reason) { setError(translateWorkerBarberError(reason instanceof Error ? reason.message : '')); }
    finally { setIsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    if (!profile?.businessId) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`worker-barber:${profile.businessId}:${++workerSubscriptionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `empresa_id=eq.${profile.businessId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbero_operaciones', filter: `empresa_id=eq.${profile.businessId}` }, () => void refresh())
      .subscribe();
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { appState.remove(); void supabase.removeChannel(channel); };
  }, [profile?.businessId, refresh]);

  if (!isProfileLoading && (profile?.role !== 'personal' || !profile.businessId)) return <Redirect href="/" />;
  const activeTicket = tickets.find((ticket) => ticket.state === 'llamado' || ticket.state === 'en_atencion') ?? null;
  const compatibleTickets = tickets.filter((ticket) => ticket.state === 'en_espera' || ticket.state === 'notificado');
  async function act(action: () => Promise<void>, success?: string) {
    setIsActing(true); setError(null); setNotice(null);
    try { await action(); await refresh(); setNotice(success ?? null); }
    catch (reason) { setError(translateWorkerBarberError(reason instanceof Error ? reason.message : '')); await refresh(); }
    finally { setIsActing(false); }
  }

  return <WorkerScreenContainer activeNavigation="live"><ScrollView contentContainerStyle={workerUiStyles.page}>{activeTicket ? <LifecycleScreen ticket={activeTicket} candidates={candidates} showCandidates={showCandidates} isActing={isActing} act={act} openCandidates={() => void act(async () => { setShowCandidates(true); setCandidates(await getReassignmentCandidates(activeTicket.ticketId)); })} reassign={(candidate) => Alert.alert('Reasignar turno', `¿Confirmas reasignar ${activeTicket.visibleCode}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => void act(() => reassignCalledTicket(activeTicket.ticketId, candidate.barberId), 'Turno reasignado.') }])} /> : <LiveQueue availability={availability} tickets={compatibleTickets} isLoading={isLoading} isActing={isActing} act={act} />}<AuthErrorMessage message={error} />{notice && <View accessibilityRole="alert" style={workerUiStyles.card}><WorkerText variant="label" color={workerColors.teal}>{notice}</WorkerText></View>}{error && <WorkerButton label="Reintentar" tone="secondary" disabled={isActing} onPress={() => void refresh()} />}</ScrollView></WorkerScreenContainer>;
}

function LiveQueue({ availability, tickets, isLoading, isActing, act }: { availability: WorkerAvailability | null; tickets: WorkerTicket[]; isLoading: boolean; isActing: boolean; act(action: () => Promise<void>, success?: string): Promise<void> }) {
  const next = tickets[0];
  return <><View style={styles.liveHeader}><WorkerText variant="eyebrow" color={workerColors.teal}>En vivo · Operación</WorkerText><WorkerText variant="title">Mi operación</WorkerText></View><View style={[workerUiStyles.card, styles.statusCard]}><View><WorkerText variant="eyebrow" color={workerColors.muted}>Estado actual</WorkerText><WorkerText variant="headline">{availability ? availabilityLabel[availability] : 'Sin disponibilidad'}</WorkerText></View><WorkerPill label={availability === 'ocupado' ? 'OCUPADO' : availability === 'disponible' ? 'ACTIVO' : 'FUERA DE TURNO'} tone={availability === 'disponible' ? 'teal' : 'neutral'} />{availability !== 'ocupado' && <View style={styles.availabilityActions}><WorkerButton label="Estoy disponible" tone="secondary" disabled={isActing || availability === 'disponible'} onPress={() => void act(() => setWorkerAvailability('disponible'), 'Ya puedes llamar turnos compatibles.')} /><WorkerButton label="Salir de turno" tone="danger" disabled={isActing || availability === 'fuera_de_turno'} onPress={() => void act(() => setWorkerAvailability('fuera_de_turno'), 'Tu estado ahora es fuera de turno.')} /></View>}</View>{isLoading ? <View accessibilityRole="progressbar" style={workerUiStyles.card}><WorkerText variant="headline">Actualizando operación…</WorkerText><WorkerText color={workerColors.muted}>Consultando tu disponibilidad y cola compatible.</WorkerText></View> : next ? <Pressable accessibilityRole="button" accessibilityLabel={`Llamar turno ${next.visibleCode}`} disabled={isActing || availability !== 'disponible'} onPress={() => void act(() => callMyNextTicket(next.queueId), `Llamaste el turno ${next.visibleCode}.`)} style={({ pressed }) => [styles.nextCallout, { opacity: pressed || availability !== 'disponible' ? .65 : 1 }]}><WorkerText variant="eyebrow" color={workerColors.teal}>Siguiente turno</WorkerText><View style={workerUiStyles.split}><WorkerText variant="metric">{next.visibleCode}</WorkerText><WorkerIcon name="live" color={workerColors.teal} size={30} /></View><TicketDetail ticket={next} /><WorkerText variant="label" color={workerColors.teal}>{availability === 'disponible' ? 'Llamar ahora' : 'Marca disponibilidad para llamar'}</WorkerText></Pressable> : <View style={workerUiStyles.card}><WorkerText variant="headline">{availability === 'fuera_de_turno' ? 'Estás fuera de turno' : 'No hay turnos compatibles'}</WorkerText><WorkerText color={workerColors.muted}>{availability === 'fuera_de_turno' ? 'Marca tu disponibilidad para atender.' : 'Los turnos compatibles aparecerán aquí.'}</WorkerText></View>}<View style={styles.sectionHeading}><WorkerText variant="headline">Cola compatible</WorkerText><WorkerText color={workerColors.muted}>Turnos que puedes atender</WorkerText></View>{tickets.slice(1).map((ticket) => <View key={ticket.ticketId} style={[workerUiStyles.card, styles.queueCard]}><View style={workerUiStyles.split}><WorkerText variant="headline">{ticket.visibleCode}</WorkerText><WorkerPill label={ticket.state === 'notificado' ? 'NOTIFICADO' : 'EN ESPERA'} /></View><TicketDetail ticket={ticket} /></View>)}<WorkerButton label="Agregar cliente presencial" onPress={() => router.push('/(app)/worker-walk-in')} /></>;
}

function LifecycleScreen({ ticket, candidates, showCandidates, isActing, act, openCandidates, reassign }: { ticket: WorkerTicket; candidates: ReassignmentCandidate[]; showCandidates: boolean; isActing: boolean; act(action: () => Promise<void>, success?: string): Promise<void>; openCandidates(): void; reassign(candidate: ReassignmentCandidate): void }) {
  const called = ticket.state === 'llamado';
  const remainingTolerance = useRemainingTolerance(ticket.calledDeadlineAt);
  const responseLabel = ticket.customerResponse === 'presente' ? 'Cliente: ya está aquí' : ticket.customerResponse === 'llega_en_2_min' ? 'Cliente: llega en 2 minutos' : 'Esperando respuesta del cliente';
  return <>{called ? <View style={styles.calledTop}><Pressable accessibilityRole="button" accessibilityLabel="Volver a la cola" onPress={() => router.replace('/(app)/worker-queue')}><WorkerIcon name="back" /></Pressable><WorkerPill label="TURNO LLAMADO" tone="teal" /></View> : <View style={styles.serviceBanner}><WorkerIcon name="live" color={workerColors.teal} /><WorkerText variant="label" color={workerColors.teal}>ATENCIÓN EN CURSO</WorkerText></View>}<View style={[styles.ticketHero, !called && styles.serviceHero]}><WorkerText variant="eyebrow" color={called ? workerColors.teal : '#EDF4FF'}>{called ? 'Listo para iniciar' : 'Servicio activo'}</WorkerText><WorkerText variant="metric" color={called ? workerColors.ink : '#FFFFFF'}>{ticket.visibleCode}</WorkerText><TicketDetail ticket={ticket} inverted={!called} /></View>{called ? <><View style={[workerUiStyles.card, styles.tolerance]}><WorkerText variant="eyebrow" color={workerColors.teal}>Tolerancia de llegada</WorkerText><WorkerText variant="headline">{remainingTolerance ? `${remainingTolerance} restantes` : 'Tiempo no disponible'}</WorkerText><WorkerText color={workerColors.muted}>{responseLabel}</WorkerText><WorkerText color={workerColors.muted}>La respuesta no inicia ni extiende la atención.</WorkerText></View><WorkerButton label="Iniciar atención" disabled={isActing} onPress={() => void act(() => startMyService(ticket.ticketId))} /><WorkerButton label="Reasignar turno" tone="secondary" disabled={isActing} onPress={openCandidates} />{showCandidates && <View style={workerUiStyles.card}><WorkerText variant="label">Barberos compatibles disponibles</WorkerText>{candidates.length ? candidates.map((candidate) => <WorkerButton key={candidate.barberId} label={`Reasignar a ${candidate.name}`} tone="secondary" disabled={isActing} onPress={() => reassign(candidate)} />) : <WorkerText color={workerColors.muted}>No hay otro barbero disponible.</WorkerText>}</View>}</> : <><WorkerButton label="Finalizar atención" disabled={isActing} onPress={() => void act(() => finishMyService(ticket.ticketId), 'Atención finalizada.')} /><WorkerButton label="Marcar ausencia" tone="danger" disabled={isActing} onPress={() => void act(() => markMyTicketAbsent(ticket.ticketId), 'Turno marcado como ausente.')} /></>}</>;
}

function TicketDetail({ ticket, inverted = false }: { ticket: WorkerTicket; inverted?: boolean }) {
  const color = inverted ? '#FFFFFF' : workerColors.body; const muted = inverted ? '#EDF4FF' : workerColors.muted;
  return <View style={styles.ticketDetails}><WorkerText color={color}>{ticket.serviceName || ticket.queueName}</WorkerText><WorkerText variant="label" color={muted}>{ticket.queueName}</WorkerText>{ticket.requestedBarberName && <WorkerText color={muted}>Barbero solicitado: {ticket.requestedBarberName}</WorkerText>}{ticket.assignedBarberName && <WorkerText color={muted}>Barbero asignado: {ticket.assignedBarberName}</WorkerText>}</View>;
}

const styles = StyleSheet.create({ liveHeader: { gap: 10 }, statusCard: { gap: 16 }, availabilityActions: { flexDirection: 'row', gap: 8 }, nextCallout: { backgroundColor: '#EDF4FF', borderRadius: 12, gap: 12, padding: 20 }, sectionHeading: { gap: 2, marginTop: 4 }, queueCard: { gap: 10 }, ticketDetails: { gap: 3 }, calledTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, serviceBanner: { alignItems: 'center', backgroundColor: '#EDF4FF', borderRadius: 8, flexDirection: 'row', gap: 8, padding: 12 }, ticketHero: { backgroundColor: workerColors.card, borderColor: workerColors.outline, borderRadius: 12, borderWidth: 1, gap: 10, padding: 20 }, serviceHero: { backgroundColor: workerColors.ink, borderColor: workerColors.ink }, tolerance: { backgroundColor: '#EDF4FF' } });
