import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { AuthButton, AuthErrorMessage } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { getCustomerTicketHistory, type TicketHistoryItem, type TicketStatus } from '@/features/customer/customer-api';
import { useAuth } from '@/features/auth/use-auth';

const statusLabels: Record<TicketStatus, string> = {
  en_espera: 'En espera',
  notificado: 'Notificado',
  llamado: 'Llamado',
  en_atencion: 'En atención',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
};

const originLabels = { app: 'App', presencial: 'Presencial' } as const;

export default function HistoryScreen() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<TicketHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    const customerId = session?.user.id;
    if (!customerId) return;

    setIsLoading(true);
    try {
      setTickets(await getCustomerTicketHistory(customerId));
      setError(null);
    } catch {
      setError('No pudimos cargar tu historial. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  return (
    <CustomerScreenContainer activeNavigation="history">
      <ThemedText type="subtitle">Mis turnos</ThemedText>
      {isLoading && <ThemedText type="small">Cargando historial…</ThemedText>}
      <AuthErrorMessage message={error} />
      {!isLoading && !error && tickets.length === 0 && (
        <ThemedText type="small">Todavía no tienes turnos registrados.</ThemedText>
      )}
      <View style={styles.list}>
        {tickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticket}>
            <ThemedText type="smallBold">{ticket.visibleCode}</ThemedText>
            <ThemedText type="small">{statusLabels[ticket.status]}</ThemedText>
            <ThemedText type="small">Fecha operativa: {ticket.operatingDate}</ThemedText>
            <ThemedText type="small">Origen: {originLabels[ticket.origin]}</ThemedText>
          </View>
        ))}
      </View>
      {error && <AuthButton label="Reintentar" onPress={() => void loadHistory()} />}
      <AuthButton label="Volver al inicio" onPress={() => router.replace('/(app)')} />
    </CustomerScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  ticket: { gap: 4, padding: 12, borderWidth: 1, borderColor: '#D0D7DE', borderRadius: 8 },
});
