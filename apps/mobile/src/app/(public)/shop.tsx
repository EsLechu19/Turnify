import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar, Button, Card, Icon, Metric, Pill, StateBlock } from '@/components/ui';
import { Palette, Radius, Shadows, space, TypeScale } from '@/constants/theme';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { getCommercialCatalog } from '@/features/queue/commercial-queue-api';
import { normalizeBusinessCode, translateQueueError } from '@/features/queue/queue-api';

/** Public catalog discovery. The successful surface only renders from the anonymous catalog response. */
export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const code = normalizeBusinessCode(rawCode ?? '');
  const { beginDiscovery, draft, hasActiveTicketAccess } = useGuestFlow();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (hasActiveTicketAccess) {
      router.replace('/');
      return;
    }
    let active = true;
    async function discover() {
      if (!code) {
        setError('Ingresa un código de barbería válido.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const catalog = await getCommercialCatalog(code);
        if (active) beginDiscovery(code, catalog);
      } catch (reason) {
        if (active) setError(translateQueueError(reason instanceof Error ? reason.message : ''));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void discover();
    return () => {
      active = false;
    };
  }, [attempt, beginDiscovery, code, hasActiveTicketAccess]);

  const retryDiscovery = useCallback(() => setAttempt((current) => current + 1), []);
  const returnHome = useCallback(() => router.replace('/'), []);
  const catalog = draft?.companyCode === code ? draft.catalog : null;
  const canShowCatalog = catalog !== null && !isLoading && error === null;
  const availableBarbers = catalog?.barbers.filter((barber) => barber.operationalState === 'disponible').length ?? 0;

  if (hasActiveTicketAccess) return null;

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <BrandBar onBack={returnHome} />

        {isLoading ? (
          <View accessibilityLabel="Consultando la barbería" accessibilityRole="progressbar">
            <StateBlock detail="Verificamos el código que te mostraron." icon="search" loading title="Buscando la barbería…" />
          </View>
        ) : null}

        {error && !isLoading ? (
          <Card padding="lg" style={styles.stateCard}>
            <StateBlock
              actionLabel="Intentar nuevamente"
              detail={error}
              icon="alert"
              onAction={retryDiscovery}
              title="No pudimos identificarla"
            />
            <Button label="Volver al inicio" onPress={returnHome} variant="secondary" />
          </Card>
        ) : null}

        {canShowCatalog && catalog ? (
          <>
            <View style={styles.intro}>
              <Pill icon="check-circle" label="Barbería identificada" tone="brand" />
              <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>{catalog.name}</Text>
              <Pill
                icon={catalog.open ? 'check-circle' : 'clock'}
                label={catalog.open ? 'Recibe turnos ahora' : 'No recibe turnos ahora'}
                tone={catalog.open ? 'success' : 'neutral'}
              />
            </View>

            <View
              accessibilityLabel={`Identidad visual de ${catalog.name}`}
              style={styles.placePanel}
            >
              <View style={styles.placeGlowOne} />
              <View style={styles.placeGlowTwo} />
              <View style={styles.placeGrid}>
                <View style={styles.placeLine} />
                <View style={styles.placeLine} />
                <View style={styles.placeLine} />
              </View>
              <View style={styles.placeContent}>
                <View style={styles.placeIcon}>
                  <Icon color="#FFFFFF" name="scissors" size={26} />
                </View>
                <Text style={styles.placeKicker}>Tu próximo turno</Text>
                <Text style={styles.placeName}>{catalog.name}</Text>
                <Text style={styles.placeDetail}>Elige un servicio para continuar.</Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <Card padding="sm" style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Icon color={Palette.brand} name="scissors" size={18} />
                </View>
                <Metric label="servicios" size="sm" tone="ink" value={String(catalog.services.length)} />
              </Card>
              <Card padding="sm" style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Icon color={Palette.brand} name="users" size={18} />
                </View>
                <Metric label="barberos" size="sm" tone="ink" value={String(catalog.barbers.length)} />
              </Card>
              <Card padding="sm" style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Icon color={Palette.brand} name="user" size={18} />
                </View>
                <Metric label="disponibles" size="sm" tone="ink" value={String(availableBarbers)} />
              </Card>
            </View>

            <Card padding="md" tone="brand">
              <View style={styles.infoIcon}>
                <Icon color={Palette.brand} name="ticket" size={20} />
              </View>
              <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Tu turno queda visible</Text>
              <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
                Al confirmarlo recibirás un código visible. La barbería lo muestra o llama en el local cuando corresponde tu turno.
              </Text>
            </Card>

            <Button
              accessibilityLabel="Elegir un servicio"
              accessibilityState={{ disabled: !catalog.open }}
              disabled={!catalog.open}
              fullWidth
              iconRight="arrow-right"
              label={catalog.open ? 'Elegir servicio' : 'La barbería está cerrada'}
              onPress={() => router.push('/(public)/service')}
              size="lg"
            />
            <Button
              accessibilityLabel="Escanear otro código de barbería"
              fullWidth
              icon="qr"
              label="Escanear otro código"
              onPress={() => router.replace('/(public)/scan')}
              size="lg"
              variant="secondary"
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: Palette.canvas, flex: 1 },
  page: { alignSelf: 'center', gap: space(5), maxWidth: 520, paddingHorizontal: space(5), paddingTop: space(2), width: '100%' },
  stateCard: { marginTop: space(6) },

  intro: { alignItems: 'center', gap: space(2.5), paddingTop: space(2) },

  placePanel: {
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.xlarge,
    height: 196,
    overflow: 'hidden',
    position: 'relative',
  },
  placeGlowOne: {
    backgroundColor: Palette.brand,
    borderRadius: Radius.pill,
    height: 185,
    opacity: 0.16,
    position: 'absolute',
    right: -48,
    top: -72,
    width: 185,
  },
  placeGlowTwo: {
    backgroundColor: Palette.gold,
    borderRadius: Radius.pill,
    bottom: -80,
    height: 170,
    left: -46,
    opacity: 0.2,
    position: 'absolute',
    width: 170,
  },
  placeGrid: { gap: 16, opacity: 0.4, position: 'absolute', right: -20, top: 28, transform: [{ rotate: '-18deg' }], width: 250 },
  placeLine: { backgroundColor: '#FFFFFF', height: 1, width: '100%' },
  placeContent: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: space(6) },
  placeIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brand,
    borderRadius: Radius.medium,
    height: 54,
    justifyContent: 'center',
    marginBottom: space(3),
    width: 54,
    ...Shadows.card,
  },
  placeKicker: { color: Palette.brandDeep, fontSize: 11, fontWeight: '800', letterSpacing: 0.9 },
  placeName: { color: Palette.ink, fontSize: 22, lineHeight: 28, marginTop: 4, textAlign: 'center' },
  placeDetail: { color: Palette.inkMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },

  metrics: { flexDirection: 'row', gap: space(2.5) },
  metricCard: { alignItems: 'center', flex: 1, gap: space(2), paddingHorizontal: space(2), paddingVertical: space(3.5) },
  metricIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },

  infoIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
