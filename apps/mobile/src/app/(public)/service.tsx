import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { formatReferencePrice } from '@/features/queue/commercial-booking';
import type { CommercialService } from '@/features/queue/commercial-queue-api';

type ServiceIconName = 'arrow-left' | 'arrow-right' | 'check' | 'clock' | 'scissors';

function ServiceIcon({ name, color = '#00686C', size = 22 }: { name: ServiceIconName; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };

  return <Svg accessibilityElementsHidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
    {name === 'arrow-left' && <Path {...common} d="m15 18-6-6 6-6M9 12h11" />}
    {name === 'arrow-right' && <Path {...common} d="m9 18 6-6-6-6M15 12H4" />}
    {name === 'check' && <Path {...common} d="m5 12.5 4.2 4.2L19 7.4" />}
    {name === 'clock' && <><Circle {...common} cx="12" cy="12" r="8.5" /><Path {...common} d="M12 7v5l3.2 2" /></>}
    {name === 'scissors' && <><Circle {...common} cx="6.5" cy="17.5" r="2.2" /><Circle {...common} cx="6.5" cy="6.5" r="2.2" /><Path {...common} d="m8.2 8.2 10.3 7.6M8.2 15.8 18.5 8.2" /></>}
  </Svg>;
}

function durationLabel(service: CommercialService) {
  return `${Math.ceil(service.estimatedDurationSeconds / 60)} min`;
}

function ServiceOption({ selected, service, onPress }: { selected: boolean; service: CommercialService; onPress(): void }) {
  const referencePrice = formatReferencePrice(service.referencePriceCents);

  return <Pressable
    accessibilityLabel={`Elegir ${service.name}`}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={({ pressed }) => [styles.serviceCard, selected && styles.serviceCardSelected, pressed && styles.pressed]}
  >
    <View style={styles.serviceTopline}>
      <View style={[styles.serviceIcon, selected && styles.serviceIconSelected]}><ServiceIcon color={selected ? '#FFFFFF' : '#00686C'} name="scissors" size={21} /></View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <ServiceIcon color="#FFFFFF" name="check" size={15} />}</View>
    </View>
    <Text style={styles.serviceName}>{service.name}</Text>
    {service.description && <Text style={styles.serviceDescription}>{service.description}</Text>}
    <View style={styles.serviceFacts}>
      <View style={styles.durationPill}><ServiceIcon name="clock" size={15} /><Text style={styles.durationLabel}>{durationLabel(service)}</Text></View>
      <Text style={referencePrice ? styles.price : styles.priceMissing}>{referencePrice ?? 'Consulta en el local'}</Text>
    </View>
  </Pressable>;
}

