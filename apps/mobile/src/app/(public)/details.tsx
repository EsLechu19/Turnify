import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { bookingExpectation, formatReferencePrice, selectedBarber } from '@/features/queue/commercial-booking';
import { GUEST_AGE_RANGES, GUEST_GENDERS, normalizeGuestDetails, type GuestAgeRange, type GuestGender } from '@/features/queue/guest-ticket-details';
import { createGuestTicket } from '@/features/queue/public-guest-ticket-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { translateQueueError } from '@/features/queue/queue-api';

const ageLabels: Record<GuestAgeRange, string> = { under_18: 'Menos de 18', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_plus': '45 o más' };
const genderLabels: Record<GuestGender, string> = { male: 'Hombre', female: 'Mujer', prefer_not_to_say: 'Prefiero no decirlo' };

function DetailIcon({ name, color = '#00686C', size = 20 }: { name: 'arrow-left' | 'calendar' | 'check' | 'clock' | 'edit' | 'person' | 'shield'; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };
  return <Svg accessibilityElementsHidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
    {name === 'arrow-left' && <Path {...common} d="m15 18-6-6 6-6M9 12h11" />}
    {name === 'calendar' && <><Path {...common} d="M6 4v3m12-3v3M4.5 9.5h15M6 5.5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" /><Path {...common} d="M8 13h.01M12 13h.01M16 13h.01" /></>}
    {name === 'check' && <Path {...common} d="m5 12.5 4.2 4.2L19 7.4" />}
    {name === 'clock' && <><Path {...common} d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /><Path {...common} d="M12 7v5l3.2 2" /></>}
    {name === 'edit' && <><Path {...common} d="m14.7 5.3 4 4M5 19l3.8-.8L19.7 7.3a2.1 2.1 0 0 0-3-3L5.8 15.2 5 19Z" /><Path {...common} d="m14.7 5.3 4 4" /></>}
    {name === 'person' && <><Path {...common} d="M19 20a7 7 0 0 0-14 0" /><Path {...common} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></>}
    {name === 'shield' && <><Path {...common} d="M12 3.5 19 6v5.6c0 4.3-2.9 7.5-7 8.9-4.1-1.4-7-4.6-7-8.9V6l7-2.5Z" /><Path {...common} d="m8.8 12 2.1 2.1 4.4-4.5" /></>}
  </Svg>;
}

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const { draft, setDetails, setTicketAccess } = useGuestFlow();
  const [name, setName] = useState(draft?.details.name ?? '');
  const [ageRange, setAgeRange] = useState<GuestAgeRange | null>(draft?.details.ageRange ?? null);
  const [gender, setGender] = useState<GuestGender | null>(draft?.details.gender ?? null);
  const [showOptional, setShowOptional] = useState(Boolean(draft?.details.ageRange || draft?.details.gender));
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!draft?.serviceId) return <CustomerPage><CustomerState label="Primero completa la selección del servicio." action={() => router.replace('/')} /></CustomerPage>;

  const service = draft.catalog.services.find((item) => item.serviceId === draft.serviceId);
  const barber = selectedBarber(draft.catalog.barbers, draft.requestedBarberId ? { kind: 'named', barberId: draft.requestedBarberId } : { kind: 'any' });
  if (!service) return <CustomerPage><CustomerState label="El servicio ya no está disponible." action={() => router.replace('/(public)/service')} /></CustomerPage>;

  const currentDraft = draft;
  const selectedService = service;
  const duration = `${Math.ceil(selectedService.estimatedDurationSeconds / 60)} min`;
  const price = formatReferencePrice(selectedService.referencePriceCents);
  const barberPreference = barber?.name ?? 'Cualquier barbero compatible';

  async function confirm() {
    try {
      const details = normalizeGuestDetails({ name, ageRange, gender });
      setDetails(details);
      setIsCreating(true);
      setError(null);
      const access = await createGuestTicket({ companyCode: currentDraft.companyCode, serviceId: selectedService.serviceId, requestedBarberId: currentDraft.requestedBarberId, details });
      setTicketAccess(access);
      router.replace('/(public)/ticket');
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes('Guest name') ? 'Ingresa tu nombre para continuar.' : translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsCreating(false);
    }
  }

  return <View style={[styles.shell, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 126 + Math.max(insets.bottom, 16) }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver a elegir barbero" accessibilityRole="button" disabled={isCreating} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><DetailIcon name="arrow-left" /></Pressable>
        <View style={styles.step}><Text style={styles.stepText}>PASO 3 DE 3</Text></View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>VERIFICA TU TURNO</Text>
        <Text style={styles.title}>Casi listo</Text>
        <Text style={styles.subtitle}>Confirma tus datos para generar tu código de turno.</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}><View style={styles.summaryIcon}><DetailIcon color="#FFFFFF" name="calendar" /></View><View style={styles.summaryTitle}><Text style={styles.summaryLabel}>RESUMEN DE TU VISITA</Text><Text numberOfLines={1} style={styles.businessName}>{currentDraft.catalog.name}</Text></View><Pressable accessibilityLabel="Editar selección" accessibilityRole="button" disabled={isCreating} onPress={() => router.push('/(public)/barber')} style={styles.editButton}><DetailIcon name="edit" size={17} /><Text style={styles.editLabel}>Editar</Text></Pressable></View>
        <View style={styles.summaryFacts}>
          <View style={styles.summaryFact}><Text style={styles.factLabel}>SERVICIO</Text><Text style={styles.factValue}>{selectedService.name}</Text><Text style={styles.factDetail}>{duration}{price ? ` · ${price}` : ''}</Text></View>
          <View style={styles.factDivider} />
          <View style={styles.summaryFact}><Text style={styles.factLabel}>PREFERENCIA</Text><Text numberOfLines={2} style={styles.factValue}>{barberPreference}</Text></View>
        </View>
        <View style={styles.expectation}><DetailIcon name="clock" size={18} /><Text style={styles.expectationText}>{bookingExpectation(selectedService, barber)}</Text></View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.fieldHeading}><View style={styles.fieldIcon}><DetailIcon name="person" size={19} /></View><View><Text style={styles.fieldTitle}>¿Cómo te llamas?</Text><Text style={styles.fieldDetail}>Lo usaremos para identificar tu turno.</Text></View></View>
        <TextInput accessibilityLabel="Nombre" autoCapitalize="words" editable={!isCreating} maxLength={80} onChangeText={setName} placeholder="Escribe tu nombre" placeholderTextColor="#73808C" style={styles.input} value={name} />
      </View>

      <View style={styles.notice}><View style={styles.noticeIcon}><DetailIcon name="shield" size={18} /></View><Text style={styles.noticeText}>No necesitas crear una cuenta ni dejar tu teléfono. Recibirás un código de turno y te llamarán en pantalla o en el local.</Text></View>

      <View style={styles.optionalCard}>
        <Pressable accessibilityHint="Muestra u oculta las opciones de edad y género" accessibilityLabel="Datos opcionales" accessibilityRole="button" accessibilityState={{ expanded: showOptional }} disabled={isCreating} onPress={() => setShowOptional((visible) => !visible)} style={({ pressed }) => [styles.optionalTrigger, pressed && styles.pressed]}><View><Text style={styles.optionalTitle}>Datos opcionales</Text><Text style={styles.optionalDetail}>Edad y género son completamente opcionales.</Text></View><Text style={styles.optionalToggle}>{showOptional ? 'Ocultar' : 'Agregar'}</Text></Pressable>
        {showOptional && <View style={styles.optionalContent}>
          <Text style={styles.choiceLabel}>Rango de edad</Text>
          <View accessibilityRole="radiogroup" style={styles.ageChoices}>{GUEST_AGE_RANGES.map((value) => <Pressable accessibilityLabel={ageLabels[value]} accessibilityRole="radio" accessibilityState={{ selected: ageRange === value }} disabled={isCreating} key={value} onPress={() => setAgeRange(ageRange === value ? null : value)} style={[styles.ageChoice, ageRange === value && styles.choiceSelected]}><Text style={[styles.choiceText, ageRange === value && styles.choiceTextSelected]}>{ageLabels[value]}</Text></Pressable>)}</View>
          <Text style={[styles.choiceLabel, styles.genderLabel]}>Género</Text>
          <View accessibilityRole="radiogroup" style={styles.genderChoices}>{GUEST_GENDERS.map((value) => <Pressable accessibilityLabel={genderLabels[value]} accessibilityRole="radio" accessibilityState={{ selected: gender === value }} disabled={isCreating} key={value} onPress={() => setGender(gender === value ? null : value)} style={[styles.genderChoice, gender === value && styles.choiceSelected]}><View style={[styles.radio, gender === value && styles.radioSelected]}>{gender === value && <DetailIcon color="#FFFFFF" name="check" size={13} />}</View><Text style={[styles.choiceText, gender === value && styles.choiceTextSelected]}>{genderLabels[value]}</Text></Pressable>)}</View>
        </View>}
      </View>

      {error && <View accessibilityRole="alert" style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Text style={styles.errorDetail}>Revisa tus datos o la disponibilidad e inténtalo nuevamente.</Text></View>}
    </ScrollView>

    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <Pressable accessibilityLabel="Confirmar y obtener código de turno" accessibilityRole="button" accessibilityState={{ busy: isCreating }} disabled={isCreating} onPress={() => void confirm()} style={({ pressed }) => [styles.confirmButton, pressed && !isCreating && styles.pressed]}>{isCreating ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.confirmLabel}>Confirmar turno</Text><DetailIcon color="#FFFFFF" name="check" size={19} /></>}</Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F7F9FF', flex: 1 }, page: { gap: 16, paddingHorizontal: 20, paddingTop: 12 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, backButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE4F0', borderRadius: 12, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }, step: { backgroundColor: '#E8F0FF', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, stepText: { color: '#00686C', fontSize: 11, fontWeight: '800', letterSpacing: .8 }, titleBlock: { gap: 5, paddingVertical: 4 }, eyebrow: { color: '#0E8388', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: '#111D27', fontSize: 30, fontWeight: '800', letterSpacing: -.7, lineHeight: 36 }, subtitle: { color: '#52616E', fontSize: 15, lineHeight: 22 }, summaryCard: { backgroundColor: '#FFFFFF', borderColor: '#DCE4F0', borderRadius: 16, borderWidth: 1, gap: 16, padding: 16, shadowColor: '#15202B', shadowOffset: { height: 2, width: 0 }, shadowOpacity: .05, shadowRadius: 8 }, summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 }, summaryIcon: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 11, height: 40, justifyContent: 'center', width: 40 }, summaryTitle: { flex: 1, gap: 2 }, summaryLabel: { color: '#52616E', fontSize: 10, fontWeight: '800', letterSpacing: .8 }, businessName: { color: '#111D27', fontSize: 16, fontWeight: '800' }, editButton: { alignItems: 'center', flexDirection: 'row', gap: 4, padding: 4 }, editLabel: { color: '#00686C', fontSize: 13, fontWeight: '800' }, summaryFacts: { backgroundColor: '#EEF3FF', borderRadius: 12, flexDirection: 'row', padding: 13 }, summaryFact: { flex: 1, gap: 3 }, factDivider: { backgroundColor: '#D5E0F0', marginHorizontal: 12, width: 1 }, factLabel: { color: '#62717E', fontSize: 10, fontWeight: '800', letterSpacing: .7 }, factValue: { color: '#111D27', fontSize: 14, fontWeight: '800', lineHeight: 19 }, factDetail: { color: '#52616E', fontSize: 12, lineHeight: 17 }, expectation: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 }, expectationText: { color: '#52616E', flex: 1, fontSize: 13, lineHeight: 19 }, formCard: { backgroundColor: '#FFFFFF', borderColor: '#DCE4F0', borderRadius: 16, borderWidth: 1, gap: 14, padding: 16 }, fieldHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 }, fieldIcon: { alignItems: 'center', backgroundColor: '#E5F3F3', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 }, fieldTitle: { color: '#111D27', fontSize: 16, fontWeight: '800' }, fieldDetail: { color: '#62717E', fontSize: 13, marginTop: 2 }, input: { backgroundColor: '#F7F9FF', borderColor: '#B9CBDD', borderRadius: 12, borderWidth: 1, color: '#111D27', fontSize: 16, minHeight: 54, paddingHorizontal: 14 }, notice: { alignItems: 'flex-start', backgroundColor: '#E8F0FF', borderRadius: 12, flexDirection: 'row', gap: 10, padding: 13 }, noticeIcon: { paddingTop: 1 }, noticeText: { color: '#3F5262', flex: 1, fontSize: 13, lineHeight: 19 }, optionalCard: { backgroundColor: '#FFFFFF', borderColor: '#DCE4F0', borderRadius: 16, borderWidth: 1, overflow: 'hidden' }, optionalTrigger: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 16 }, optionalTitle: { color: '#111D27', fontSize: 15, fontWeight: '800' }, optionalDetail: { color: '#62717E', fontSize: 12, marginTop: 3 }, optionalToggle: { color: '#00686C', fontSize: 13, fontWeight: '800' }, optionalContent: { borderTopColor: '#E4EBF3', borderTopWidth: 1, gap: 10, padding: 16 }, choiceLabel: { color: '#52616E', fontSize: 12, fontWeight: '800' }, ageChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, ageChoice: { borderColor: '#C9D6E4', borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }, genderLabel: { marginTop: 5 }, genderChoices: { gap: 8 }, genderChoice: { alignItems: 'center', borderColor: '#DCE4F0', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 43, paddingHorizontal: 11 }, choiceSelected: { backgroundColor: '#E5F3F3', borderColor: '#00686C' }, radio: { alignItems: 'center', borderColor: '#AABAC9', borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: 'center', width: 20 }, radioSelected: { backgroundColor: '#00686C', borderColor: '#00686C' }, choiceText: { color: '#3F5262', fontSize: 13, fontWeight: '700' }, choiceTextSelected: { color: '#00686C' }, errorCard: { backgroundColor: '#FFF0EF', borderColor: '#F0B5B0', borderRadius: 12, borderWidth: 1, gap: 3, padding: 13 }, errorText: { color: '#9A3029', fontSize: 14, fontWeight: '800' }, errorDetail: { color: '#9A3029', fontSize: 13, lineHeight: 18 }, bottomBar: { backgroundColor: '#FFFFFF', borderTopColor: '#DCE4F0', borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12 }, confirmButton: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 54, paddingHorizontal: 16 }, confirmLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, pressed: { opacity: .8 },
});
