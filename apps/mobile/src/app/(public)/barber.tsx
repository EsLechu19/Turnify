import { router } from 'expo-router';

import { ChoiceCard, CustomerButton, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { compatibleBarbers } from '@/features/queue/commercial-booking';
import { useGuestFlow } from '@/features/public/guest-flow-session';

export default function BarberScreen() {
  const { draft, chooseBarber } = useGuestFlow();
  if (!draft?.serviceId) return <CustomerPage><CustomerState label="Primero elige un servicio." action={() => router.replace('/(public)/service')} /></CustomerPage>;
  const barbers = compatibleBarbers(draft.catalog, draft.serviceId);
  return <CustomerPage><CustomerHeading eyebrow="Paso 2 de 3" title="Elige tu barbero" detail="Puedes elegir una preferencia o dejar que asignemos uno compatible." />
    <ChoiceCard title="Cualquier barbero disponible" badge="Menor espera" selected={draft.requestedBarberId === null} onPress={() => chooseBarber(null)} detail="Se asignará un barbero compatible cuando llamen tu turno." />
    {barbers.map((barber) => <ChoiceCard key={barber.barberId} title={barber.name} selected={draft.requestedBarberId === barber.barberId} onPress={() => chooseBarber(barber.barberId)} detail={barber.operationalState === 'ocupado' ? 'Está atendiendo; puedes elegirlo y esperar su disponibilidad.' : 'Está en turno y es compatible con este servicio.'} />)}
    {barbers.length === 0 && <CustomerState label="No hay barberos compatibles en turno." />}
    <CustomerButton label="Continuar" disabled={barbers.length === 0} onPress={() => router.push('/(public)/details')} /><CustomerButton label="Volver" variant="secondary" onPress={() => router.back()} />
  </CustomerPage>;
}
