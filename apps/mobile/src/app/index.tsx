import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, Button, Card, Icon, Pill, TextField } from '@/components/ui';
import { Palette, Radius, Shadows, space, TypeScale } from '@/constants/theme';
import { normalizeBusinessCode } from '@/features/queue/queue-api';
import { formatEstimatedWait } from '@/features/queue/ticket-presentation';
import { useEstimatedWaitSeconds } from '@/features/queue/use-estimated-wait';
import { getGuestTicketState, type GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { createGuestTicketHomeChannelName, subscribeToGuestTicketHomeChanges } from '@/features/queue/public-ticket-home-realtime';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { activeGuestTicketRoute, isActiveGuestTicketStatus, publicShopRoute, workerSignInRoute } from '@/features/public/public-route-policy';
import { getSupabase } from '@/lib/supabase';

function ValueCard({ icon, title, detail }: { icon: 'ticket' | 'shield'; title: string; detail: string }) {
  return (
    <Card padding="sm" style={styles.valueCard}>
      <View style={styles.valueIcon}>
        <Icon color={Palette.brand} name={icon} size={18} />
      </View>
      <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>{title}</Text>
      <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>{detail}</Text>
    </Card>
  );
}

/** Public launch route. Guest access never depends on an authenticated session. */
export default function PublicWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [showCodeDrawer, setShowCodeDrawer] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ticketAccess, hasActiveTicketAccess, endGuestTicketSession } = useGuestFlow();
  const [activeTicket, setActiveTicket] = useState<GuestTicketState | null>(null);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const estimatedWaitSeconds = useEstimatedWaitSeconds(
    activeTicket?.status === 'en_espera' || activeTicket?.status === 'notificado' ? activeTicket.waitMinutes : null,
  );

  const refreshActiveTicket = useCallback(async () => {
    if (!ticketAccess) return;
    try {
      const ticket = await getGuestTicketState(ticketAccess);
      if (isActiveGuestTicketStatus(ticket.status)) setActiveTicket(ticket);
      else {
        setActiveTicket(null);
        endGuestTicketSession();
      }
    } catch {
      // Capability failures remain private and never enter route or UI state.
    }
  }, [endGuestTicketSession, ticketAccess]);

  useEffect(() => {
    if (!ticketAccess) {
      setActiveTicket(null);
      return;
    }
    let mounted = true;
    const refresh = async () => {
      if (mounted) await refreshActiveTicket();
    };
    const channel = subscribeToGuestTicketHomeChanges(
      getSupabase().channel(createGuestTicketHomeChannelName(ticketAccess.ticketId)),
      ticketAccess.ticketId,
      () => {
        void refresh();
      },
    );
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    void refresh();
    return () => {
      mounted = false;
      appStateSubscription.remove();
      void getSupabase().removeChannel(channel);
    };
  }, [refreshActiveTicket, ticketAccess]);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') router.replace('/(app)/worker');
  }, []);

  useEffect(() => {
    if (showCodeDrawer) setIsDrawerMounted(true);

    Animated.timing(drawerProgress, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: showCodeDrawer ? 1 : 0,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !showCodeDrawer) setIsDrawerMounted(false);
    });
  }, [drawerProgress, showCodeDrawer]);

  function continueWithCode() {
    const normalized = normalizeBusinessCode(code);
    if (!normalized) {
      setError('Ingresa el código válido que muestra la barbería.');
      return;
    }

    setError(null);
    router.push({ pathname: publicShopRoute, params: { code: normalized } });
  }

  function toggleCodeDrawer() {
    setError(null);
    setShowCodeDrawer((current) => !current);
  }

  if (hasActiveTicketAccess) {
    const barberName = activeTicket?.assignedBarberName ?? activeTicket?.requestedBarberName;

    return (
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 20, paddingTop: Math.max(insets.top, 12) + 12 }]}
        showsVerticalScrollIndicator={false}
        style={styles.shell}
      >
        <View accessibilityLabel="Turnify" style={styles.brand}>
          <BrandMark size={44} tile />
          <Text style={styles.brandName}>Turnify</Text>
        </View>

        <Card elevated padding="lg" style={{ backgroundColor: Palette.ink, borderColor: Palette.ink }}>
          <Pill label="Tu turno sigue activo" tone="gold" />
          <Text style={[TypeScale.metric, { color: '#FFFFFF' }]}>
            {activeTicket ? `Turno ${activeTicket.visibleCode}` : 'Recuperando tu turno…'}
          </Text>
          {activeTicket ? (
            <>
              <Text style={[TypeScale.body, { color: 'rgba(255,255,255,0.86)' }]}>
                {activeTicket.status === 'llamado' ? 'Te están llamando ahora' : 'Tu lugar en la fila está reservado'}
              </Text>
              <View style={styles.activeMetrics}>
                <View style={styles.activeMetric}>
                  <Icon color={Palette.gold} name="users" size={18} />
                  <Text style={[TypeScale.label, { color: '#FFFFFF' }]}>{activeTicket.peopleAhead} delante</Text>
                </View>
                <View style={styles.activeMetric}>
                  <Icon color={Palette.gold} name="clock" size={18} />
                  <Text
                    accessibilityLabel={`Espera estimada ${estimatedWaitSeconds > 0 ? formatEstimatedWait(estimatedWaitSeconds) : '0:00'}`}
                    style={[TypeScale.label, { color: '#FFFFFF' }]}
                  >
                    {activeTicket.status === 'en_espera' || activeTicket.status === 'notificado'
                      ? estimatedWaitSeconds > 0
                        ? `~${formatEstimatedWait(estimatedWaitSeconds)} estimados`
                        : 'Turno próximo'
                      : 'Sin espera estimada'}
                  </Text>
                </View>
              </View>
              {(activeTicket.serviceName || barberName) && (
                <Text style={[TypeScale.caption, { color: 'rgba(255,255,255,0.72)' }]}>
                  {[activeTicket.serviceName, barberName].filter(Boolean).join(' · ')}
                </Text>
              )}
            </>
          ) : null}
          <Button
            fullWidth
            iconRight="arrow-right"
            label="Ver mi turno"
            onPress={() => router.push(activeGuestTicketRoute(activeTicket?.status ?? 'en_espera'))}
            variant="gold"
          />
        </Card>

        <Card padding="md" tone="soft">
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>No puedes iniciar otro turno todavía</Text>
          <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
            Cuando este turno termine, podrás escanear o ingresar otro código.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 20, paddingTop: Math.max(insets.top, 12) + 12 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.shell}
    >
      <View accessibilityLabel="Turnify" style={styles.brand}>
        <BrandMark size={44} tile />
        <Text style={styles.brandName}>Turnify</Text>
      </View>

      <View style={styles.heading}>
        <Pill icon="storefront" label="Barberías" tone="brand" />
        <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>Tu turno empieza aquí</Text>
        <Text style={[TypeScale.body, { color: Palette.inkMuted, maxWidth: 340, textAlign: 'center' }]}>
          Escanea el código de tu barbería y únete a la fila sin crear una cuenta.
        </Text>
      </View>

      <View
        accessible
        accessibilityLabel="Área segura para escanear el código QR de la barbería"
        style={styles.scannerHero}
      >
        <View style={styles.heroGlowOuter} />
        <View style={styles.heroGlowInner} />
        <View style={styles.reticle}>
          <View style={[styles.reticleCorner, styles.topLeft]} />
          <View style={[styles.reticleCorner, styles.topRight]} />
          <View style={[styles.reticleCorner, styles.bottomLeft]} />
          <View style={[styles.reticleCorner, styles.bottomRight]} />
          <View style={styles.scanIcon}>
            <Icon color={Palette.brand} name="qr" size={38} />
          </View>
          <View style={styles.scanLine} />
        </View>
        <View style={styles.securityLabel}>
          <Icon color={Palette.brand} name="shield" size={16} />
          <Text style={styles.securityText}>Acceso seguro</Text>
        </View>
      </View>

      <Button
        fullWidth
        icon="qr"
        iconRight="arrow-right"
        label="Escanear código QR"
        onPress={() => router.push('/(public)/scan')}
        size="lg"
      />

      <Button
        accessibilityHint={showCodeDrawer ? 'Oculta el campo para ingresar el código.' : 'Muestra el campo para ingresar el código.'}
        fullWidth
        icon="code"
        label="Ingresar código de la barbería"
        onPress={toggleCodeDrawer}
        size="lg"
        variant="secondary"
      />

      {isDrawerMounted && (
        <Animated.View
          style={[
            styles.drawer,
            {
              height: drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 176] }),
              opacity: drawerProgress,
              transform: [{ translateY: drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
        >
          <TextField
            autoCapitalize="characters"
            autoCorrect={false}
            error={error}
            label="Código de la barbería"
            onChangeText={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            onSubmitEditing={continueWithCode}
            placeholder="Ej.: TURNO-123"
            returnKeyType="go"
            size="md"
            value={code}
          />
          <Button fullWidth iconRight="arrow-right" label="Continuar" onPress={continueWithCode} size="md" />
        </Animated.View>
      )}

      {!showCodeDrawer && error ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Icon color={Palette.danger} name="alert" size={18} />
          <Text style={[TypeScale.bodySmall, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.values}>
        <ValueCard
          detail="Consulta tu turno con el código que recibes al confirmar."
          icon="ticket"
          title="Código visible"
        />
        <ValueCard detail="Mira la pantalla o escucha el llamado cuando sea tu turno." icon="shield" title="Te llaman en el local" />
      </View>

      <View style={styles.staffFooter}>
        <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>¿Trabajas en una barbería?</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push(workerSignInRoute)}>
          <Text style={[TypeScale.bodyStrong, { color: Palette.brand }]}>Acceso para personal</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: Palette.canvas, flex: 1 },
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingHorizontal: space(5), width: '100%' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: space(2.5), justifyContent: 'center' },
  brandName: { color: Palette.ink, fontSize: 22, letterSpacing: -0.5 },
  heading: { alignItems: 'center', gap: space(2.5), paddingHorizontal: space(2) },

  scannerHero: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoftest,
    borderColor: Palette.border,
    borderRadius: Radius.xlarge,
    borderWidth: 1,
    height: 244,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroGlowOuter: {
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.pill,
    height: 260,
    opacity: 0.85,
    position: 'absolute',
    width: 260,
  },
  heroGlowInner: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    height: 198,
    position: 'absolute',
    width: 198,
  },
  reticle: { alignItems: 'center', height: 138, justifyContent: 'center', position: 'relative', width: 138 },
  reticleCorner: { borderColor: Palette.brand, height: 30, position: 'absolute', width: 30 },
  topLeft: { borderLeftWidth: 2.5, borderTopWidth: 2.5, left: 0, top: 0 },
  topRight: { borderRightWidth: 2.5, borderTopWidth: 2.5, right: 0, top: 0 },
  bottomLeft: { borderBottomWidth: 2.5, borderLeftWidth: 2.5, bottom: 0, left: 0 },
  bottomRight: { borderBottomWidth: 2.5, borderRightWidth: 2.5, bottom: 0, right: 0 },
  scanIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    height: 76,
    justifyContent: 'center',
    width: 76,
    ...Shadows.card,
  },
  scanLine: {
    backgroundColor: Palette.brand,
    borderRadius: 2,
    height: 3,
    opacity: 0.7,
    position: 'absolute',
    top: 68,
    width: 112,
  },
  securityLabel: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    bottom: 16,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
  },
  securityText: { color: Palette.brand, fontSize: 11, letterSpacing: 0.8 },

  drawer: {
    backgroundColor: Palette.brandSoftest,
    borderColor: Palette.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: space(3),
    overflow: 'hidden',
    paddingHorizontal: space(4),
    paddingTop: space(4),
  },

  error: {
    alignItems: 'center',
    backgroundColor: Palette.dangerSoft,
    borderColor: Palette.dangerBorder,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space(2),
    padding: space(3.5),
  },
  errorText: { color: Palette.danger, flex: 1 },

  values: { flexDirection: 'row', gap: space(3) },
  valueCard: { flex: 1, gap: space(2), justifyContent: 'flex-start' },
  valueIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  activeMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space(4) },
  activeMetric: { alignItems: 'center', flexDirection: 'row', gap: space(1.5) },

  staffFooter: { alignItems: 'center', gap: space(1), paddingTop: space(2) },
});