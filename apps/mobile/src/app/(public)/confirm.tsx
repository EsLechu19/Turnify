import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { selectedBarber } from '@/features/queue/commercial-booking';
import { createGuestTicket } from '@/features/queue/public-guest-ticket-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { translateQueueError } from '@/features/queue/queue-api';
import { useTheme } from '@/hooks/use-theme';

export default function ConfirmScreen() {
  const theme = useTheme(); const { draft, setTicketAccess } = useGuestFlow(); const [error, setError] = useState<string | null>(null); const [isCreating, setIsCreating] = useState(false);
  if (!draft?.serviceId || !draft.details.name) return <CustomerPage><CustomerState label="Completa tus datos antes de confirmar." action={() => router.replace('/(public)/details')} /></CustomerPage>;
  const currentDraft = draft; const service = currentDraft.catalog.services.find((item) => item.serviceId === currentDraft.serviceId); const barber = selectedBarber(currentDraft.catalog.barbers, currentDraft.requestedBarberId ? { kind: 'named', barberId: currentDraft.requestedBarberId } : { kind: 'any' });
  if (!service) return <CustomerPage><CustomerState label="El servicio ya no está disponible." action={() => router.replace('/(public)/service')} /></CustomerPage>;
  const selectedService = service;
  async function confirm() { setIsCreating(true); setError(null); try { const access = await createGuestTicket({ companyCode: currentDraft.companyCode, serviceId: selectedService.serviceId, requestedBarberId: currentDraft.requestedBarberId, details: currentDraft.details }); setTicketAccess(access); router.replace('/(public)/ticket'); } catch (reason) { setError(translateQueueError(reason instanceof Error ? reason.message : '')); } finally { setIsCreating(false); } }
  return <CustomerPage><CustomerHeading eyebrow="Confirma tu turno" title="Todo listo para unirte a la fila" detail="No se solicitará pago ni se creará una cuenta." /><CustomerCard><Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{currentDraft.catalog.name}</Text><Text style={{ color: theme.textSecondary, marginTop: 8 }}>Servicio · {selectedService.name}</Text><Text style={{ color: theme.textSecondary, marginTop: 4 }}>Preferencia · {barber?.name ?? 'Cualquier barbero disponible'}</Text><Text style={{ color: theme.textSecondary, marginTop: 4 }}>Nombre · {currentDraft.details.name}</Text></CustomerCard>{error && <CustomerState label={error} detail="Revisa la disponibilidad e inténtalo de nuevo." />}<CustomerButton label="Confirmar turno" disabled={isCreating} loading={isCreating} onPress={() => void confirm()} /><CustomerButton label="Volver" variant="secondary" disabled={isCreating} onPress={() => router.back()} /></CustomerPage>;
}
