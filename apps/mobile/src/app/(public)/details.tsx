import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { bookingExpectation, selectedBarber } from '@/features/queue/commercial-booking';
import { GUEST_AGE_RANGES, GUEST_GENDERS, normalizeGuestDetails, type GuestAgeRange, type GuestGender } from '@/features/queue/guest-ticket-details';
import { createGuestTicket } from '@/features/queue/public-guest-ticket-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { translateQueueError } from '@/features/queue/queue-api';
import { useTheme } from '@/hooks/use-theme';

const ageLabels: Record<GuestAgeRange, string> = { under_18: 'Menos de 18', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_plus': '45 o más' };
const genderLabels: Record<GuestGender, string> = { male: 'Hombre', female: 'Mujer', prefer_not_to_say: 'Prefiero no decirlo' };

export default function DetailsScreen() {
  const theme = useTheme(); const { draft, setDetails, setTicketAccess } = useGuestFlow();
  const [name, setName] = useState(draft?.details.name ?? ''); const [ageRange, setAgeRange] = useState<GuestAgeRange | null>(draft?.details.ageRange ?? null); const [gender, setGender] = useState<GuestGender | null>(draft?.details.gender ?? null); const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  if (!draft?.serviceId) return <CustomerPage><CustomerState label="Primero completa la selección del servicio." action={() => router.replace('/')} /></CustomerPage>;
  const service = draft.catalog.services.find((item) => item.serviceId === draft.serviceId);
  const barber = selectedBarber(draft.catalog.barbers, draft.requestedBarberId ? { kind: 'named', barberId: draft.requestedBarberId } : { kind: 'any' });
  if (!service) return <CustomerPage><CustomerState label="El servicio ya no está disponible." action={() => router.replace('/(public)/service')} /></CustomerPage>;
  const currentDraft = draft;
  const selectedService = service;
  async function confirm() {
    try {
      const details = normalizeGuestDetails({ name, ageRange, gender });
      setDetails(details); setIsCreating(true); setError(null);
      const access = await createGuestTicket({ companyCode: currentDraft.companyCode, serviceId: selectedService.serviceId, requestedBarberId: currentDraft.requestedBarberId, details });
      setTicketAccess(access); router.replace('/(public)/ticket');
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes('Guest name') ? 'Ingresa tu nombre para continuar.' : translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally { setIsCreating(false); }
  }
  const input = { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderRadius: 12, borderWidth: 1, color: theme.text, minHeight: 52, paddingHorizontal: 14 };
  return <CustomerPage><CustomerHeading eyebrow="Paso 3 de 3 · Confirmación" title="Confirma tu turno" detail="Tu nombre es obligatorio. Edad y género son opcionales." /><CustomerCard><Text style={{ color: theme.text, fontWeight: '700', marginBottom: 8 }}>Nombre</Text><TextInput accessibilityLabel="Nombre" autoCapitalize="words" editable={!isCreating} maxLength={80} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={theme.textSecondary} style={input} value={name} /></CustomerCard><CustomerCard><Text style={{ color: theme.text, fontWeight: '700' }}>Rango de edad (opcional)</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{GUEST_AGE_RANGES.map((value) => <CustomerButton key={value} label={ageLabels[value]} variant={ageRange === value ? 'primary' : 'secondary'} disabled={isCreating} onPress={() => setAgeRange(ageRange === value ? null : value)} />)}</View></CustomerCard><CustomerCard><Text style={{ color: theme.text, fontWeight: '700' }}>Género (opcional)</Text><View style={{ gap: 8, marginTop: 12 }}>{GUEST_GENDERS.map((value) => <CustomerButton key={value} label={genderLabels[value]} variant={gender === value ? 'primary' : 'secondary'} disabled={isCreating} onPress={() => setGender(gender === value ? null : value)} />)}</View></CustomerCard><CustomerCard><Text style={{ color: theme.text, fontWeight: '700' }}>{currentDraft.catalog.name}</Text><Text style={{ color: theme.textSecondary, marginTop: 8 }}>Servicio · {selectedService.name}</Text><Text style={{ color: theme.textSecondary, marginTop: 4 }}>Preferencia · {barber?.name ?? 'Cualquier barbero disponible'}</Text><Text style={{ color: theme.textSecondary, marginTop: 8 }}>{bookingExpectation(selectedService, barber)}</Text><Text style={{ color: theme.textSecondary, marginTop: 8 }}>No se solicitará pago ni se creará una cuenta.</Text></CustomerCard>{error && <CustomerState label={error} detail="Revisa tus datos o la disponibilidad e inténtalo de nuevo." />}<CustomerButton label="Confirmar turno" disabled={isCreating} loading={isCreating} onPress={() => void confirm()} /><CustomerButton label="Volver" variant="secondary" disabled={isCreating} onPress={() => router.back()} /></CustomerPage>;
}
