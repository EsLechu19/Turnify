import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { BrandMark, Button, Card, Icon, Pill, TextField } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { getGuestTicketState, type GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { createGuestTicketHomeChannelName, subscribeToGuestTicketHomeChanges } from '@/features/queue/public-ticket-home-realtime';
import { normalizeBusinessCode } from '@/features/queue/queue-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { activeGuestTicketRoute, isActiveGuestTicketStatus, publicShopRoute } from '@/features/public/public-route-policy';
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

  const refreshActiveTicket = useCallback(async () => {
    if (!ticketAccess) return;
    try {
      const ticket = await getGuestTicketState(ticketAccess);
      if (isActiveGuestTicketStatus(ticket.status)) {
        setActiveTicket(ticket);
      } else {
        setActiveTicket(null);
        endGuestTicketSession();
      }
    } catch {
      // Capability failures stay private and never enter route or UI state.
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
        <Text style={TypeScale.display}>{activeTicket ? `Turno ${activeTicket.visibleCode}` : 'Recuperando tu turno…'}</Text>
        {activeTicket ? <Pill label={statusPill.label} tone={statusPill.tone} /> : null}
        {activeTicket ? (
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
        ) : null}
        <Button
          fullWidth
          iconRight="arrow-right"
          label="Ver mi turno"
          onPress={() => router.push(activeGuestTicketRoute(activeTicket?.status ?? 'en_espera'))}
          size="lg"
        />
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
        <View style={styles.pill}>
          <Icon color={Palette.brand} name="storefront" size={16} />
          <Text style={[TypeScale.eyebrow, { color: Palette.brandDeep }]}>BARBERÍAS</Text>
        </View>
        <Text style={[TypeScale.display, styles.narrativeTitle]}>Tu turno, sin esperar de más</Text>
        <Text style={[TypeScale.body, styles.narrativeDetail]}>
          Escanea el código QR en la entrada de la barbería o ingresa su código para sumarte a la fila al instante.
        </Text>
      </View>

      <Card tone="soft" padding="lg" style={styles.scannerCard}>
        <View style={styles.reticle}>
          <View style={[styles.reticleCorner, styles.topLeft]} />
          <View style={[styles.reticleCorner, styles.topRight]} />
          <View style={[styles.reticleCorner, styles.bottomLeft]} />
          <View style={[styles.reticleCorner, styles.bottomRight]} />
          <View style={styles.scanBadge}>
            <Icon color={Palette.brand} name="qr" size={42} />
          </View>
        </View>
        <Text style={[TypeScale.label, { color: Palette.inkMuted }]}>Listo para enfocar</Text>
      </Card>

      <View style={styles.actions}>
        <Button
          fullWidth
          icon="qr"
          label="Escanear código QR"
          onPress={() => router.push('/(public)/scan')}
          size="lg"
        />
        <Button
          fullWidth
          icon="code"
          label="Ingresar código del negocio"
          onPress={toggleCodeDrawer}
          size="lg"
          variant="secondary"
        />
        {isDrawerOpen ? (
          <View style={styles.drawer}>
            <TextField
              autoCapitalize="characters"
              autoCorrect={false}
              error={error}
              hint="Consulta el código en el mostrador o recepción."
              label="CÓDIGO DE LA BARBERÍA"
              onChangeText={setCode}
              onSubmitEditing={continueWithCode}
              placeholder="Ej.: TURNO-123"
              returnKeyType="go"
              value={code}
            />
            <Button fullWidth iconRight="arrow-right" label="Continuar" onPress={continueWithCode} />
          </View>
        ) : null}
      </View>

      <View style={styles.trustRow}>
        <Card style={styles.trustCard} padding="sm">
          <Icon color={Palette.brand} name="clock" size={20} />
          <Text style={[TypeScale.label, { color: Palette.ink }]}>Tiempo real</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Sigue tu posición</Text>
        </Card>
        <Card style={styles.trustCard} padding="sm">
          <Icon color={Palette.brand} name="bell" size={20} />
          <Text style={[TypeScale.label, { color: Palette.ink }]}>Aviso de llamado</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Te avisamos al llamarte</Text>
        </Card>
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
  pill: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: space(1.5),
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  scannerCard: { alignItems: 'center', gap: space(2) },
  reticle: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.large,
    height: 168,
    justifyContent: 'center',
    position: 'relative',
    width: 168,
  },
  reticleCorner: { borderColor: Palette.brand, height: 28, position: 'absolute', width: 28 },
  topLeft: { borderLeftWidth: 3, borderTopWidth: 3, left: 10, top: 10 },
  topRight: { borderRightWidth: 3, borderTopWidth: 3, right: 10, top: 10 },
  bottomLeft: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 10, left: 10 },
  bottomRight: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 10, right: 10 },
  scanBadge: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoftest,
    borderRadius: Radius.pill,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  actions: { gap: space(3) },
  drawer: { gap: space(3) },
  trustRow: { flexDirection: 'row', gap: space(2) },
  trustCard: { alignItems: 'flex-start', flex: 1, gap: space(1) },
  activeMetrics: { alignItems: 'center', gap: space(1), width: '100%' },
  mutedCenter: { color: Palette.inkMuted, textAlign: 'center' },
});
