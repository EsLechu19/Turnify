import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { compatibleBarbers } from '@/features/queue/commercial-booking';
import type { CommercialBarber } from '@/features/queue/commercial-queue-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';

type BarberIconName = 'arrow-left' | 'arrow-right' | 'check' | 'clock' | 'info' | 'person' | 'sparkle';

function BarberIcon({ name, color = '#00686C', size = 22 }: { name: BarberIconName; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };

  return <Svg accessibilityElementsHidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
    {name === 'arrow-left' && <Path {...common} d="m15 18-6-6 6-6M9 12h11" />}
    {name === 'arrow-right' && <Path {...common} d="m9 18 6-6-6-6M15 12H4" />}
    {name === 'check' && <Path {...common} d="m5 12.5 4.2 4.2L19 7.4" />}
    {name === 'clock' && <><Circle {...common} cx="12" cy="12" r="8.5" /><Path {...common} d="M12 7v5l3.2 2" /></>}
    {name === 'info' && <><Circle {...common} cx="12" cy="12" r="8.5" /><Path {...common} d="M12 10.6v5M12 8h.01" /></>}
    {name === 'person' && <><Circle {...common} cx="12" cy="8.5" r="3" /><Path {...common} d="M5.5 20c.5-3.7 2.6-5.6 6.5-5.6s6 1.9 6.5 5.6" /></>}
    {name === 'sparkle' && <Path {...common} d="m12 3 1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3ZM19 16l.6 2.1L22 19l-2.4.9L19 22l-.6-2.1L16 19l2.4-.9L19 16Z" />}
  </Svg>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'B';
}

function BarberOption({ barber, selected, onPress }: { barber: CommercialBarber; selected: boolean; onPress(): void }) {
  const available = barber.operationalState === 'disponible';
  const status = available ? 'Disponible' : 'Ocupado';

  return <Pressable
    accessibilityLabel={`Elegir a ${barber.name}, ${status}`}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={({ pressed }) => [styles.barberCard, selected && styles.barberCardSelected, pressed && styles.pressed]}
  >
    <View style={[styles.avatar, selected && styles.avatarSelected]}><Text style={[styles.avatarLabel, selected && styles.avatarLabelSelected]}>{initials(barber.name)}</Text></View>
    <View style={styles.barberCopy}>
      <Text style={styles.barberName}>{barber.name}</Text>
      <View style={[styles.statusPill, !available && styles.busyPill]}><View style={[styles.statusDot, !available && styles.busyDot]} /><Text style={[styles.statusLabel, !available && styles.busyLabel]}>{status}</Text></View>
    </View>
    <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <BarberIcon color="#FFFFFF" name="check" size={15} />}</View>
  </Pressable>;
}

