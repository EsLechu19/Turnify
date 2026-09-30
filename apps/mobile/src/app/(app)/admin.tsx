import QRCode from 'react-native-qrcode-svg';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { createPersonalInvitation, getBusiness, translateInvitationError, type Business } from '@/features/business/business-api';
import { useAuth } from '@/features/auth/use-auth';
import {
  callNextTicket,
  createWalkInTicket,
  finishService,
  getStaffQueue,
  markAbsent,
  startService,
  translateStaffQueueError,
  type StaffQueue,
  type StaffTicket,
} from '@/features/queue/staff-queue-api';
import { getSupabase } from '@/lib/supabase';

let realtimeSubscriptionId = 0;

export default function AdminScreen() {
  const { profile, isProfileLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [queues, setQueues] = useState<StaffQueue[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [walkInPriority, setWalkInPriority] = useState<'normal' | 'preferencial'>('normal');
  const [walkInReference, setWalkInReference] = useState('');
  const [createdWalkInCode, setCreatedWalkInCode] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  const loadBusiness = useCallback(async () => {
    if (!profile?.businessId) return;

    setIsLoading(true);
    try {
      const [nextBusiness, staffQueue] = await Promise.all([
        getBusiness(profile.businessId),
        getStaffQueue(profile.businessId),
      ]);
      setBusiness(nextBusiness);
      setQueues(staffQueue.queues);
      setTickets(staffQueue.tickets);
      setSelectedQueueId((current) => (
        current && staffQueue.queues.some((queue) => queue.id === current)
          ? current
          : (staffQueue.queues[0]?.id ?? null)
      ));
      setError(null);
    } catch {
      setError('No pudimos cargar los datos de tu empresa. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.businessId]);

  useFocusEffect(
    useCallback(() => {
      void loadBusiness();
    }, [loadBusiness]),
  );

  useEffect(() => {
    if (!profile?.businessId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`staff-queue:${profile.businessId}:${++realtimeSubscriptionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `empresa_id=eq.${profile.businessId}` }, () => {
        void loadBusiness();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'filas', filter: `empresa_id=eq.${profile.businessId}` }, () => {
        void loadBusiness();
      })
      .subscribe();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadBusiness();
      }
    });

    return () => {
      appStateSubscription.remove();
      void supabase.removeChannel(channel);
    };
  }, [loadBusiness, profile?.businessId]);

  if (!isProfileLoading && (!profile?.businessId || (profile.role !== 'admin' && profile.role !== 'personal'))) {
    return <Redirect href="/(app)" />;
  }

  const selectedQueue = queues.find((queue) => queue.id === selectedQueueId) ?? null;
  const selectedTickets = selectedQueueId ? tickets.filter((ticket) => ticket.queueId === selectedQueueId) : [];
  const currentTicket = selectedTickets.find((ticket) => ticket.state === 'llamado' || ticket.state === 'en_atencion') ?? null;

  async function handleAction(action: () => Promise<unknown>) {
    setIsActing(true);
    setError(null);
    try {
      await action();
      await loadBusiness();
    } catch (reason) {
      setError(translateStaffQueueError(reason instanceof Error ? reason.message : ''));
      void loadBusiness();
    } finally {
      setIsActing(false);
    }
  }

  async function handleCreateInvitation() {
    setIsActing(true);
    setError(null);
    setInvitationToken(null);
    try {
      const invitation = await createPersonalInvitation(invitationEmail);
      setInvitationToken(invitation.token);
      setInvitationEmail('');
    } catch (reason) {
      setError(translateInvitationError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsActing(false);
    }
  }

  return (
    <AuthScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <ThemedText type="subtitle">{profile?.role === 'admin' ? 'Panel de administración' : 'Panel de atención'}</ThemedText>
      {isLoading ? (
        <ThemedText type="small">Actualizando filas…</ThemedText>
      ) : business ? (
        <View style={styles.content}>
           {profile?.role === 'admin' && (
             <>
               <View style={styles.businessDetails}>
                 <ThemedText type="smallBold">{business.name}</ThemedText>
                 <ThemedText type="small">Código de empresa</ThemedText>
                 <ThemedText type="title">{business.code}</ThemedText>
                 <View style={styles.qr}>
                   <QRCode value={`turnify:${business.code}`} size={208} />
                 </View>
                 <View style={styles.guidance}>
                   <ThemedText type="smallBold">Compártelo con tus clientes</ThemedText>
                   <ThemedText type="small">Pueden escanear este QR o ingresar el código de 8 caracteres en Turnify para ver tus filas.</ThemedText>
                 </View>
               </View>
               <View style={styles.invitationSection}>
                 <ThemedText type="smallBold">Invitar personal</ThemedText>
                 <AuthField
                   label="Correo (opcional)"
                   value={invitationEmail}
                   onChangeText={setInvitationEmail}
                   placeholder="personal@empresa.com"
                   keyboardType="email-address"
                 />
                 <AuthButton label="Crear invitación" onPress={() => void handleCreateInvitation()} disabled={isActing} isLoading={isActing} />
                 {invitationToken && (
                   <View style={styles.invitationToken}>
                     <ThemedText type="smallBold">Código de invitación (se muestra una sola vez)</ThemedText>
                     <ThemedText type="title">{invitationToken}</ThemedText>
                     <ThemedText type="small">Compártelo solo por un medio privado. El código vence; no lo publiques ni lo reenvíes.</ThemedText>
                   </View>
                 )}
               </View>
               <AuthButton label="Configurar empresa y filas" onPress={() => router.push('/(app)/configuration')} disabled={isActing} />
             </>
           )}
          <View style={styles.queueSection}>
            <ThemedText type="smallBold">Fila activa</ThemedText>
            {queues.length === 0 ? (
              <ThemedText type="small">No hay filas disponibles.</ThemedText>
            ) : (
              <View style={styles.queueOptions}>
                {queues.map((queue) => (
                  <Pressable
                    key={queue.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: queue.id === selectedQueueId }}
                    onPress={() => setSelectedQueueId(queue.id)}
                    style={[styles.queueOption, queue.id === selectedQueueId && styles.queueOptionSelected]}>
                    <ThemedText type="smallBold">{queue.name}</ThemedText>
                    <ThemedText type="small">{queue.waiting} en espera</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          {selectedQueue && (
            <View style={styles.queueSection}>
              <View style={styles.walkInSection}>
                <ThemedText type="smallBold">Turno presencial</ThemedText>
                <ThemedText type="small">Fila activa: {selectedQueue.name}</ThemedText>
                <View style={styles.priorityOptions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: walkInPriority === 'normal' }}
                    onPress={() => setWalkInPriority('normal')}
                    style={[styles.priorityOption, walkInPriority === 'normal' && styles.queueOptionSelected]}>
                    <ThemedText type="smallBold">Normal</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: walkInPriority === 'preferencial' }}
                    onPress={() => setWalkInPriority('preferencial')}
                    style={[styles.priorityOption, walkInPriority === 'preferencial' && styles.queueOptionSelected]}>
                    <ThemedText type="smallBold">Preferencial</ThemedText>
                  </Pressable>
                </View>
                <AuthField
                  label="Referencia (opcional)"
                  value={walkInReference}
                  onChangeText={setWalkInReference}
                  placeholder="Ej. Recepción"
                />
                <AuthButton label="Crear turno presencial" onPress={() => void handleAction(async () => {
                  const ticket = await createWalkInTicket(selectedQueue.id, walkInPriority, walkInReference);
                  setCreatedWalkInCode(ticket.visibleCode);
                  setWalkInReference('');
                })} disabled={isActing} isLoading={isActing} />
                {createdWalkInCode && <ThemedText type="smallBold">Turno creado: {createdWalkInCode}</ThemedText>}
              </View>
              <ThemedText type="smallBold">Atención en {selectedQueue.name}</ThemedText>
              {currentTicket ? (
                <View style={styles.ticketCard}>
                  <ThemedText type="title">{currentTicket.visibleCode}</ThemedText>
                  <ThemedText type="small">{currentTicket.state === 'llamado' ? 'Llamado' : 'En atención'} · {currentTicket.origin === 'presencial' ? 'Presencial' : 'App'} · {currentTicket.priority === 'preferencial' ? 'Preferencial' : 'Normal'}</ThemedText>
                  {currentTicket.state === 'llamado' && (
                    <>
                      <AuthButton label="Iniciar atención" onPress={() => void handleAction(() => startService(currentTicket.id))} disabled={isActing} isLoading={isActing} />
                      <AuthButton label="Marcar ausente" onPress={() => void handleAction(() => markAbsent(currentTicket.id))} disabled={isActing} />
                    </>
                  )}
                  {currentTicket.state === 'en_atencion' && (
                    <AuthButton label="Finalizar atención" onPress={() => void handleAction(() => finishService(currentTicket.id))} disabled={isActing} isLoading={isActing} />
                  )}
                </View>
              ) : (
                <AuthButton label="Llamar siguiente" onPress={() => void handleAction(async () => {
                  const ticket = await callNextTicket(selectedQueue.id);
                  if (!ticket) setError('No hay turnos en espera en esta fila.');
                })} disabled={isActing || selectedTickets.every((ticket) => ticket.state !== 'en_espera' && ticket.state !== 'notificado')} isLoading={isActing} />
              )}
              {!currentTicket && selectedTickets.length > 0 && (
                <View style={styles.ticketList}>
                  {selectedTickets.map((ticket) => (
                    <View key={ticket.id} style={styles.ticketRow}>
                      <ThemedText type="smallBold">{ticket.visibleCode}</ThemedText>
                      <ThemedText type="small">{ticket.state === 'notificado' ? 'Notificado' : 'En espera'} · {ticket.origin === 'presencial' ? 'Presencial' : 'App'} · {ticket.priority === 'preferencial' ? 'Preferencial' : 'Normal'}</ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <ThemedText type="small">No encontramos una empresa asociada a tu cuenta.</ThemedText>
      )}
      <AuthErrorMessage message={error} />
      {error && <AuthButton label="Reintentar" onPress={() => void loadBusiness()} />}
      <AuthButton label="Volver al inicio" onPress={() => router.replace('/(app)')} />
      </ScrollView>
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: 16, paddingVertical: 24 },
  content: { gap: 16 },
  businessDetails: { alignItems: 'center', gap: 12 },
  qr: { backgroundColor: '#FFFFFF', padding: 16 },
  guidance: { alignSelf: 'stretch', gap: 6, padding: 16, borderRadius: 8, backgroundColor: '#E8F0FE' },
  queueSection: { gap: 8 },
  queueOptions: { gap: 8 },
  queueOption: { borderWidth: 1, borderColor: '#DADCE0', borderRadius: 8, padding: 12, gap: 2 },
  queueOptionSelected: { borderColor: '#1A73E8', backgroundColor: '#E8F0FE' },
  ticketCard: { gap: 10, borderRadius: 8, backgroundColor: '#E8F0FE', padding: 16 },
  ticketList: { gap: 8 },
  ticketRow: { gap: 2, borderBottomWidth: 1, borderBottomColor: '#DADCE0', paddingVertical: 8 },
  walkInSection: { gap: 8, borderRadius: 8, backgroundColor: '#F8F9FA', padding: 12 },
  invitationSection: { gap: 8, borderRadius: 8, backgroundColor: '#F8F9FA', padding: 12 },
  invitationToken: { gap: 6, borderRadius: 8, backgroundColor: '#E8F0FE', padding: 12 },
  priorityOptions: { flexDirection: 'row', gap: 8 },
  priorityOption: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DADCE0', borderRadius: 8, padding: 10 },
});
