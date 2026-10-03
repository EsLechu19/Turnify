import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CalledGuestTicket } from '@/components/customer/called-guest-ticket';
import { CompletedGuestTicket } from '@/components/customer/completed-guest-ticket';
import { CustomerButton, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { canUseGuestTicket, isTerminalGuestTicketStatus } from '@/features/public/public-route-policy';
import { cancelGuestTicket, getGuestTicketState, respondToCalledGuestTicket, type GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { translateQueueError } from '@/features/queue/queue-api';
import { canCancelTicket, presentTicketStatus, ticketPosition } from '@/features/queue/ticket-presentation';
import { getSupabase } from '@/lib/supabase';

const colors = {
  canvas: '#F7F9FF',
  low: '#EDF4FF',
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

function TicketIcon({ name, color = colors.teal, size = 20 }: { name: 'arrow-left' | 'refresh' | 'ticket' | 'info'; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };
  return <Svg accessibilityElementsHidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
    {name === 'arrow-left' && <Path {...common} d="m15 18-6-6 6-6M9 12h11" />}
    {name === 'refresh' && <><Path {...common} d="M20 11a8 8 0 0 0-14.8-4L3 10M4 13a8 8 0 0 0 14.8 4l2.2-3" /><Path {...common} d="M3 5v5h5M21 19v-5h-5" /></>}
    {name === 'ticket' && <><Path {...common} d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z" /><Path {...common} d="M12 8v8" /></>}
    {name === 'info' && <><Path {...common} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 10v6M12 7h.01" /></>}
  </Svg>;
}

function TicketHeader({ isLoading, onBack, onRefresh }: { isLoading: boolean; onBack: () => void; onRefresh: () => void }) {
  return <View style={styles.header}>
    <Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" hitSlop={8} onPress={onBack} style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}><TicketIcon name="arrow-left" /></Pressable>
    <View style={styles.headerTitle}><Text style={styles.headerEyebrow}>TURNIFY</Text><Text style={styles.headerText}>Turno Activo</Text></View>
    <Pressable accessibilityLabel="Actualizar turno" accessibilityRole="button" disabled={isLoading} hitSlop={8} onPress={onRefresh} style={({ pressed }) => [styles.headerAction, isLoading && styles.disabled, pressed && styles.pressed]}><TicketIcon name="refresh" /></Pressable>
  </View>;
}

function QueueTimeline({ peopleAhead, status }: { peopleAhead: number; status: 'en_espera' | 'notificado' }) {
  const notified = status === 'notificado';
  return <View accessibilityLabel={notified ? 'Progreso: turno notificado y aún en espera' : 'Progreso: turno en espera'} style={styles.timeline}>
    <View style={styles.timelineItem}><View style={[styles.timelineDot, styles.timelineDotComplete]}><Text style={styles.timelineCheck}>✓</Text></View><View style={styles.timelineCopy}><Text style={styles.timelineLabel}>Turno solicitado</Text><Text style={styles.timelineDetail}>Tu código ya está registrado.</Text></View></View>
    <View style={[styles.timelineLine, styles.timelineLineComplete]} />
    <View style={styles.timelineItem}><View style={[styles.timelineDot, styles.timelineDotActive]}><View style={styles.timelineDotInner} /></View><View style={styles.timelineCopy}><Text style={[styles.timelineLabel, styles.timelineLabelActive]}>{notified ? 'Notificado' : 'En espera'}</Text><Text style={styles.timelineDetail}>Posición actual: {ticketPosition(peopleAhead)}.</Text></View></View>
    <View style={styles.timelineLine} />
    <View style={styles.timelineItem}><View style={styles.timelineDot} /><View style={styles.timelineCopy}><Text style={styles.timelineLabel}>Llamado en el local</Text><Text style={styles.timelineDetail}>Mira la pantalla o escucha tu código.</Text></View></View>
  </View>;
}

export default function GuestTicketScreen() {
  const { ticketAccess, endGuestTicketSession } = useGuestFlow();
  const [ticket, setTicket] = useState<GuestTicketState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const returnHome = useCallback(() => {
    router.replace('/');
  }, []);

  const refresh = useCallback(async () => {
    if (!ticketAccess) return false;
    setIsLoading(true);
    try {
      const nextTicket = await getGuestTicketState(ticketAccess);
      setTicket(nextTicket);
      if (isTerminalGuestTicketStatus(nextTicket.status)) endGuestTicketSession();
      setError(null);
      return true;
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [endGuestTicketSession, ticketAccess]);

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

  async function respond(response: NonNullable<GuestTicketState['customerResponse']>) {
    if (!ticketAccess || ticket?.status !== 'llamado') return;
    setIsResponding(true);
    try {
      await respondToCalledGuestTicket(ticketAccess, response);
      await refresh();
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsResponding(false);
    }
  }

  if (ticket && status?.isActiveTurn) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage><CalledGuestTicket ticket={ticket} error={error} isResponding={isResponding} onRespond={(response) => void respond(response)} onRetry={() => void refresh()} /></CustomerPage></SafeAreaView>;
  }

  if (ticket && status?.isCompletedTurn) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage><CompletedGuestTicket ticket={ticket} error={error} onRetry={() => void refresh()} onReturn={returnHome} /></CustomerPage></SafeAreaView>;
  }

  if (!canUseGuestTicket(ticketAccess)) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><CustomerPage><CustomerState label="No hay un turno disponible en esta sesión." detail="Por privacidad, necesitas conservar el acceso del turno en este dispositivo." action={returnHome} /></CustomerPage></SafeAreaView>;
  }

  return <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
    <TicketHeader isLoading={isLoading} onBack={returnHome} onRefresh={() => void refresh()} />
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {isLoading && !ticket && <CustomerState label="Actualizando tu turno…" isLoading />}
      {error && <CustomerState label={error} action={() => void refresh()} />}
      {ticket && status && <>
        <View style={styles.contextRow}><View style={styles.businessIdentity}><View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View><View><Text style={styles.businessName}>Turnify</Text><Text style={styles.businessDetail}>Tu turno en la barbería</Text></View></View><View style={[styles.statusChip, { backgroundColor: status.tone === 'destructive' ? '#FDECEC' : colors.low }]}><View style={[styles.statusDot, { backgroundColor: status.tone === 'destructive' ? colors.danger : colors.tealBright }]} /><Text style={[styles.statusText, { color: status.tone === 'destructive' ? colors.danger : colors.teal }]}>{status.label.toUpperCase()}</Text></View></View>
        {isLoading && <Text style={styles.refreshing}>Actualizando…</Text>}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}><View><Text style={styles.heroEyebrow}>CÓDIGO DE TURNO</Text><Text accessibilityLabel={`Código de turno ${ticket.visibleCode}`} style={styles.code}>{ticket.visibleCode}</Text></View><View style={styles.heroPill}><Text style={styles.heroPillText}>{status.label}</Text></View></View>
          <Text style={styles.heroMessage}>{status.message}</Text>
          {(ticket.status === 'en_espera' || ticket.status === 'notificado') && <View style={styles.heroMetrics}><View style={styles.heroMetric}><Text style={styles.metricValue}>{ticket.peopleAhead}</Text><Text style={styles.metricLabel}>{ticket.peopleAhead === 1 ? 'persona delante' : 'personas delante'}</Text></View><View style={styles.metricDivider} /><View style={styles.heroMetric}><Text style={styles.metricValue}>{ticket.waitMinutes}<Text style={styles.metricUnit}> min</Text></Text><Text style={styles.metricLabel}>espera estimada</Text></View></View>}
        </View>

        {(ticket.status === 'en_espera' || ticket.status === 'notificado') && <View style={styles.card}><Text style={styles.cardTitle}>Progreso de tu turno</Text><QueueTimeline peopleAhead={ticket.peopleAhead} status={ticket.status} /></View>}

        {(ticket.serviceName || barberName) && <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles del servicio</Text>
          {ticket.serviceName && <View style={styles.factRow}><View style={styles.factIcon}><TicketIcon name="ticket" size={19} /></View><View style={styles.factCopy}><Text style={styles.factLabel}>SERVICIO</Text><Text style={styles.factValue}>{ticket.serviceName}</Text></View></View>}
          {barberName && <View style={styles.factRow}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(barberName)}</Text></View><View style={styles.factCopy}><Text style={styles.factLabel}>{ticket.assignedBarberName ? 'BARBERO ASIGNADO' : 'BARBERO SOLICITADO'}</Text><Text style={styles.factValue}>{barberName}</Text></View></View>}
        </View>}

        {status.showsQueueProgress && <View style={styles.infoCard}><View style={styles.infoIcon}><TicketIcon color={colors.teal} name="info" size={20} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>Atención en el local</Text><Text style={styles.infoDetail}>Conserva el código {ticket.visibleCode}. Lo verás en pantalla o lo escucharás cuando sea tu turno.</Text></View></View>}

        {canCancel && <Pressable accessibilityLabel="Cancelar turno" accessibilityRole="button" onPress={() => setIsConfirmingCancel(true)} style={({ pressed }) => [styles.cancelTrigger, pressed && styles.pressed]}><Text style={styles.cancelTriggerText}>Cancelar turno</Text></Pressable>}
        <Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" onPress={returnHome} style={({ pressed }) => [styles.homeLink, pressed && styles.pressed]}><Text style={styles.homeLinkText}>Volver al inicio</Text></Pressable>
      </>}
    </ScrollView>
    <Modal animationType="slide" onRequestClose={() => setIsConfirmingCancel(false)} transparent visible={isConfirmingCancel}>
      <View style={styles.modalBackdrop}><Pressable accessibilityLabel="Cerrar confirmación de cancelación" onPress={() => !isCancelling && setIsConfirmingCancel(false)} style={styles.modalDismiss} /><View accessibilityViewIsModal style={styles.bottomSheet}><View style={styles.sheetHandle} /><Text style={styles.cancelTitle}>¿Cancelar tu turno?</Text><Text style={styles.cancelDetail}>Perderás tu lugar actual en la fila. Esta acción no se puede deshacer.</Text><CustomerButton label="Confirmar cancelación" loading={isCancelling} variant="destructive" onPress={() => void cancel()} /><Pressable accessibilityLabel="Mantener mi turno" accessibilityRole="button" disabled={isCancelling} onPress={() => setIsConfirmingCancel(false)} style={({ pressed }) => [styles.sheetSecondary, pressed && styles.pressed]}><Text style={styles.sheetSecondaryText}>Mantener mi turno</Text></Pressable></View></View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  header: { alignItems: 'center', backgroundColor: 'rgba(247,249,255,0.94)', borderBottomColor: '#E3EAF5', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 58, paddingHorizontal: 16 },
  headerAction: { alignItems: 'center', borderRadius: 8, height: 36, justifyContent: 'center', width: 36 }, headerTitle: { alignItems: 'center' }, headerEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, headerText: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 1 },
  page: { gap: 16, padding: 16, paddingBottom: 28 }, contextRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, businessIdentity: { alignItems: 'center', flexDirection: 'row', gap: 9 }, brandMark: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 8, height: 32, justifyContent: 'center', width: 32 }, brandMarkText: { color: colors.white, fontSize: 15, fontWeight: '800' }, businessName: { color: colors.ink, fontSize: 14, fontWeight: '800' }, businessDetail: { color: colors.muted, fontSize: 12, marginTop: 1 },
  statusChip: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 7, paddingHorizontal: 11, paddingVertical: 7 }, statusDot: { borderRadius: 4, height: 8, width: 8 }, statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }, refreshing: { color: colors.muted, fontSize: 12, marginTop: -9 },
  heroCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 12, padding: 18 }, heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }, heroEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, code: { color: colors.ink, fontSize: 46, fontWeight: '800', letterSpacing: -1.6, lineHeight: 53 }, heroPill: { backgroundColor: colors.low, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, heroPillText: { color: colors.teal, fontSize: 11, fontWeight: '800' }, heroMessage: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  heroMetrics: { backgroundColor: colors.low, borderRadius: 8, flexDirection: 'row', paddingVertical: 12 }, heroMetric: { flex: 1, paddingHorizontal: 14 }, metricDivider: { backgroundColor: '#D7E4F3', width: 1 }, metricValue: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.8 }, metricUnit: { color: colors.teal, fontSize: 15, letterSpacing: 0 }, metricLabel: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 16, padding: 16 }, cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, timeline: { paddingTop: 2 }, timelineItem: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 }, timelineDot: { alignItems: 'center', backgroundColor: colors.white, borderColor: '#BFC9D9', borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', width: 20 }, timelineDotComplete: { backgroundColor: colors.teal, borderColor: colors.teal }, timelineDotActive: { borderColor: colors.tealBright }, timelineDotInner: { backgroundColor: colors.tealBright, borderRadius: 3, height: 7, width: 7 }, timelineCheck: { color: colors.white, fontSize: 11, fontWeight: '800' }, timelineLine: { backgroundColor: '#D5DDEA', height: 24, marginLeft: 9, width: 2 }, timelineLineComplete: { backgroundColor: colors.teal }, timelineCopy: { flex: 1, paddingBottom: 1 }, timelineLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' }, timelineLabelActive: { color: colors.teal, fontWeight: '800' }, timelineDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  factRow: { alignItems: 'center', flexDirection: 'row', gap: 12 }, factIcon: { alignItems: 'center', backgroundColor: colors.low, borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, avatar: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, avatarText: { color: colors.white, fontSize: 12, fontWeight: '800' }, factCopy: { flex: 1, gap: 2 }, factLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, factValue: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.low, borderRadius: 12, flexDirection: 'row', gap: 12, padding: 16 }, infoIcon: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 8, height: 36, justifyContent: 'center', width: 36 }, infoCopy: { flex: 1, gap: 3 }, infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, infoDetail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  cancelTrigger: { alignItems: 'center', borderColor: '#E7C0C0', borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 48 }, cancelTriggerText: { color: colors.danger, fontSize: 14, fontWeight: '800' }, homeLink: { alignItems: 'center', justifyContent: 'center', minHeight: 38 }, homeLinkText: { color: colors.teal, fontSize: 14, fontWeight: '700' },
  modalBackdrop: { backgroundColor: 'rgba(17,29,39,0.35)', flex: 1, justifyContent: 'flex-end' }, modalDismiss: { flex: 1 }, bottomSheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 14, padding: 20, paddingBottom: 28 }, sheetHandle: { alignSelf: 'center', backgroundColor: '#CAD4E3', borderRadius: 2, height: 4, marginBottom: 2, width: 40 }, cancelTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, cancelDetail: { color: colors.muted, fontSize: 14, lineHeight: 20 }, sheetSecondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 }, sheetSecondaryText: { color: colors.teal, fontSize: 14, fontWeight: '800' }, pressed: { opacity: 0.68 }, disabled: { opacity: 0.45 },
});
