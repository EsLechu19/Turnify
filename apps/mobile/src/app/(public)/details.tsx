import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { GUEST_AGE_RANGES, GUEST_GENDERS, normalizeGuestDetails, type GuestAgeRange, type GuestGender } from '@/features/queue/guest-ticket-details';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { useTheme } from '@/hooks/use-theme';

const ageLabels: Record<GuestAgeRange, string> = { under_18: 'Menos de 18', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_plus': '45 o más' };
const genderLabels: Record<GuestGender, string> = { male: 'Hombre', female: 'Mujer', prefer_not_to_say: 'Prefiero no decirlo' };

export default function DetailsScreen() {
  const theme = useTheme(); const { draft, setDetails } = useGuestFlow();
  const [name, setName] = useState(draft?.details.name ?? ''); const [ageRange, setAgeRange] = useState<GuestAgeRange | null>(draft?.details.ageRange ?? null); const [gender, setGender] = useState<GuestGender | null>(draft?.details.gender ?? null); const [error, setError] = useState<string | null>(null);
  if (!draft?.serviceId) return <CustomerPage><CustomerState label="Primero completa la selección del servicio." action={() => router.replace('/')} /></CustomerPage>;
  function next() { try { setDetails(normalizeGuestDetails({ name, ageRange, gender })); router.push('/(public)/confirm'); } catch (reason) { setError(reason instanceof Error ? 'Ingresa tu nombre para continuar.' : 'No pudimos validar tus datos.'); } }
  const input = { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderRadius: 12, borderWidth: 1, color: theme.text, minHeight: 52, paddingHorizontal: 14 };
  return <CustomerPage><CustomerHeading eyebrow="Paso 3 de 3" title="Tus datos" detail="Solo necesitamos tu nombre. Los demás datos son opcionales." /><CustomerCard><Text style={{ color: theme.text, fontWeight: '700', marginBottom: 8 }}>Nombre</Text><TextInput accessibilityLabel="Nombre" autoCapitalize="words" maxLength={80} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={theme.textSecondary} style={input} value={name} /></CustomerCard><CustomerCard><Text style={{ color: theme.text, fontWeight: '700' }}>Rango de edad (opcional)</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{GUEST_AGE_RANGES.map((value) => <CustomerButton key={value} label={ageLabels[value]} variant={ageRange === value ? 'primary' : 'secondary'} onPress={() => setAgeRange(ageRange === value ? null : value)} />)}</View></CustomerCard><CustomerCard><Text style={{ color: theme.text, fontWeight: '700' }}>Género (opcional)</Text><View style={{ gap: 8, marginTop: 12 }}>{GUEST_GENDERS.map((value) => <CustomerButton key={value} label={genderLabels[value]} variant={gender === value ? 'primary' : 'secondary'} onPress={() => setGender(gender === value ? null : value)} />)}</View></CustomerCard>{error && <CustomerState label={error} />}<CustomerButton label="Revisar turno" onPress={next} /><CustomerButton label="Volver" variant="secondary" onPress={() => router.back()} /></CustomerPage>;
}
