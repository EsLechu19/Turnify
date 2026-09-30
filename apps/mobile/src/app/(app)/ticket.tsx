import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
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
          <ThemedText type="title" style={styles.code}>{ticket.visibleCode}</ThemedText>
          <ThemedText type="smallBold">{statusLabels[ticket.status]}</ThemedText>
          <ThemedText type="small">Personas delante: {ticket.peopleAhead}</ThemedText>
          <ThemedText type="small">Espera estimada: {ticket.waitMinutes} min</ThemedText>
          {canCancel && (
            <AuthButton label="Cancelar turno" onPress={handleCancel} disabled={isCancelling} isLoading={isCancelling} />
          )}
          <AuthButton label="Actualizar" onPress={() => void refresh()} disabled={isCancelling} />
          <AuthButton label="Mis turnos" onPress={() => router.push('/(app)/history' as Href)} disabled={isCancelling} />
          <AuthButton label="Mi perfil" onPress={() => router.push('/(app)/profile' as Href)} disabled={isCancelling} />
        </View>
      )}
      {!ticket && !isLoading && <AuthButton label="Volver al inicio" onPress={() => router.replace('/(app)')} />}
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  code: { fontSize: 44, lineHeight: 52, letterSpacing: 1, textAlign: 'center' },
});
