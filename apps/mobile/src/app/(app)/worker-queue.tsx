import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { callMyNextTicket, getWorkerBarberQueue, translateWorkerBarberError, type WorkerTicket } from '@/features/queue/worker-barber-api';
import { useTheme } from '@/hooks/use-theme';

export default function WorkerQueueScreen() {
  const theme = useTheme();
  const [tickets, setTickets] = useState<WorkerTicket[]>([]);
  const [availability, setAvailability] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const queue = await getWorkerBarberQueue();
      setAvailability(queue.availability);
      setTickets(queue.tickets.filter((ticket) => ticket.state === 'en_espera' || ticket.state === 'notificado'));
      setError(null);
    } catch (reason) {
      setError(translateWorkerBarberError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function call(ticket: WorkerTicket) {
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

  return <WorkerScreenContainer activeNavigation="queue"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Operación</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Cola compatible</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Solo se muestran turnos que puedes atender.</Text></View>
    {isLoading && <ActivityIndicator color={theme.primary} />}
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()} style={[workerScreenStyles.card, { borderColor: theme.destructive, backgroundColor: theme.destructiveMuted }]}><Text style={{ color: theme.destructive }}>{error}</Text><Text style={{ color: theme.destructive, fontWeight: '700' }}>Reintentar</Text></Pressable>}
    {!isLoading && !error && availability === 'fuera_de_turno' && <QueueState label="Estás fuera de turno" detail="Marca tu disponibilidad en En vivo para llamar turnos." theme={theme} />}
    {!isLoading && !error && availability !== 'fuera_de_turno' && tickets.length === 0 && <QueueState label="No hay turnos compatibles" detail="Los nuevos turnos compatibles aparecerán aquí." theme={theme} />}
    {tickets.map((ticket) => <Pressable key={ticket.ticketId} accessibilityRole="button" disabled={availability !== 'disponible' || isCalling !== null} onPress={() => void call(ticket)} style={({ pressed }) => [workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed || availability !== 'disponible' ? .72 : 1 }]}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>{ticket.visibleCode}</Text><Text style={{ color: theme.primary, fontWeight: '700' }}>{ticket.state === 'notificado' ? 'NOTIFICADO' : 'EN ESPERA'}</Text></View><Text style={{ color: theme.textSecondary }}>{ticket.queueName}</Text>{ticket.serviceName && <Text style={{ color: theme.text }}>Servicio: {ticket.serviceName}</Text>}{ticket.requestedBarberName && <Text style={{ color: theme.textSecondary }}>Solicitó: {ticket.requestedBarberName}</Text>}<Text style={{ color: theme.primary, fontWeight: '700' }}>{isCalling === ticket.ticketId ? 'Llamando…' : availability === 'disponible' ? 'Llamar turno' : 'Marca tu disponibilidad para llamar'}</Text></Pressable>)}
  </ScrollView></WorkerScreenContainer>;
}

function QueueState({ label, detail, theme }: { label: string; detail: string; theme: ReturnType<typeof useTheme> }) {
  return <View style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{label}</Text><Text style={{ color: theme.textSecondary }}>{detail}</Text></View>;
}
