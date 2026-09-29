import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import {
  getBusinessSummary,
  normalizeBusinessCode,
  takeTurn,
  translateQueueError,
  type BusinessSummary,
} from '@/features/queue/queue-api';

export default function PreviewScreen() {
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const code = normalizeBusinessCode(rawCode ?? '');
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTakingTurn, setIsTakingTurn] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('El código de empresa no es válido.');
      setIsLoading(false);
      return;
    }

    let isActive = true;
    void getBusinessSummary(code)
      .then((nextSummary) => {
        if (!isActive) return;
        setSummary(nextSummary);
        setSelectedQueueId(nextSummary.queues[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (isActive) setError(translateQueueError(reason instanceof Error ? reason.message : ''));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [code]);

  async function handleTakeTurn() {
    if (!code || !selectedQueueId) return;
    setIsTakingTurn(true);
    setError(null);
    try {
      const ticket = await takeTurn(code, selectedQueueId);
      router.replace({ pathname: '/(app)/ticket', params: { ticketId: ticket.id, queueId: ticket.queueId } });
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsTakingTurn(false);
    }
  }

  return (
    <AuthScreenContainer>
      <ThemedText type="subtitle">Vista previa</ThemedText>
      {isLoading && <ThemedText type="small">Consultando filas…</ThemedText>}
      <AuthErrorMessage message={error} />
      {summary && (
        <View style={styles.content}>
          <ThemedText type="smallBold">{summary.name}</ThemedText>
          <ThemedText type="small">{summary.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}</ThemedText>
          {summary.queues.map((queue) => (
            <AuthButton
              key={queue.id}
              label={`${selectedQueueId === queue.id ? '✓ ' : ''}${queue.name}: ${queue.waiting} en espera · ${queue.waitMinutes} min`}
              onPress={() => setSelectedQueueId(queue.id)}
              disabled={isTakingTurn || !summary.isOpen}
            />
          ))}
          {summary.queues.length === 0 && <ThemedText type="small">No hay filas disponibles.</ThemedText>}
          <AuthButton
            label="Confirmar turno"
            onPress={handleTakeTurn}
            disabled={!summary.isOpen || !selectedQueueId || isTakingTurn}
            isLoading={isTakingTurn}
          />
        </View>
      )}
      <AuthButton label="Volver" onPress={() => router.back()} disabled={isTakingTurn} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});