export default function ServiceScreen() {
  const insets = useSafeAreaInsets();
  const { draft, chooseService } = useGuestFlow();

  if (!draft) return <CustomerPage><CustomerState label="Primero identifica una barbería." action={() => router.replace('/')} /></CustomerPage>;

  const selectedService = draft.catalog.services.find((service) => service.serviceId === draft.serviceId) ?? null;
  const selectedPrice = selectedService ? formatReferencePrice(selectedService.referencePriceCents) : null;

  return <View style={[styles.shell, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 178 + Math.max(insets.bottom, 16) }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver a la barbería" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><ServiceIcon name="arrow-left" size={20} /></Pressable>
        <View style={styles.brand}><View style={styles.brandMark}><View style={styles.brandMarkInner} /></View><Text style={styles.brandName}>Turnify</Text></View>
        <View style={styles.step}><Text style={styles.stepLabel}>PASO</Text><Text style={styles.stepValue}>1/3</Text></View>
      </View>

      <View style={styles.intro}>
        <Text style={styles.shopName}>{draft.catalog.name}</Text>
        <Text style={styles.title}>Elige tu servicio</Text>
        <Text style={styles.subtitle}>Selecciona lo que necesitas antes de elegir tu barbero.</Text>
      </View>

      <View style={styles.durationPanel}>
        <View style={styles.durationIcon}><ServiceIcon name="clock" size={20} /></View>
        <View style={styles.durationCopy}><Text style={styles.durationTitle}>El tiempo depende del servicio</Text><Text style={styles.durationDetail}>Mostramos una duración estimada para que elijas con información clara.</Text></View>
      </View>

      {draft.catalog.services.length === 0
        ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No hay servicios activos disponibles.</Text><Text style={styles.emptyDetail}>Consulta en el local para conocer cuándo volver a intentar.</Text></View>
        : <View accessibilityRole="radiogroup" style={styles.serviceList}>{draft.catalog.services.map((service) => <ServiceOption key={service.serviceId} onPress={() => chooseService(service.serviceId)} selected={draft.serviceId === service.serviceId} service={service} />)}</View>}
    </ScrollView>

    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><ServiceIcon name={selectedService ? 'scissors' : 'clock'} size={19} /></View>
        <View style={styles.summaryCopy}><Text style={styles.summaryLabel}>SERVICIO SELECCIONADO</Text><Text numberOfLines={1} style={styles.summaryName}>{selectedService?.name ?? 'Elige una opción'}</Text>{selectedService && <Text style={styles.summaryDetail}>{durationLabel(selectedService)}{selectedPrice ? ` · ${selectedPrice}` : ''}</Text>}</View>
      </View>
      <Pressable accessibilityLabel="Continuar para elegir un barbero" accessibilityRole="button" accessibilityState={{ disabled: !selectedService }} disabled={!selectedService} onPress={() => router.push('/(public)/barber')} style={({ pressed }) => [styles.continueButton, !selectedService && styles.continueButtonDisabled, pressed && selectedService && styles.pressed]}><Text style={styles.continueLabel}>Continuar</Text><ServiceIcon color="#FFFFFF" name="arrow-right" size={20} /></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F7F9FF', flex: 1 },
  page: { alignSelf: 'center', gap: 18, maxWidth: 520, paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  header: { alignItems: 'center', backgroundColor: '#FFFFFFD9', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 8 },
  backButton: { alignItems: 'center', borderRadius: 8, height: 38, justifyContent: 'center', width: 38 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 }, brandMark: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 8, height: 25, justifyContent: 'center', width: 25 }, brandMarkInner: { backgroundColor: '#F7F9FF', borderRadius: 3, height: 9, transform: [{ rotate: '45deg' }], width: 9 }, brandName: { color: '#111D27', fontSize: 16, fontWeight: '800', letterSpacing: -.2 },
  step: { alignItems: 'flex-end', minWidth: 38 }, stepLabel: { color: '#6B7A8A', fontSize: 9, fontWeight: '800', letterSpacing: .7 }, stepValue: { color: '#00686C', fontSize: 13, fontWeight: '800' },
  intro: { alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingTop: 8 }, shopName: { color: '#00686C', fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' }, title: { color: '#111D27', fontSize: 29, fontWeight: '800', letterSpacing: -.8, lineHeight: 35, textAlign: 'center' }, subtitle: { color: '#526273', fontSize: 14, lineHeight: 21, maxWidth: 350, textAlign: 'center' },
  durationPanel: { alignItems: 'flex-start', backgroundColor: '#EDF3FF', borderColor: '#D4E2FC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 15 }, durationIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, durationCopy: { flex: 1, gap: 3 }, durationTitle: { color: '#111D27', fontSize: 14, fontWeight: '800' }, durationDetail: { color: '#526273', fontSize: 13, lineHeight: 19 },
  serviceList: { gap: 12 }, serviceCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E1F7', borderRadius: 12, borderWidth: 1, gap: 10, minHeight: 164, padding: 16 }, serviceCardSelected: { backgroundColor: '#F2FBFA', borderColor: '#0E8388', borderWidth: 2, padding: 15 }, serviceTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, serviceIcon: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, serviceIconSelected: { backgroundColor: '#00686C' }, radio: { alignItems: 'center', borderColor: '#A9B8C8', borderRadius: 14, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 }, radioSelected: { backgroundColor: '#0E8388', borderColor: '#0E8388' }, serviceName: { color: '#111D27', fontSize: 18, fontWeight: '800', lineHeight: 24 }, serviceDescription: { color: '#526273', fontSize: 14, lineHeight: 20 }, serviceFacts: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' }, durationPill: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 }, durationLabel: { color: '#00686C', fontSize: 12, fontWeight: '800' }, price: { color: '#111D27', fontSize: 14, fontWeight: '800' }, priceMissing: { color: '#526273', fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, gap: 6, padding: 24 }, emptyTitle: { color: '#111D27', fontSize: 17, fontWeight: '800', textAlign: 'center' }, emptyDetail: { color: '#526273', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bottomBar: { backgroundColor: '#FFFFFFF2', borderColor: '#DCE5FB', borderTopWidth: 1, gap: 10, paddingHorizontal: 20, paddingTop: 12 }, summary: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 42 }, summaryIcon: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 8, height: 38, justifyContent: 'center', width: 38 }, summaryCopy: { flex: 1 }, summaryLabel: { color: '#6B7A8A', fontSize: 9, fontWeight: '800', letterSpacing: .7 }, summaryName: { color: '#111D27', fontSize: 14, fontWeight: '800', lineHeight: 19 }, summaryDetail: { color: '#526273', fontSize: 12, lineHeight: 16 },
  continueButton: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, flexDirection: 'row', height: 54, justifyContent: 'center', gap: 8, paddingHorizontal: 18 }, continueButtonDisabled: { backgroundColor: '#93A2B1' }, continueLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, pressed: { opacity: .76 },
});
