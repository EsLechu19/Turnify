import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar, Button, Card, Icon, Pill, QrLoader, StateBlock } from '@/components/ui';
import { HowToGetThere } from '@/components/customer/how-to-get-there';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
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
      router.replace('/(public)/ticket');
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
            <QrLoader label="Leyendo código QR" />
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

        {canShowCatalog && catalog && !catalog.open ? (
          <Card padding="lg" tone="brand">
            <View style={styles.closedIcon}>
              <Icon color={Palette.brand} name="clock" size={26} />
            </View>
            <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>{catalog.name}</Text>
            <Pill icon="clock" label="No recibe turnos ahora" tone="neutral" />
            <Text style={[TypeScale.h3, { color: Palette.ink, textAlign: 'center' }]}>Negocio cerrado</Text>
            <Text style={[TypeScale.bodySmall, styles.closedDetail]}>
              Este local no está recibiendo turnos ahora. Vuelve más tarde o acércate al mostrador y te ayudamos.
            </Text>
            <Button
              accessibilityLabel="Volver al inicio"
              fullWidth
              icon="arrow-left"
              label="Volver al inicio"
              onPress={returnHome}
              variant="secondary"
            />
          </Card>
        ) : null}

        {canShowCatalog && catalog && catalog.open ? (
          <>
            <View style={styles.intro}>
              <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>{catalog.name}</Text>
              <Pill
                icon="check-circle"
                label={availableBarbers > 0 ? `${availableBarbers} barbero${availableBarbers === 1 ? '' : 's'} disponible${availableBarbers === 1 ? '' : 's'} ahora` : 'Recibe turnos ahora'}
                tone="success"
              />
            </View>

            <Button
              accessibilityLabel="Elegir un servicio"
              fullWidth
              iconRight="arrow-right"
              label="Elegir servicio"
              onPress={() => router.push('/(public)/service')}
              size="lg"
            />

            <Card padding="md" tone="brand">
              <View style={styles.infoIcon}>
                <Icon color={Palette.brand} name="ticket" size={20} />
              </View>
              <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Te llaman por tu código</Text>
              <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
                Al confirmar verás tu código en pantalla. Estate atento: lo dirán en el local. Haz una captura por si acaso.
              </Text>
            </Card>

            <HowToGetThere shop={catalog.shopLocation ?? null} shopName={catalog.name} />

            <Button
              accessibilityLabel="Escanear otro código de barbería"
              label="Escanear otro código"
              onPress={() => router.replace('/(public)/scan')}
              variant="link"
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

  infoIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closedIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  closedDetail: { color: Palette.inkMuted, textAlign: 'center' },
});
