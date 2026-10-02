import { router } from 'expo-router';

import { ChoiceCard, CustomerButton, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { formatReferencePrice } from '@/features/queue/commercial-booking';

export default function ServiceScreen() {
  const { draft, chooseService } = useGuestFlow();
  if (!draft) return <CustomerPage><CustomerState label="Primero identifica una barbería." action={() => router.replace('/')} /></CustomerPage>;
  return <CustomerPage><CustomerHeading eyebrow="Paso 1 de 3" title="Elige tu servicio" detail={draft.catalog.name} />
    {draft.catalog.services.length === 0 && <CustomerState label="No hay servicios activos disponibles." />}
    {draft.catalog.services.map((service) => <ChoiceCard key={service.serviceId} title={service.name} selected={draft.serviceId === service.serviceId} onPress={() => chooseService(service.serviceId)} detail={`${Math.ceil(service.estimatedDurationSeconds / 60)} min${service.description ? ` · ${service.description}` : ''}${formatReferencePrice(service.referencePriceCents) ? ` · Referencia ${formatReferencePrice(service.referencePriceCents)}` : ''}`} />)}
    <CustomerButton label="Continuar" disabled={!draft.serviceId} onPress={() => router.push('/(public)/barber')} /><CustomerButton label="Volver" variant="secondary" onPress={() => router.back()} />
  </CustomerPage>;
}
