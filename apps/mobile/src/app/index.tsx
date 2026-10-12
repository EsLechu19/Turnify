import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { BrandMark, Button, Card, Icon, Pill, TextField } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { getGuestTicketState, type GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { createGuestTicketHomeChannelName, subscribeToGuestTicketHomeChanges } from '@/features/queue/public-ticket-home-realtime';
import { normalizeBusinessCode } from '@/features/queue/queue-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { activeGuestTicketRoute, isActiveGuestTicketStatus, publicShopRoute, workerSignInRoute } from '@/features/public/public-route-policy';
import { getSupabase } from '@/lib/supabase';

/**
 * Public launch route. Guest entry never depends on an authenticated session:
 * QR scan or business code for any customer.
 */
export default function PublicWelcomeScreen() {
  const [code, setCode] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ticketAccess, hasActiveTicketAccess, endGuestTicketSession } = useGuestFlow();
  const [activeTicket, setActiveTicket] = useState<GuestTicketState | null>(null);
  const [isTicketLoading, setIsTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const refreshActiveTicket = useCallback(async () => {
    if (!ticketAccess) return;
    setIsTicketLoading(true);
    setTicketError(null);
    try {
      const ticket = await getGuestTicketState(ticketAccess);
      if (isActiveGuestTicketStatus(ticket.status)) {
        setActiveTicket(ticket);
      } else {
        setActiveTicket(null);
        endGuestTicketSession();
      }
    } catch {
      setTicketError('No pudimos recuperar tu turno. Revisa tu conexión.');
    } finally {
      setIsTicketLoading(false);
    }
  }, [endGuestTicketSession, ticketAccess]);

  useEffect(() => {
    if (!ticketAccess) {
      setActiveTicket(null);
      return;
    }
    let mounted = true;
    const channel = subscribeToGuestTicketHomeChanges(
      getSupabase().channel(createGuestTicketHomeChannelName(ticketAccess.ticketId)),
      ticketAccess.ticketId,
      () => {
        if (mounted) void refreshActiveTicket();
      },
    );
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshActiveTicket();
    });
    void refreshActiveTicket();
    return () => {
      mounted = false;
      subscription.remove();
      void getSupabase().removeChannel(channel);
    };
  }, [refreshActiveTicket, ticketAccess]);

  function continueWithCode() {
    const normalized = normalizeBusinessCode(code);
    if (!normalized) {
      setError('Ingresa el código válido que muestra la barbería.');
      return;
    }
    setError(null);
    router.push({ params: { code: normalized }, pathname: publicShopRoute });
  }

  function toggleCodeDrawer() {
    setError(null);
    setIsDrawerOpen((current) => !current);
  }

  if (hasActiveTicketAccess) {
    const barberName = activeTicket?.assignedBarberName ?? activeTicket?.requestedBarberName;
    const statusPill = activeTicket?.status === 'llamado'
      ? { label: 'LLAMADO · TE TOCA', tone: 'gold' as const }
      : activeTicket?.status === 'notificado'
        ? { label: 'NOTIFICADO', tone: 'brand' as const }
        : activeTicket?.status === 'en_atencion'
          ? { label: 'EN ATENCIÓN', tone: 'success' as const }
          : { label: 'EN ESPERA', tone: 'neutral' as const };
    return (
      <View style={styles.centered}>
        <BrandMark size={44} />
        <Text style={[TypeScale.eyebrow, styles.eyebrow]}>TU TURNO SIGUE ACTIVO</Text>
        {isTicketLoading && !activeTicket ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Palette.brand} />
            <Text style={TypeScale.body}>Recuperando tu turno…</Text>
          </View>
        ) : null}
        {ticketError && !activeTicket ? (
          <>
            <Text style={[TypeScale.body, styles.mutedCenter]}>{ticketError}</Text>
            <Button fullWidth label="Reintentar" onPress={() => void refreshActiveTicket()} variant="secondary" />
          </>
        ) : null}
        {activeTicket ? (
          <>
            <Text style={TypeScale.display}>Turno {activeTicket.visibleCode}</Text>
            <Pill label={statusPill.label} tone={statusPill.tone} />
            <Card tone={activeTicket.status === 'llamado' ? 'gold' : 'brand'} padding="lg" style={styles.activeMetrics}>
              <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>
                {activeTicket.status === 'llamado'
                  ? 'Te están llamando ahora: acércate al personal'
                  : activeTicket.status === 'en_atencion'
                    ? 'Te están atendiendo'
                    : 'Tu lugar en la fila está reservado'}
              </Text>
              <Text style={[TypeScale.title, { color: Palette.brandDeep }]}>
                {activeTicket.peopleAhead} delante · {activeTicket.waitMinutes} min
              </Text>
              {activeTicket.serviceName || barberName ? (
                <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
                  {[activeTicket.serviceName, barberName].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </Card>
            <Button
              fullWidth
              iconRight="arrow-right"
              label="Ver mi turno"
              onPress={() => router.push(activeGuestTicketRoute(activeTicket.status))}
              size="lg"
            />
          </>
        ) : null}
        <Text style={[TypeScale.caption, styles.mutedCenter]}>
          Cuando este turno termine, podrás escanear o ingresar otro código.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.brand}>
        <BrandMark size={44} />
        <Text style={[TypeScale.title, { color: Palette.ink }]}>turnify</Text>
      </View>

      <View style={styles.narrative}>
        <Text style={[TypeScale.display, styles.narrativeTitle]}>Tu turno, sin esperar de más</Text>
        <Text style={[TypeScale.body, styles.narrativeDetail]}>
          Apunta al QR de la entrada para sumarte a la fila al instante.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          fullWidth
          icon="qr"
          label="Escanear código QR"
          onPress={() => router.push('/(public)/scan')}
          size="lg"
        />
        <Button
          label="¿Sin cámara? Ingresar código"
          onPress={toggleCodeDrawer}
          variant="link"
        />
        {isDrawerOpen ? (
          <View style={styles.drawer}>
            <Text style={[TypeScale.h3, styles.drawerTitle]}>Busca tu barbería</Text>
            <Text style={[TypeScale.body, styles.drawerHelper]}>Escribe el código del mostrador. Si no lo encuentra, revisa mayúsculas y guiones.</Text>
            <TextField
              autoCapitalize="characters"
              autoCorrect={false}
              error={error}
              label="CÓDIGO DE LA BARBERÍA"
              onChangeText={setCode}
              onSubmitEditing={continueWithCode}
              placeholder="Ej.: TURNO-123"
              returnKeyType="go"
              value={code}
            />
            <Button fullWidth iconRight="arrow-right" label="Ver barbería" onPress={continueWithCode} />
          </View>
        ) : null}
      </View>

      <Card padding="lg" style={styles.stepsCard}>
        <Text style={[TypeScale.headline, { color: Palette.ink }]}>¿Cómo funciona?</Text>
        <View style={styles.step}>
          <Icon color={Palette.brand} name="qr" size={20} />
          <View style={styles.stepCopy}>
            <Text style={[TypeScale.label, { color: Palette.ink }]}>1 · Escanea el QR</Text>
            <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Está en la entrada de la barbería.</Text>
          </View>
        </View>
        <View style={styles.step}>
          <Icon color={Palette.brand} name="ticket" size={20} />
          <View style={styles.stepCopy}>
            <Text style={[TypeScale.label, { color: Palette.ink }]}>2 · Elige tu servicio</Text>
            <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Corte, barba o lo que necesites.</Text>
          </View>
        </View>
        <View style={styles.step}>
          <Icon color={Palette.brand} name="bell" size={20} />
          <View style={styles.stepCopy}>
            <Text style={[TypeScale.label, { color: Palette.ink }]}>3 · Sigue tu turno</Text>
            <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Posición en vivo · deja la app abierta al llamarte.</Text>
          </View>
        </View>
      </Card>

      <View style={styles.workerFooter}>
        <Button href={workerSignInRoute} label="Soy trabajador" variant="link" />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    backgroundColor: Palette.canvas,
    flex: 1,
    gap: space(4),
    maxWidth: 480,
    paddingHorizontal: space(5),
    paddingVertical: space(5),
    width: '100%',
  },
  centered: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.canvas,
    flex: 1,
    gap: space(3),
    justifyContent: 'center',
    maxWidth: 480,
    paddingHorizontal: space(5),
    width: '100%',
  },
  eyebrow: { color: Palette.brandDeep },
  brand: { alignItems: 'center', gap: space(2) },
  narrative: { alignItems: 'center', gap: space(2) },
  narrativeTitle: { color: Palette.ink, textAlign: 'center' },
  narrativeDetail: { color: Palette.inkMuted, textAlign: 'center' },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  actions: { gap: space(2) },
  drawer: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, gap: space(2), padding: space(4) },
  drawerTitle: { color: Palette.ink },
  drawerHelper: { color: Palette.inkMuted },
  stepsCard: { gap: space(3) },
  step: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  stepCopy: { flex: 1, gap: 2 },
  workerFooter: { alignItems: 'center', gap: space(1), paddingBottom: space(2) },
  activeMetrics: { alignItems: 'center', gap: space(1), width: '100%' },
  mutedCenter: { color: Palette.inkMuted, textAlign: 'center' },
});
