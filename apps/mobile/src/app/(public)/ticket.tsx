import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Icon, IconButton, Metric, Pill, Sheet } from '@/components/ui';
import { CalledGuestTicket } from '@/components/customer/called-guest-ticket';
import { CompletedGuestTicket } from '@/components/customer/completed-guest-ticket';
import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { canUseGuestTicket, isTerminalGuestTicketStatus } from '@/features/public/public-route-policy';
import {
  cancelGuestTicket,
  getGuestTicketState,
  respondToCalledGuestTicket,
  type GuestTicketState,
} from '@/features/queue/public-guest-ticket-api';
import { translateQueueError } from '@/features/queue/queue-api';
import { canCancelTicket, formatEstimatedWait, presentTicketStatus, ticketPosition } from '@/features/queue/ticket-presentation';
import { useEstimatedWaitSeconds } from '@/features/queue/use-estimated-wait';
import { getSupabase } from '@/lib/supabase';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function TicketHeader({ isLoading, onBack, onRefresh }: { isLoading: boolean; onBack: () => void; onRefresh: () => void }) {
  return (
    <View style={styles.header}>
      <IconButton accessibilityLabel="Volver al inicio" name="arrow-left" onPress={onBack} tone="ghost" />
      <View style={styles.headerTitle}>
        <Text style={[TypeScale.eyebrow, { color: Palette.inkFaint }]}>Turnify</Text>
        <Text style={[TypeScale.headline, { color: Palette.ink }]}>Turno activo</Text>
      </View>
      <IconButton
        accessibilityLabel="Actualizar turno"
        disabled={isLoading}
        name="refresh"
        onPress={onRefresh}
        tone="ghost"
      />
    </View>
  );
}

function QueueTimeline({ peopleAhead, status }: { peopleAhead: number; status: 'en_espera' | 'notificado' }) {
  const notified = status === 'notificado';

  return (
    <View
      accessibilityLabel={notified ? 'Progreso: turno notificado y aún en espera' : 'Progreso: turno en espera'}
      style={styles.timeline}
    >
      <View style={styles.timelineItem}>
        <View style={[styles.timelineDot, styles.timelineDotComplete]}>
          <Icon color="#FFFFFF" name="check" size={12} strokeWidth={3} />
        </View>
        <View style={styles.timelineCopy}>
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Turno solicitado</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Tu código ya está registrado.</Text>
        </View>
      </View>

      <View style={[styles.timelineLine, styles.timelineLineComplete]} />

      <View style={styles.timelineItem}>
        <View style={[styles.timelineDot, styles.timelineDotActive]}>
          <View style={styles.timelineDotInner} />
        </View>
        <View style={styles.timelineCopy}>
          <Text style={[TypeScale.bodyStrong, { color: Palette.brand }]}>{notified ? 'Notificado' : 'En espera'}</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Posición actual: {ticketPosition(peopleAhead)}.</Text>
        </View>
      </View>

      <View style={styles.timelineLine} />

      <View style={styles.timelineItem}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineCopy}>
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Llamado en el local</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Mira la pantalla o escucha tu código.</Text>
        </View>
      </View>
    </View>
  );
}

