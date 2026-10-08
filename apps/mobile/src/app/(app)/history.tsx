import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { CustomerButton, CustomerHeading, CustomerPage, CustomerState, HistoryItem } from '@/components/customer/customer-ui';
import { useAuth } from '@/features/auth/use-auth';
import { getCustomerTicketHistory, type TicketHistoryItem } from '@/features/customer/customer-api';

export default function HistoryScreen() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<TicketHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setTickets([
        { id: 'demo-1', visibleCode: 'A24', status: 'finalizado', operatingDate: '2026-10-07', origin: 'app', createdAt: '2026-10-07T16:30:00.000Z', serviceName: 'Corte clásico' },
        { id: 'demo-2', visibleCode: 'A18', status: 'ausente', operatingDate: '2026-10-05', origin: 'presencial', createdAt: '2026-10-05T21:20:00.000Z', serviceName: 'Perfilado de barba' },
        { id: 'demo-3', visibleCode: 'A09', status: 'finalizado', operatingDate: '2026-09-28', origin: 'app', createdAt: '2026-09-28T14:15:00.000Z', serviceName: 'Corte + barba' },
      ]);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!session?.user.id) return;
    setIsLoading(true);
    try {
      setTickets(await getCustomerTicketHistory(session.user.id));
      setError(null);
    } catch {
      setError('No pudimos cargar tu historial. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <CustomerScreenContainer activeNavigation="history">
      <CustomerPage>
        <CustomerHeading eyebrow="Tu actividad" title="Mis turnos" detail="Consulta tus turnos pasados y actuales." />
        {isLoading ? <CustomerState label="Cargando historial…" isLoading /> : null}
        {error ? <CustomerState label={error} action={() => void load()} /> : null}
        {!isLoading && !error && tickets.length === 0 ? (
          <CustomerState label="Todavía no tienes turnos" detail="Cuando solicites un turno, aparecerá aquí." action={() => router.push('/(public)/scan')} />
        ) : null}
        {!isLoading && !error ? tickets.map((ticket) => (
          <HistoryItem
            key={ticket.id}
            code={ticket.visibleCode}
            dateLabel={`${ticket.operatingDate} · ${ticket.origin === 'app' ? 'App' : 'Presencial'}`}
            serviceName={ticket.serviceName}
            status={ticket.status}
          />
        )) : null}
        <CustomerButton label="Volver al inicio" variant="secondary" onPress={() => router.replace('/(app)')} />
      </CustomerPage>
    </CustomerScreenContainer>
  );
}
