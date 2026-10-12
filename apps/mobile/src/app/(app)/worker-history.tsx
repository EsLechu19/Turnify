import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { WorkerButton, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { getWorkerHistory, type WorkerHistoryEntry } from '@/features/queue/worker-barber-api';
import { getWorkerShops } from '@/features/worker/worker-membership-api';
import { filterWorkerHistoryByPeriod, formatHistoryDuration, formatHistoryTime, periodStart, summarizeWorkerHistory, type WorkerHistoryPeriod } from '@/features/queue/worker-history-stats';

const periodLabels: Record<WorkerHistoryPeriod, string> = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' };

function formatDayLabel(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short' }).format(value);
}

function formatRangeLabel(period: WorkerHistoryPeriod, now: Date): string {
  const start = periodStart(period, now);
  const rangeFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' });
  if (period === 'hoy') return rangeFormat.format(now);
  return `${rangeFormat.format(start)} – ${rangeFormat.format(now)}`;
}

export default function WorkerHistoryScreen() {
  const [entries, setEntries] = useState<WorkerHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<WorkerHistoryPeriod>('hoy');
  const [shopName, setShopName] = useState<string | null>(null);

  const load = useCallback(() => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      const now = Date.now();
      const iso = (offsetMinutes: number) => new Date(now - offsetMinutes * 60000).toISOString();
      setEntries([
        {
          ticketId: 'h1', visibleCode: 'A21', queueName: 'Cortes', serviceName: 'Corte clásico',
          state: 'finalizado', completedAt: iso(0), clientName: 'Cliente demo 1',
          startedAt: iso(25), finishedAt: iso(0), durationSeconds: 25 * 60,
        },
        {
          ticketId: 'h2', visibleCode: 'A22', queueName: 'Barba', serviceName: 'Perfilado de barba',
          state: 'ausente', completedAt: iso(10), clientName: 'Cliente demo 2',
          startedAt: null, finishedAt: null, durationSeconds: null,
        },
        {
          ticketId: 'h3', visibleCode: 'A23', queueName: 'Cortes', serviceName: 'Corte + barba',
          state: 'finalizado', completedAt: iso(60), clientName: 'Cliente demo 3',
          startedAt: iso(95), finishedAt: iso(60), durationSeconds: 35 * 60,
        },
      ]);
      setShopName('Barbería Demo');
      setError(null);
      return;
    }

    void getWorkerHistory().then((next) => {
      setEntries(next);
      setError(null);
    }).catch(() => setError('No pudimos cargar tu historial para la barbería seleccionada.'));
    void getWorkerShops().then((next) => {
      setShopName(next.find((shop) => shop.isCurrent)?.name ?? null);
    }).catch(() => setShopName(null));
  }, []);

  useFocusEffect(load);

  const now = new Date();
  const filteredEntries = filterWorkerHistoryByPeriod(entries, period, now);
  const summary = summarizeWorkerHistory(filteredEntries);
  const measuredCount = filteredEntries.filter((entry) => entry.state === 'finalizado' && typeof entry.durationSeconds === 'number' && Number.isFinite(entry.durationSeconds) && (entry.durationSeconds ?? 0) >= 0).length;
  const absentPct = summary.total === 0 ? 0 : Math.round((summary.absent / summary.total) * 100);
  const listTitle = period === 'hoy' ? 'Turnos de hoy' : period === 'semana' ? 'Turnos de la semana' : 'Turnos del mes';
  const grouped = new Map<string, WorkerHistoryEntry[]>();
  for (const entry of filteredEntries) {
    const key = period === 'hoy' ? 'hoy' : formatDayLabel(entry.completedAt);
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  return (
    <WorkerScreenContainer activeNavigation="history">
      <ScrollView contentContainerStyle={workerUiStyles.page}>
        <View style={styles.heading}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Historial de operación · {shopName ?? 'tu barbería'}</WorkerText>
          <WorkerText variant="title">Tu historial en esta barbería</WorkerText>
          <WorkerText color={workerColors.muted}>Solo tus atenciones personales aquí ({formatRangeLabel(period, now)}); la tienda completa vive en el panel web.</WorkerText>
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
          <MetricCard label={`AUSENTES · ${absentPct}%`} value={String(summary.absent)} tone={workerColors.error} />
          <MetricCard label={`PROMEDIO · ${measuredCount} MED.`} value={formatHistoryDuration(summary.averageDurationSeconds)} tone={workerColors.ink} />
        </View>

        <View style={workerUiStyles.card}>
          <View style={styles.listHeader}>
            <WorkerText variant="headline">{listTitle}</WorkerText>
            <WorkerPill label={`${filteredEntries.length} REGISTROS`} tone="neutral" />
          </View>
          {error ? (
            <View style={{ backgroundColor: workerColors.errorContainer, borderRadius: 12, gap: 8, padding: 12 }}>
              <WorkerText variant="label" color={workerColors.error}>{error}</WorkerText>
              <WorkerButton label="Reintentar" tone="secondary" onPress={() => load()} />
            </View>
          ) : filteredEntries.length === 0 ? (
            <View accessible accessibilityLabel="Sin registros en este periodo" style={styles.empty}>
              <WorkerText variant="headline">Sin registros en este periodo</WorkerText>
              <WorkerText color={workerColors.muted}>Trabajaste sin turnos finalizados ni ausentes aquí. Si esperabas ver más, revisa la barbería activa.</WorkerText>
            </View>
          ) : (
            [...grouped.entries()].map(([day, dayEntries]) => (
              <View key={day} style={styles.dayGroup}>
                {period !== 'hoy' ? <WorkerText variant="label" color={workerColors.teal}>{day}</WorkerText> : null}
                {dayEntries.map((entry) => (
                  <View key={entry.ticketId} style={styles.entry}>
                    <View style={[styles.code, { backgroundColor: entry.state === 'finalizado' ? workerColors.ink : workerColors.errorContainer }]}>
                      <WorkerText variant="label" color={entry.state === 'finalizado' ? '#FFFFFF' : workerColors.error}>{entry.visibleCode}</WorkerText>
                    </View>
                    <View style={styles.entryCopy}>
                      <WorkerText variant="headline">{entry.serviceName || entry.queueName}</WorkerText>
                      <WorkerText color={workerColors.muted}>{entry.clientName ?? 'Cliente'}</WorkerText>
                      <WorkerText variant="label" color={workerColors.body}>
                        {entry.state === 'finalizado' ? `Finalizado ${formatHistoryTime(entry.completedAt)} · ${formatHistoryDuration(entry.durationSeconds)}` : `Ausente ${formatHistoryTime(entry.completedAt)}`}
                      </WorkerText>
                    </View>
                    <WorkerPill label={entry.state === 'finalizado' ? 'COMPLETADO' : 'AUSENTE'} tone={entry.state === 'finalizado' ? 'teal' : 'error'} />
                  </View>
                ))}
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
  dayGroup: { gap: 8 },
  entry: { alignItems: 'center', borderTopColor: workerColors.outline, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 12 },
  code: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 46, paddingHorizontal: 8 },
  entryCopy: { flex: 1, gap: 2 },
});