export default function GuestTicketScreen() {
  const { ticketAccess, endGuestTicketSession } = useGuestFlow();
  const [ticket, setTicket] = useState<GuestTicketState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const estimatedWaitSeconds = useEstimatedWaitSeconds(
    ticket?.status === 'en_espera' || ticket?.status === 'notificado' ? ticket.waitMinutes : null,
  );

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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let channel: ReturnType<ReturnType<typeof getSupabase>['channel']> | undefined;

      async function start() {
        const foundTicket = await refresh();
        if (!isActive || !foundTicket || !ticketAccess) return;
        channel = getSupabase()
          .channel(`guest-ticket:${ticketAccess.ticketId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketAccess.ticketId}` },
            () => {
              void refresh();
            },
          )
          .subscribe((subscriptionStatus) => {
            if (subscriptionStatus === 'SUBSCRIBED') void refresh();
          });
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
    }, [refresh, ticketAccess]),
  );

  const status = ticket ? presentTicketStatus(ticket.status) : null;
  const canCancel = ticket ? canCancelTicket(ticket.status) : false;
  const barberName = ticket?.assignedBarberName ?? ticket?.requestedBarberName ?? null;
  const destructive = status?.tone === 'destructive';

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
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <TicketHeader isLoading={isLoading} onBack={returnHome} onRefresh={() => void refresh()} />
        <CustomerPage>
          <CalledGuestTicket
            error={error}
            isResponding={isResponding}
            onRespond={(response) => void respond(response)}
            onRetry={() => void refresh()}
            ticket={ticket}
          />
        </CustomerPage>
      </SafeAreaView>
    );
  }

  if (ticket && status?.isCompletedTurn) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <CustomerPage>
          <CompletedGuestTicket error={error} onRetry={() => void refresh()} onReturn={returnHome} ticket={ticket} />
        </CustomerPage>
      </SafeAreaView>
    );
  }

  if (!canUseGuestTicket(ticketAccess)) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <CustomerPage>
          <CustomerState
            action={returnHome}
            detail="Por privacidad, necesitas conservar el acceso del turno en este dispositivo."
            label="No hay un turno disponible en esta sesión."
          />
        </CustomerPage>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <TicketHeader isLoading={isLoading} onBack={returnHome} onRefresh={() => void refresh()} />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {isLoading && !ticket ? <CustomerState isLoading label="Actualizando tu turno…" /> : null}
        {error ? <CustomerState action={() => void refresh()} label={error} /> : null}
        {ticket && status ? (
          <>
            <View style={styles.contextRow}>
              <View style={styles.businessIdentity}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>T</Text>
                </View>
                <View>
                  <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Turnify</Text>
                  <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Tu turno en la barbería</Text>
                </View>
              </View>
              <Pill label={status.label} tone={destructive ? 'danger' : 'brand'} />
            </View>

            {isLoading ? <Text style={styles.refreshing}>Actualizando…</Text> : null}

            <Card elevated padding="lg">
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>Código de turno</Text>
                  <Text
                    accessibilityLabel={`Código de turno ${ticket.visibleCode}`}
                    style={[TypeScale.metric, { color: Palette.ink }]}
                  >
                    {ticket.visibleCode}
                  </Text>
                </View>
                <View style={styles.heroIcon}>
                  <Icon color={Palette.brand} name="ticket" size={24} />
                </View>
              </View>
              <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>{status.message}</Text>

              {ticket.status === 'en_espera' || ticket.status === 'notificado' ? (
                <View style={styles.heroMetrics}>
                  <Metric
                    label={ticket.peopleAhead === 1 ? 'persona delante' : 'personas delante'}
                    size="sm"
                    tone="brand"
                    value={String(ticket.peopleAhead)}
                  />
                  <View style={styles.metricDivider} />
                  <Metric
                    label="espera estimada"
                    size="sm"
                    tone="gold"
                    value={estimatedWaitSeconds > 0 ? `~${formatEstimatedWait(estimatedWaitSeconds)}` : 'Próximo'}
                  />
                </View>
              ) : null}
            </Card>

            {ticket.status === 'en_espera' || ticket.status === 'notificado' ? (
              <Card padding="md">
                <Text style={[TypeScale.h3, { color: Palette.ink }]}>Progreso de tu turno</Text>
                <QueueTimeline peopleAhead={ticket.peopleAhead} status={ticket.status} />
              </Card>
            ) : null}

            {ticket.serviceName || barberName ? (
              <Card padding="md">
                <Text style={[TypeScale.h3, { color: Palette.ink }]}>Detalles del servicio</Text>
                {ticket.serviceName ? (
                  <View style={styles.factRow}>
                    <View style={styles.factIcon}>
                      <Icon color={Palette.brand} name="ticket" size={19} />
                    </View>
                    <View style={styles.factCopy}>
                      <Text style={styles.factLabel}>Servicio</Text>
                      <Text style={[TypeScale.body, { color: Palette.ink }]}>{ticket.serviceName}</Text>
                    </View>
                  </View>
                ) : null}
                {barberName ? (
                  <View style={styles.factRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(barberName)}</Text>
                    </View>
                    <View style={styles.factCopy}>
                      <Text style={styles.factLabel}>
                        {ticket.assignedBarberName ? 'Barbero asignado' : 'Barbero solicitado'}
                      </Text>
                      <Text style={[TypeScale.body, { color: Palette.ink }]}>{barberName}</Text>
                    </View>
                  </View>
                ) : null}
              </Card>
            ) : null}

            {status.showsQueueProgress ? (
              <Card padding="md" tone="brand">
                <View style={styles.infoIcon}>
                  <Icon color={Palette.brand} name="info" size={20} />
                </View>
                <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Atención en el local</Text>
                <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
                  Conserva el código {ticket.visibleCode}. Lo verás en pantalla o lo escucharás cuando sea tu turno.
                </Text>
              </Card>
            ) : null}

            {canCancel ? (
              <Button
                accessibilityLabel="Cancelar turno"
                fullWidth
                label="Cancelar turno"
                onPress={() => setIsConfirmingCancel(true)}
                size="lg"
                variant="secondary"
              />
            ) : null}
            <Button label="Volver al inicio" onPress={returnHome} variant="ghost" />
          </>
        ) : null}
      </ScrollView>

      <Sheet
        confirmLabel="Confirmar cancelación"
        confirmVariant="danger"
        description="Perderás tu lugar actual en la fila. Esta acción no se puede deshacer."
        dismissible={!isCancelling}
        onClose={() => setIsConfirmingCancel(false)}
        onConfirm={() => void cancel()}
        title="¿Cancelar tu turno?"
        visible={isConfirmingCancel}
      >
        {isCancelling ? <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Cancelando…</Text> : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: Palette.canvas, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    borderBottomColor: Palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: space(4),
  },
  headerTitle: { alignItems: 'center', gap: 1 },
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, padding: space(4), paddingBottom: space(7), width: '100%' },

  contextRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  businessIdentity: { alignItems: 'center', flexDirection: 'row', gap: space(2.5) },
  brandMark: {
    alignItems: 'center',
    backgroundColor: Palette.brand,
    borderRadius: Radius.small,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  brandMarkText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  refreshing: { color: Palette.inkMuted, marginTop: -space(3) },

  heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  heroCopy: { flex: 1, gap: space(1) },
  heroEyebrow: { color: Palette.inkFaint, letterSpacing: 1 },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.medium,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroMetrics: { backgroundColor: Palette.brandSoftest, borderRadius: Radius.medium, flexDirection: 'row', paddingVertical: space(3) },
  metricDivider: { backgroundColor: Palette.border, width: 1 },

  timeline: { paddingTop: space(1) },
  timelineItem: { alignItems: 'flex-start', flexDirection: 'row', gap: space(3) },
  timelineDot: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.borderStrong,
    borderRadius: Radius.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  timelineDotComplete: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  timelineDotActive: { borderColor: Palette.brandBright },
  timelineDotInner: { backgroundColor: Palette.brandBright, borderRadius: 3, height: 7, width: 7 },
  timelineLine: { backgroundColor: Palette.border, height: 24, marginLeft: 9, width: 2 },
  timelineLineComplete: { backgroundColor: Palette.brand },
  timelineCopy: { flex: 1, paddingBottom: 1 },

  factRow: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  factIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: Palette.brand,
    borderRadius: Radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  factCopy: { flex: 1, gap: 2 },
  factLabel: { color: Palette.inkFaint, letterSpacing: 0.7 },

  infoIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
