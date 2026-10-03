import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useGuestFlow } from '@/features/public/guest-flow-session';
import { getCommercialCatalog } from '@/features/queue/commercial-queue-api';
import { normalizeBusinessCode, translateQueueError } from '@/features/queue/queue-api';

type ShopIconName = 'arrow-left' | 'arrow-right' | 'barber' | 'help' | 'scissors' | 'team' | 'ticket';

function ShopIcon({ name, color = '#00686C', size = 22 }: { name: ShopIconName; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };

  return (
    <Svg accessibilityElementsHidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {name === 'arrow-left' && <Path {...common} d="m15 18-6-6 6-6M9 12h11" />}
      {name === 'arrow-right' && <Path {...common} d="m9 18 6-6-6-6M15 12H4" />}
      {name === 'barber' && <><Path {...common} d="M5 20V9.5a7 7 0 0 1 14 0V20M3 20h18M9 16h6" /><Circle {...common} cx="12" cy="9" r="2" /></>}
      {name === 'help' && <><Circle {...common} cx="12" cy="12" r="8.5" /><Path {...common} d="M9.8 9.5a2.4 2.4 0 1 1 3.7 2c-.9.6-1.5 1.1-1.5 2.3M12 16.7h.01" /></>}
      {name === 'scissors' && <><Circle {...common} cx="6.5" cy="17.5" r="2.2" /><Circle {...common} cx="6.5" cy="6.5" r="2.2" /><Path {...common} d="m8.2 8.2 10.3 7.6M8.2 15.8 18.5 8.2" /></>}
      {name === 'team' && <><Circle {...common} cx="9" cy="8" r="2.5" /><Circle {...common} cx="17" cy="9" r="2" /><Path {...common} d="M4.5 18c.5-3 2.2-4.5 4.5-4.5s4 1.5 4.5 4.5M14 14.2c2.7-.3 4.4 1 5 3.8" /></>}
      {name === 'ticket' && <><Path {...common} d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z" /><Path {...common} d="M12 8v8" /></>}
    </Svg>
  );
}

function MetricCard({ icon, value, label }: { icon: 'scissors' | 'team'; value: number; label: string }) {
  return <View style={styles.metricCard}><View style={styles.metricIcon}><ShopIcon name={icon} size={19} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

/** Public catalog discovery. The successful surface only renders from the anonymous catalog response. */
export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const code = normalizeBusinessCode(rawCode ?? '');
  const { beginDiscovery, draft } = useGuestFlow();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
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
    return () => { active = false; };
  }, [attempt, beginDiscovery, code]);

  const retryDiscovery = useCallback(() => setAttempt((current) => current + 1), []);
  const returnHome = useCallback(() => router.replace('/'), []);
  const catalog = draft?.companyCode === code ? draft.catalog : null;
  const canShowCatalog = catalog !== null && !isLoading && error === null;
  const availableBarbers = catalog?.barbers.filter((barber) => barber.operationalState === 'disponible').length ?? 0;

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" hitSlop={8} onPress={returnHome} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
            <ShopIcon name="arrow-left" size={20} />
          </Pressable>
          <View style={styles.brand}><View style={styles.brandMark}><View style={styles.brandMarkInner} /></View><Text style={styles.brandName}>Turnify</Text></View>
          <Pressable accessibilityLabel="Ver ayuda para identificar una barbería" accessibilityRole="button" hitSlop={8} onPress={returnHome} style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
            <ShopIcon name="help" size={19} /><Text style={styles.helpLabel}>Ayuda</Text>
          </Pressable>
        </View>

        {isLoading && <View accessibilityLabel="Consultando la barbería" accessibilityRole="progressbar" style={styles.stateCard}><View style={styles.stateIcon}><ActivityIndicator color="#00686C" /></View><Text style={styles.stateTitle}>Buscando la barbería…</Text><Text style={styles.stateDetail}>Verificamos el código que te mostraron.</Text></View>}

        {error && !isLoading && <View accessibilityLiveRegion="polite" style={styles.stateCard}><View style={styles.stateIcon}><ShopIcon name="help" /></View><Text style={styles.stateTitle}>No pudimos identificarla</Text><Text style={styles.stateDetail}>{error}</Text><Pressable accessibilityLabel="Intentar nuevamente" accessibilityRole="button" onPress={retryDiscovery} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonLabel}>Intentar nuevamente</Text></Pressable><Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" onPress={returnHome} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonLabel}>Volver al inicio</Text></Pressable></View>}

        {canShowCatalog && catalog && <>
          <View style={styles.intro}><View style={styles.identifiedPill}><View style={styles.pillDot} /><Text style={styles.identifiedLabel}>BARBERÍA IDENTIFICADA</Text></View><Text style={styles.title}>{catalog.name}</Text><View style={[styles.statusPill, !catalog.open && styles.statusPillClosed]}><View style={[styles.statusDot, !catalog.open && styles.statusDotClosed]} /><Text style={[styles.statusLabel, !catalog.open && styles.statusLabelClosed]}>{catalog.open ? 'Recibe turnos ahora' : 'No recibe turnos ahora'}</Text></View></View>

          <View accessibilityLabel={`Identidad visual de ${catalog.name}`} style={styles.placePanel}><View style={styles.placeGlowOne} /><View style={styles.placeGlowTwo} /><View style={styles.placeGrid}><View style={styles.placeLine} /><View style={styles.placeLine} /><View style={styles.placeLine} /></View><View style={styles.placeContent}><View style={styles.placeIcon}><ShopIcon color="#FFFFFF" name="barber" size={29} /></View><Text style={styles.placeKicker}>TU PRÓXIMO TURNO</Text><Text style={styles.placeName}>{catalog.name}</Text><Text style={styles.placeDetail}>Elige un servicio para continuar.</Text></View></View>

          <View style={styles.metrics}><MetricCard icon="scissors" label="servicios" value={catalog.services.length} /><MetricCard icon="team" label="barberos" value={catalog.barbers.length} /><View style={styles.metricCard}><View style={styles.metricIcon}><ShopIcon name="team" size={19} /></View><Text style={styles.metricValue}>{availableBarbers}</Text><Text style={styles.metricLabel}>disponibles</Text></View></View>

          <View style={styles.infoCard}><View style={styles.infoIcon}><ShopIcon name="ticket" size={21} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>Tu turno queda visible</Text><Text style={styles.infoDetail}>Al confirmarlo recibirás un código visible. La barbería lo muestra o llama en el local cuando corresponde tu turno.</Text></View></View>

          <Pressable accessibilityLabel="Elegir un servicio" accessibilityRole="button" accessibilityState={{ disabled: !catalog.open }} disabled={!catalog.open} onPress={() => router.push('/(public)/service')} style={({ pressed }) => [styles.primaryButton, !catalog.open && styles.disabledButton, pressed && catalog.open && styles.pressed]}><Text style={styles.primaryButtonLabel}>{catalog.open ? 'Elegir servicio' : 'La barbería está cerrada'}</Text><ShopIcon color="#FFFFFF" name="arrow-right" size={20} /></Pressable>
          <Pressable accessibilityLabel="Escanear otro código de barbería" accessibilityRole="button" onPress={() => router.replace('/(public)/scan')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonLabel}>Escanear otro código</Text></Pressable>
        </>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F7F9FF', flex: 1 },
  page: { alignSelf: 'center', gap: 20, maxWidth: 520, paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  header: { alignItems: 'center', backgroundColor: '#FFFFFFD9', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 8 },
  headerButton: { alignItems: 'center', borderRadius: 8, height: 38, justifyContent: 'center', width: 38 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 }, brandMark: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 8, height: 25, justifyContent: 'center', width: 25 }, brandMarkInner: { backgroundColor: '#F7F9FF', borderRadius: 3, height: 9, transform: [{ rotate: '45deg' }], width: 9 }, brandName: { color: '#111D27', fontSize: 16, fontWeight: '800', letterSpacing: -.2 },
  helpButton: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 4, height: 38, justifyContent: 'center', paddingHorizontal: 7 }, helpLabel: { color: '#00686C', fontSize: 12, fontWeight: '700' },
  stateCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, gap: 10, marginTop: 28, padding: 28 }, stateIcon: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 12, height: 48, justifyContent: 'center', width: 48 }, stateTitle: { color: '#111D27', fontSize: 19, fontWeight: '800', textAlign: 'center' }, stateDetail: { color: '#526273', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  intro: { alignItems: 'center', gap: 10, paddingTop: 12 }, identifiedPill: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }, pillDot: { backgroundColor: '#0E8388', borderRadius: 4, height: 7, width: 7 }, identifiedLabel: { color: '#00686C', fontSize: 10, fontWeight: '800', letterSpacing: .8 }, title: { color: '#111D27', fontSize: 30, fontWeight: '800', letterSpacing: -.8, lineHeight: 36, textAlign: 'center' }, statusPill: { alignItems: 'center', backgroundColor: '#E5F5F3', borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }, statusPillClosed: { backgroundColor: '#F0F2F5' }, statusDot: { backgroundColor: '#0E8388', borderRadius: 4, height: 7, width: 7 }, statusDotClosed: { backgroundColor: '#708091' }, statusLabel: { color: '#00686C', fontSize: 12, fontWeight: '700' }, statusLabelClosed: { color: '#526273' },
  placePanel: { backgroundColor: '#DDE8FF', borderRadius: 12, height: 196, overflow: 'hidden', position: 'relative' }, placeGlowOne: { backgroundColor: '#88B0D9', borderRadius: 100, height: 185, opacity: .55, position: 'absolute', right: -48, top: -72, width: 185 }, placeGlowTwo: { backgroundColor: '#9CDAD6', borderRadius: 100, bottom: -80, height: 170, left: -46, opacity: .5, position: 'absolute', width: 170 }, placeGrid: { gap: 16, opacity: .35, position: 'absolute', right: -20, top: 28, transform: [{ rotate: '-18deg' }], width: 250 }, placeLine: { backgroundColor: '#FFFFFF', height: 1, width: '100%' }, placeContent: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 24 }, placeIcon: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, height: 54, justifyContent: 'center', marginBottom: 12, width: 54 }, placeKicker: { color: '#315270', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, placeName: { color: '#111D27', fontSize: 22, fontWeight: '800', letterSpacing: -.4, lineHeight: 28, marginTop: 4, textAlign: 'center' }, placeDetail: { color: '#526273', fontSize: 13, marginTop: 4, textAlign: 'center' },
  metrics: { flexDirection: 'row', gap: 8 }, metricCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, flex: 1, gap: 3, minHeight: 116, paddingHorizontal: 6, paddingVertical: 12 }, metricIcon: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 }, metricValue: { color: '#111D27', fontSize: 22, fontWeight: '800', lineHeight: 27 }, metricLabel: { color: '#526273', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  infoCard: { alignItems: 'flex-start', backgroundColor: '#EDF3FF', borderColor: '#D4E2FC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 }, infoIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, infoCopy: { flex: 1, gap: 3 }, infoTitle: { color: '#111D27', fontSize: 15, fontWeight: '800' }, infoDetail: { color: '#526273', fontSize: 13, lineHeight: 19 },
  primaryButton: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 56, paddingHorizontal: 18 }, primaryButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, secondaryButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#BFD1F0', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, secondaryButtonLabel: { color: '#00686C', fontSize: 15, fontWeight: '800' }, disabledButton: { backgroundColor: '#93A2B1' }, pressed: { opacity: .74 },
});
