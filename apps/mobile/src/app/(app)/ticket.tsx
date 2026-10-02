import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { AppCard, StatusBadge } from '@/components/ui/surface';
import { cancelTicket, translateQueueError } from '@/features/queue/queue-api';
import { useLiveTicket } from '@/features/queue/use-live-ticket';

const statusLabels = {
  en_espera: 'En espera',
  notificado: 'Notificado',
  llamado: 'Llamado',
  en_atencion: 'En atención',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
} as const;

export default function TicketScreen() {
  const { ticketId, queueId } = useLocalSearchParams<{ ticketId?: string; queueId?: string }>();
  const { ticket, error, isLoading, refresh } = useLiveTicket(ticketId, queueId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const canCancel = ticket?.status === 'en_espera' || ticket?.status === 'notificado';

  async function handleCancel() {
    if (!ticketId || !canCancel) return;
    setIsCancelling(true);
    setActionError(null);
    try {
      await cancelTicket(ticketId);
      router.replace('/(app)');
    } catch (reason) {
      setActionError(translateQueueError(reason instanceof Error ? reason.message : ''));
      void refresh();
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <AuthScreenContainer>
      <ThemedText type="subtitle">Mi turno</ThemedText>
      {isLoading && <ThemedText type="small">Actualizando tu turno…</ThemedText>}
      <AuthErrorMessage message={error ?? actionError} />
      {ticket && (
        <View style={styles.content}>
          <AppCard style={styles.ticketCard}>
            <ThemedText type="eyebrow" themeColor="primary">Tu código</ThemedText>
            <ThemedText type="title" style={styles.code}>{ticket.visibleCode}</ThemedText>
            <StatusBadge label={statusLabels[ticket.status]} tone={ticket.status === 'ausente' || ticket.status === 'cancelado' ? 'destructive' : 'primary'} />
            <View style={styles.details}>
              <ThemedText type="small">Personas delante</ThemedText>
              <ThemedText type="smallBold">{ticket.peopleAhead}</ThemedText>
              <ThemedText type="small">Espera estimada</ThemedText>
              <ThemedText type="smallBold">{ticket.waitMinutes} min</ThemedText>
            </View>
          </AppCard>
          {canCancel && (
            <AuthButton label="Cancelar turno" variant="destructive" onPress={handleCancel} disabled={isCancelling} isLoading={isCancelling} />
          )}
          <AuthButton label="Actualizar" variant="secondary" onPress={() => void refresh()} disabled={isCancelling} />
          <AuthButton label="Mis turnos" variant="secondary" onPress={() => router.push('/(app)/history' as Href)} disabled={isCancelling} />
          <AuthButton label="Mi perfil" variant="secondary" onPress={() => router.push('/(app)/profile' as Href)} disabled={isCancelling} />
        </View>
      )}
      {!ticket && !isLoading && <AuthButton label="Volver al inicio" onPress={() => router.replace('/(app)')} />}
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  ticketCard: { alignItems: 'center', paddingVertical: 24 },
  code: { fontSize: 52, lineHeight: 58, letterSpacing: 1, textAlign: 'center' },
  details: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between', marginTop: 8 },
});
