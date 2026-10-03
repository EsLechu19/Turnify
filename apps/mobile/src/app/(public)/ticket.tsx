import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalledGuestTicket } from '@/components/customer/called-guest-ticket';
import { CompletedGuestTicket } from '@/components/customer/completed-guest-ticket';
import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { canUseGuestTicket } from '@/features/public/public-route-policy';
import { cancelGuestTicket, getGuestTicketState, type GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { translateQueueError } from '@/features/queue/queue-api';
import { canCancelTicket, presentTicketStatus, ticketPosition } from '@/features/queue/ticket-presentation';
import { getSupabase } from '@/lib/supabase';

const colors = {
  canvas: '#F7F9FF',
  container: '#E9EEFF',
  ink: '#111D27',
  muted: '#60707D',
  teal: '#00686C',
  tealBright: '#0E8388',
  white: '#FFFFFF',
  border: '#DCE3F2',
  danger: '#B42318',
};

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function TicketHeader({ onHome }: { onHome: () => void }) {
  return <View style={styles.header}>
    <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View><Text style={styles.brandName}>Turnify</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver al inicio" hitSlop={8} onPress={onHome} style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}>
      <Text style={styles.homeIcon}>⌂</Text><Text style={styles.homeLabel}>Inicio</Text>
    </Pressable>
  </View>;
}

function QueueTimeline({ status }: { status: 'en_espera' | 'notificado' }) {
  const notified = status === 'notificado';
  return <View accessibilityLabel={notified ? 'Progreso: turno notificado y aún en espera' : 'Progreso: turno en espera'} style={styles.timeline}>
    <View style={styles.timelineStep}><View style={[styles.timelineDot, styles.timelineDotComplete]}><Text style={styles.timelineCheck}>✓</Text></View><Text style={styles.timelineLabel}>Confirmado</Text></View>
    <View style={[styles.timelineLine, styles.timelineLineComplete]} />
    <View style={styles.timelineStep}><View style={[styles.timelineDot, styles.timelineDotActive]}><View style={styles.timelineDotInner} /></View><Text style={[styles.timelineLabel, styles.timelineLabelActive]}>{notified ? 'Notificado' : 'En espera'}</Text></View>
    <View style={styles.timelineLine} />
    <View style={styles.timelineStep}><View style={styles.timelineDot} /><Text style={styles.timelineLabel}>Llamado</Text></View>
  </View>;
}

export default function GuestTicketScreen() {
  const { ticketAccess, reset } = useGuestFlow();
  const [ticket, setTicket] = useState<GuestTicketState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const returnHome = useCallback(() => {
    reset();
    router.replace('/');
  }, [reset]);

  const refresh = useCallback(async () => {
    if (!ticketAccess) return false;
    setIsLoading(true);
    try {
      setTicket(await getGuestTicketState(ticketAccess));
      setError(null);
      return true;
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ticketAccess]);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    let channel: ReturnType<ReturnType<typeof getSupabase>['channel']> | undefined;

    async function start() {
      const foundTicket = await refresh();
      if (!isActive || !foundTicket || !ticketAccess) return;
      channel = getSupabase()
        .channel(`guest-ticket:${ticketAccess.ticketId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketAccess.ticketId}` }, () => { void refresh(); })
        .subscribe((subscriptionStatus) => { if (subscriptionStatus === 'SUBSCRIBED') void refresh(); });
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    void start();

    return () => {
      isActive = false;
      appStateSubscription.remove();
      if (channel) void getSupabase().removeChannel(channel);
    };
  }, [refresh, ticketAccess]));

  const status = ticket ? presentTicketStatus(ticket.status) : null;
  const canCancel = ticket ? canCancelTicket(ticket.status) : false;
  const barberName = ticket?.assignedBarberName ?? ticket?.requestedBarberName ?? null;

  async function cancel() {
    if (!ticketAccess || !canCancel) return;
    setIsCancelling(true);
    try {
      await cancelGuestTicket(ticketAccess);
      setIsConfirmingCancel(false);
      await refresh();
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsCancelling(false);
    }
  }

  if (!canUseGuestTicket(ticketAccess)) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage><CustomerState label="No hay un turno disponible en esta sesión." detail="Por privacidad, necesitas conservar el acceso del turno en este dispositivo." action={returnHome} /></CustomerPage></SafeAreaView>;
  }

  if (ticket && status?.isActiveTurn) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage><CalledGuestTicket ticket={ticket} error={error} onRetry={() => void refresh()} /></CustomerPage></SafeAreaView>;
  }

  if (ticket && status?.isCompletedTurn) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage><CompletedGuestTicket ticket={ticket} error={error} onRetry={() => void refresh()} onReturn={returnHome} /></CustomerPage></SafeAreaView>;
  }

  return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage>
    <TicketHeader onHome={() => router.replace('/')} />
    <CustomerHeading eyebrow="Tu turno" title="Sigue tu atención" detail="Conserva tu código y revisa la pantalla del local." />
    {isLoading && !ticket && <CustomerState label="Actualizando tu turno…" isLoading />}
    {error && <CustomerState label={error} action={() => void refresh()} />}
    {ticket && status && <>
      <View style={styles.statusRow}><View style={[styles.statusChip, { backgroundColor: status.tone === 'destructive' ? '#FDECEC' : colors.container }]}><View style={[styles.statusDot, { backgroundColor: status.tone === 'destructive' ? colors.danger : colors.tealBright }]} /><Text style={[styles.statusText, { color: status.tone === 'destructive' ? colors.danger : colors.teal }]}>{status.label.toUpperCase()}</Text></View>{isLoading && <Text style={styles.refreshing}>Actualizando…</Text>}</View>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>CÓDIGO DE TURNO</Text>
        <Text accessibilityLabel={`Código de turno ${ticket.visibleCode}`} style={styles.code}>{ticket.visibleCode}</Text>
        <Text style={styles.heroMessage}>{status.message}</Text>
      </View>

      {(ticket.status === 'en_espera' || ticket.status === 'notificado') && <>
        <View style={styles.metrics}>
          <View style={styles.metricCard}><Text style={styles.metricValue}>{ticket.peopleAhead}</Text><Text style={styles.metricLabel}>{ticket.peopleAhead === 1 ? 'persona delante' : 'personas delante'}</Text></View>
          <View style={styles.metricCard}><Text style={styles.metricValue}>{ticket.waitMinutes}<Text style={styles.metricUnit}> min</Text></Text><Text style={styles.metricLabel}>espera estimada</Text></View>
        </View>
        <CustomerCard style={styles.progressCard}><Text style={styles.cardTitle}>Progreso de tu turno</Text><QueueTimeline status={ticket.status} /><Text style={styles.progressDetail}>Tu posición actual es {ticketPosition(ticket.peopleAhead)}.</Text></CustomerCard>
      </>}

      {(ticket.serviceName || barberName) && <CustomerCard style={styles.detailCard}>
        <Text style={styles.cardTitle}>Detalles de tu turno</Text>
        {ticket.serviceName && <View style={styles.factRow}><View style={styles.factIcon}><Text style={styles.factIconText}>✦</Text></View><View style={styles.factCopy}><Text style={styles.factLabel}>SERVICIO</Text><Text style={styles.factValue}>{ticket.serviceName}</Text></View></View>}
        {barberName && <View style={styles.factRow}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(barberName)}</Text></View><View style={styles.factCopy}><Text style={styles.factLabel}>{ticket.assignedBarberName ? 'BARBERO ASIGNADO' : 'PREFERENCIA DE BARBERO'}</Text><Text style={styles.factValue}>{barberName}</Text></View></View>}
      </CustomerCard>}

      {status.showsQueueProgress && <View style={styles.infoCard}><View style={styles.infoIcon}><Text style={styles.infoIconText}>i</Text></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>Atención en el local</Text><Text style={styles.infoDetail}>Tu código se mostrará o llamará en la barbería cuando sea tu turno.</Text></View></View>}

      {canCancel && (isConfirmingCancel
        ? <CustomerCard style={styles.cancelCard}><Text style={styles.cancelTitle}>¿Cancelar tu turno?</Text><Text style={styles.cancelDetail}>Esta acción cancelará tu turno actual.</Text><View style={styles.cancelActions}><View style={styles.cancelAction}><CustomerButton label="Volver" variant="secondary" disabled={isCancelling} onPress={() => setIsConfirmingCancel(false)} /></View><View style={styles.cancelAction}><CustomerButton label="Confirmar cancelación" variant="destructive" loading={isCancelling} onPress={() => void cancel()} /></View></View></CustomerCard>
        : <CustomerButton label="Cancelar turno" variant="destructive" onPress={() => setIsConfirmingCancel(true)} />)}
      <CustomerButton label="Actualizar" variant="secondary" onPress={() => void refresh()} />
      <CustomerButton label="Volver al inicio" variant="secondary" onPress={returnHome} />
    </>}
  </CustomerPage></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandMark: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 9, height: 28, justifyContent: 'center', width: 28 },
  brandMarkText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  brandName: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  homeButton: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 36, paddingHorizontal: 6 },
  homeIcon: { color: colors.teal, fontSize: 18, fontWeight: '700' }, homeLabel: { color: colors.teal, fontSize: 13, fontWeight: '700' }, pressed: { opacity: 0.68 },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statusChip: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 7, paddingHorizontal: 11, paddingVertical: 7 },
  statusDot: { borderRadius: 4, height: 8, width: 8 }, statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }, refreshing: { color: colors.muted, fontSize: 12 },
  heroCard: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: 7, paddingHorizontal: 20, paddingVertical: 27, shadowColor: colors.ink, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.05, shadowRadius: 12 },
  heroEyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, code: { color: colors.ink, fontSize: 58, fontWeight: '800', letterSpacing: -2, lineHeight: 67 }, heroMessage: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  metrics: { flexDirection: 'row', gap: 12 }, metricCard: { backgroundColor: colors.container, borderRadius: 16, flex: 1, minHeight: 100, padding: 16 }, metricValue: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -0.8 }, metricUnit: { color: colors.teal, fontSize: 16, letterSpacing: 0 }, metricLabel: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  progressCard: { gap: 16, padding: 18 }, cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, progressDetail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  timeline: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 }, timelineStep: { alignItems: 'center', width: 82 }, timelineDot: { alignItems: 'center', backgroundColor: colors.white, borderColor: '#BFC9D9', borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 }, timelineDotComplete: { backgroundColor: colors.teal, borderColor: colors.teal }, timelineDotActive: { borderColor: colors.tealBright }, timelineDotInner: { backgroundColor: colors.tealBright, borderRadius: 4, height: 8, width: 8 }, timelineCheck: { color: colors.white, fontSize: 12, fontWeight: '800' }, timelineLine: { backgroundColor: '#D5DDEA', height: 2, marginTop: 10, flex: 1 }, timelineLineComplete: { backgroundColor: colors.teal }, timelineLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 7, textAlign: 'center' }, timelineLabelActive: { color: colors.teal, fontWeight: '800' },
  detailCard: { gap: 14, padding: 18 }, factRow: { alignItems: 'center', flexDirection: 'row', gap: 12 }, factIcon: { alignItems: 'center', backgroundColor: colors.container, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, factIconText: { color: colors.teal, fontSize: 17 }, avatar: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, avatarText: { color: colors.white, fontSize: 12, fontWeight: '800' }, factCopy: { flex: 1, gap: 2 }, factLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, factValue: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.container, borderRadius: 16, flexDirection: 'row', gap: 12, padding: 16 }, infoIcon: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 12, height: 24, justifyContent: 'center', width: 24 }, infoIconText: { color: colors.white, fontSize: 15, fontWeight: '800' }, infoCopy: { flex: 1, gap: 3 }, infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, infoDetail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  cancelCard: { gap: 9, padding: 18 }, cancelTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, cancelDetail: { color: colors.muted, fontSize: 14, lineHeight: 20 }, cancelActions: { flexDirection: 'row', gap: 8, marginTop: 7 }, cancelAction: { flex: 1 },
});