export default function BarberScreen() {
  const insets = useSafeAreaInsets();
  const { draft, chooseBarber } = useGuestFlow();

  if (!draft?.serviceId) return <CustomerPage><CustomerState label="Primero elige un servicio." action={() => router.replace('/(public)/service')} /></CustomerPage>;

  const selectedService = draft.catalog.services.find((service) => service.serviceId === draft.serviceId) ?? null;
  const duration = selectedService ? `${Math.ceil(selectedService.estimatedDurationSeconds / 60)} min` : null;
  const barbers = compatibleBarbers(draft.catalog, draft.serviceId);
  const hasBarbers = barbers.length > 0;

  return <View style={[styles.shell, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 166 + Math.max(insets.bottom, 16) }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver a elegir servicio" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><BarberIcon name="arrow-left" size={20} /></Pressable>
        <View style={styles.brand}><View style={styles.brandMark}><View style={styles.brandMarkInner} /></View><Text style={styles.brandName}>Turnify</Text></View>
        <View style={styles.step}><Text style={styles.stepLabel}>PASO</Text><Text style={styles.stepValue}>2/3</Text></View>
      </View>

      <View style={styles.intro}>
        <Text style={styles.shopName}>{draft.catalog.name}</Text>
        <Text style={styles.title}>Elige tu barbero</Text>
        <Text style={styles.subtitle}>Puedes indicar una preferencia o dejar la elección flexible.</Text>
      </View>

      {selectedService && <View style={styles.servicePanel}>
        <View style={styles.serviceIcon}><BarberIcon name="clock" size={19} /></View>
        <View style={styles.serviceCopy}><Text style={styles.serviceLabel}>SERVICIO SELECCIONADO</Text><Text numberOfLines={1} style={styles.serviceName}>{selectedService.name}</Text></View>
        {duration && <Text style={styles.duration}>{duration}</Text>}
      </View>}

      {hasBarbers && <View accessibilityRole="radiogroup" style={styles.options}>
        <Pressable accessibilityLabel="Elegir cualquier barbero compatible" accessibilityRole="radio" accessibilityState={{ selected: draft.requestedBarberId === null }} onPress={() => chooseBarber(null)} style={({ pressed }) => [styles.flexibleCard, draft.requestedBarberId === null && styles.flexibleCardSelected, pressed && styles.pressed]}>
          <View style={styles.flexibleTopline}><View style={styles.flexibleIcon}><BarberIcon color="#FFFFFF" name="sparkle" size={20} /></View><View style={[styles.radio, styles.flexibleRadio, draft.requestedBarberId === null && styles.radioSelected]}>{draft.requestedBarberId === null && <BarberIcon color="#FFFFFF" name="check" size={15} />}</View></View>
          <Text style={styles.flexibleTitle}>Cualquier barbero compatible</Text>
          <Text style={styles.flexibleDetail}>Damos preferencia al primer barbero compatible que esté disponible cuando llamen tu turno.</Text>
          <View style={styles.flexibleBadge}><BarberIcon color="#00686C" name="person" size={15} /><Text style={styles.flexibleBadgeLabel}>ELECCIÓN FLEXIBLE</Text></View>
        </Pressable>

        <Text style={styles.listLabel}>O elige una preferencia</Text>
        {barbers.map((barber) => <BarberOption barber={barber} key={barber.barberId} onPress={() => chooseBarber(barber.barberId)} selected={draft.requestedBarberId === barber.barberId} />)}
      </View>}

      {!hasBarbers && <View style={styles.emptyCard}><View style={styles.emptyIcon}><BarberIcon name="person" size={22} /></View><Text style={styles.emptyTitle}>No hay barberos compatibles en turno.</Text><Text style={styles.emptyDetail}>Vuelve a elegir un servicio o consulta en el local.</Text></View>}

      <View style={styles.infoCard}><View style={styles.infoIcon}><BarberIcon name="info" size={20} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>Tu preferencia queda registrada</Text><Text style={styles.infoDetail}>Si eliges un barbero específico, tu turno espera a que pueda atenderte. La asignación ocurre cuando llamen tu turno.</Text></View></View>
    </ScrollView>

    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <Text numberOfLines={1} style={styles.bottomHint}>{draft.requestedBarberId === null ? 'Elección flexible' : 'Barbero seleccionado'}</Text>
      <Pressable accessibilityLabel="Continuar con los datos del turno" accessibilityRole="button" accessibilityState={{ disabled: !hasBarbers }} disabled={!hasBarbers} onPress={() => router.push('/(public)/details')} style={({ pressed }) => [styles.continueButton, !hasBarbers && styles.continueButtonDisabled, pressed && hasBarbers && styles.pressed]}><Text style={styles.continueLabel}>Continuar</Text><BarberIcon color="#FFFFFF" name="arrow-right" size={20} /></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F7F9FF', flex: 1 }, page: { alignSelf: 'center', gap: 18, maxWidth: 520, paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  header: { alignItems: 'center', backgroundColor: '#FFFFFFD9', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 8 }, backButton: { alignItems: 'center', borderRadius: 8, height: 38, justifyContent: 'center', width: 38 }, brand: { alignItems: 'center', flexDirection: 'row', gap: 8 }, brandMark: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 8, height: 25, justifyContent: 'center', width: 25 }, brandMarkInner: { backgroundColor: '#F7F9FF', borderRadius: 3, height: 9, transform: [{ rotate: '45deg' }], width: 9 }, brandName: { color: '#111D27', fontSize: 16, fontWeight: '800', letterSpacing: -.2 }, step: { alignItems: 'flex-end', minWidth: 38 }, stepLabel: { color: '#6B7A8A', fontSize: 9, fontWeight: '800', letterSpacing: .7 }, stepValue: { color: '#00686C', fontSize: 13, fontWeight: '800' },
  intro: { alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingTop: 8 }, shopName: { color: '#00686C', fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' }, title: { color: '#111D27', fontSize: 29, fontWeight: '800', letterSpacing: -.8, lineHeight: 35, textAlign: 'center' }, subtitle: { color: '#526273', fontSize: 14, lineHeight: 21, maxWidth: 350, textAlign: 'center' },
  servicePanel: { alignItems: 'center', backgroundColor: '#EDF3FF', borderColor: '#D4E2FC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 13 }, serviceIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, height: 38, justifyContent: 'center', width: 38 }, serviceCopy: { flex: 1 }, serviceLabel: { color: '#6B7A8A', fontSize: 9, fontWeight: '800', letterSpacing: .7 }, serviceName: { color: '#111D27', fontSize: 14, fontWeight: '800', lineHeight: 19 }, duration: { color: '#00686C', fontSize: 13, fontWeight: '800' },
  options: { gap: 12 }, flexibleCard: { backgroundColor: '#E7F5F4', borderColor: '#9DDBD8', borderRadius: 12, borderWidth: 1, gap: 10, padding: 16 }, flexibleCardSelected: { backgroundColor: '#DDF3F1', borderColor: '#0E8388', borderWidth: 2, padding: 15 }, flexibleTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, flexibleIcon: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, flexibleTitle: { color: '#111D27', fontSize: 19, fontWeight: '800', lineHeight: 25 }, flexibleDetail: { color: '#315B5D', fontSize: 14, lineHeight: 20 }, flexibleBadge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFFFFFB8', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 }, flexibleBadgeLabel: { color: '#00686C', fontSize: 10, fontWeight: '800', letterSpacing: .5 }, listLabel: { color: '#526273', fontSize: 13, fontWeight: '800', marginTop: 4 },
  barberCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E1F7', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 82, padding: 14 }, barberCardSelected: { backgroundColor: '#F2FBFA', borderColor: '#0E8388', borderWidth: 2, padding: 13 }, avatar: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 }, avatarSelected: { backgroundColor: '#00686C' }, avatarLabel: { color: '#315270', fontSize: 14, fontWeight: '800' }, avatarLabelSelected: { color: '#FFFFFF' }, barberCopy: { flex: 1, gap: 5 }, barberName: { color: '#111D27', fontSize: 16, fontWeight: '800', lineHeight: 21 }, statusPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E5F5F3', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 4 }, busyPill: { backgroundColor: '#EEF1F5' }, statusDot: { backgroundColor: '#0E8388', borderRadius: 4, height: 7, width: 7 }, busyDot: { backgroundColor: '#6B7A8A' }, statusLabel: { color: '#00686C', fontSize: 11, fontWeight: '800' }, busyLabel: { color: '#526273' }, radio: { alignItems: 'center', borderColor: '#A9B8C8', borderRadius: 14, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 }, flexibleRadio: { backgroundColor: '#FFFFFF' }, radioSelected: { backgroundColor: '#0E8388', borderColor: '#0E8388' },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE5FB', borderRadius: 12, borderWidth: 1, gap: 7, padding: 25 }, emptyIcon: { alignItems: 'center', backgroundColor: '#E7F0FF', borderRadius: 8, height: 42, justifyContent: 'center', width: 42 }, emptyTitle: { color: '#111D27', fontSize: 17, fontWeight: '800', textAlign: 'center' }, emptyDetail: { color: '#526273', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  infoCard: { alignItems: 'flex-start', backgroundColor: '#EDF3FF', borderColor: '#D4E2FC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 15 }, infoIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, infoCopy: { flex: 1, gap: 3 }, infoTitle: { color: '#111D27', fontSize: 14, fontWeight: '800' }, infoDetail: { color: '#526273', fontSize: 13, lineHeight: 19 },
  bottomBar: { backgroundColor: '#FFFFFFF2', borderColor: '#DCE5FB', borderTopWidth: 1, gap: 8, paddingHorizontal: 20, paddingTop: 11 }, bottomHint: { color: '#526273', fontSize: 12, fontWeight: '700' }, continueButton: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, flexDirection: 'row', gap: 8, height: 54, justifyContent: 'center', paddingHorizontal: 18 }, continueButtonDisabled: { backgroundColor: '#93A2B1' }, continueLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, pressed: { opacity: .76 },
});
