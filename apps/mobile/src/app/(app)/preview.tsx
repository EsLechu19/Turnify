import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { AppCard, StatusBadge } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';
import {
  getBusinessSummary,
  normalizeBusinessCode,
  takeTurn,
  translateQueueError,
  type BusinessSummary,
} from '@/features/queue/queue-api';

export default function PreviewScreen() {
  const theme = useTheme();
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
      <ThemedText type="eyebrow" themeColor="primary">Turnify</ThemedText>
      <ThemedText type="subtitle">Elige tu fila</ThemedText>
      {isLoading && <ThemedText type="small">Consultando filas…</ThemedText>}
      <AuthErrorMessage message={error} />
      {summary && (
        <View style={styles.content}>
          <AppCard>
            <ThemedText type="smallBold">{summary.name}</ThemedText>
            <StatusBadge label={summary.isOpen ? 'Abierto ahora' : 'Cerrado ahora'} tone={summary.isOpen ? 'success' : 'destructive'} />
          </AppCard>
          {summary.queues.map((queue) => (
            <Pressable
              key={queue.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedQueueId === queue.id }}
              onPress={() => setSelectedQueueId(queue.id)}
              disabled={isTakingTurn || !summary.isOpen}
              style={({ pressed }) => [
                styles.queueCard,
                { backgroundColor: theme.backgroundElement, borderColor: selectedQueueId === queue.id ? theme.primary : theme.border, opacity: pressed ? 0.86 : 1 },
              ]}>
              <View style={styles.queueRow}>
                <ThemedText type="smallBold">{queue.name}</ThemedText>
                {selectedQueueId === queue.id && <StatusBadge label="Seleccionada" tone="primary" />}
              </View>
              <ThemedText type="small">{queue.waiting} en espera · {queue.waitMinutes} min estimados</ThemedText>
            </Pressable>
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
      <AuthButton label="Volver" variant="secondary" onPress={() => router.back()} disabled={isTakingTurn} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  queueCard: { borderWidth: 1, borderRadius: 20, gap: 8, minHeight: 88, padding: 16 },
  queueRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
