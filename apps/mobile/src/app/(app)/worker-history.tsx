import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { getWorkerHistory, type WorkerHistoryEntry } from '@/features/queue/worker-barber-api';
import { filterWorkerHistoryByPeriod, formatHistoryDuration, formatHistoryTime, summarizeWorkerHistory, type WorkerHistoryPeriod } from '@/features/queue/worker-history-stats';

const periodLabels: Record<WorkerHistoryPeriod, string> = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' };

export default function WorkerHistoryScreen() {
  const [entries, setEntries] = useState<WorkerHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<WorkerHistoryPeriod>('hoy');

  useFocusEffect(useCallback(() => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      const now = Date.now();
      setEntries([
        { ticketId: 'h1', visibleCode: 'A21', queueName: 'Cortes', serviceName: 'Corte clásico', state: 'finalizado', completedAt: new Date(now).toISOString(), clientName: 'Carlos Méndez', startedAt: new Date(now - 25 * 60000).toISOString(), finishedAt: new Date(now).toISOString(), durationSeconds: 25 * 60 },
        { ticketId: 'h2', visibleCode: 'A22', queueName: 'Barba', serviceName: 'Perfilado de barba', state: 'ausente', completedAt: new Date(now - 10 * 60000).toISOString(), clientName: 'Ana Torres', startedAt: null, finishedAt: null, durationSeconds: null },
        { ticketId: 'h3', visibleCode: 'A23', queueName: 'Cortes', serviceName: 'Corte + barba', state: 'finalizado', completedAt: new Date(now - 60 * 60000).toISOString(), clientName: 'Luis Ramírez', startedAt: new Date(now - 95 * 60000).toISOString(), finishedAt: new Date(now - 60 * 60000).toISOString(), durationSeconds: 35 * 60 },
      ]);
      setError(null);
      return;
    }

    void getWorkerHistory().then((next) => {
      setEntries(next);
      setError(null);
    }).catch(() => setError('No pudimos cargar tu historial para la barbería seleccionada.'));
  }, []));

  const filteredEntries = filterWorkerHistoryByPeriod(entries, period, new Date());
  const summary = summarizeWorkerHistory(filteredEntries);
  const listTitle = period === 'hoy' ? 'Turnos de hoy' : period === 'semana' ? 'Turnos de la semana' : 'Turnos del mes';

  return (
    <WorkerScreenContainer activeNavigation="history">
      <ScrollView contentContainerStyle={workerUiStyles.page}>
        <View style={styles.heading}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Historial de operación</WorkerText>
          <WorkerText variant="title">Mi historial</WorkerText>
          <WorkerText color={workerColors.muted}>Consulta tus atenciones anteriores en la barbería seleccionada.</WorkerText>
        </View>

        <View style={[workerUiStyles.card, styles.filterCard]}>
          <WorkerText variant="label">Periodo</WorkerText>
          <View style={styles.chips}>
            {(Object.keys(periodLabels) as WorkerHistoryPeriod[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: period === key }}
                onPress={() => setPeriod(key)}
                style={[styles.chip, period === key ? styles.chipSelected : null]}
              >
                <WorkerText variant="label" color={period === key ? '#FFFFFF' : workerColors.body}>{periodLabels[key]}</WorkerText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.metrics}>
          <MetricCard label="ATENDIDOS" value={String(summary.attended)} tone={workerColors.teal} />
          <MetricCard label="DURACIÓN PROMEDIO" value={formatHistoryDuration(summary.averageDurationSeconds)} tone={workerColors.ink} />
        </View>

        <View style={workerUiStyles.card}>
          <View style={styles.listHeader}>
            <WorkerText variant="headline">{listTitle}</WorkerText>
            <WorkerPill label={`${filteredEntries.length} REGISTROS`} tone="neutral" />
          </View>
          {error ? (
            <View style={{ backgroundColor: workerColors.errorContainer, borderRadius: 12, padding: 12 }}>
              <WorkerText variant="label" color={workerColors.error}>{error}</WorkerText>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View accessible accessibilityLabel="Sin registros en este periodo" style={styles.empty}>
              <WorkerText variant="headline">No hay registros</WorkerText>
              <WorkerText color={workerColors.muted}>Los turnos completados o ausentes de este periodo aparecerán aquí.</WorkerText>
            </View>
          ) : (
            filteredEntries.map((entry) => (
              <View key={entry.ticketId} style={styles.entry}>
                <View style={[styles.code, { backgroundColor: entry.state === 'finalizado' ? workerColors.ink : workerColors.errorContainer }]}>
                  <WorkerText variant="label" color={entry.state === 'finalizado' ? '#FFFFFF' : workerColors.error}>{entry.visibleCode}</WorkerText>
                </View>
                <View style={styles.entryCopy}>
                  <WorkerText variant="headline">{entry.serviceName || entry.queueName}</WorkerText>
                  <WorkerText color={workerColors.muted}>{entry.clientName ?? 'Cliente'}</WorkerText>
                  <WorkerText variant="label" color={workerColors.muted}>
                    {entry.state === 'finalizado' ? `Finalizado ${formatHistoryTime(entry.completedAt)}` : `Ausente ${formatHistoryTime(entry.completedAt)}`} · {formatHistoryDuration(entry.durationSeconds)}
                  </WorkerText>
                </View>
                <WorkerPill label={entry.state === 'finalizado' ? 'COMPLETADO' : 'AUSENTE'} tone={entry.state === 'finalizado' ? 'teal' : 'error'} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </WorkerScreenContainer>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={[workerUiStyles.card, styles.metricCard]}>
      <WorkerText variant="eyebrow" color={workerColors.muted}>{label}</WorkerText>
      <WorkerText variant="metric" color={tone}>{value}</WorkerText>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  filterCard: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: workerColors.low, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipSelected: { backgroundColor: workerColors.teal },
  metrics: { flexDirection: 'row', gap: 8 },
  metricCard: { flex: 1, gap: 4, padding: 12 },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  empty: { gap: 8 },
  entry: { alignItems: 'center', borderTopColor: workerColors.outline, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 12 },
  code: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 46, paddingHorizontal: 8 },
  entryCopy: { flex: 1, gap: 2 },
});
