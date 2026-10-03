import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { useTheme } from '@/hooks/use-theme';
import { getWorkerHistory, type WorkerHistoryEntry } from '@/features/queue/worker-barber-api';

export default function WorkerHistoryScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<WorkerHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { void getWorkerHistory().then((next) => { setEntries(next); setError(null); }).catch(() => setError('No pudimos cargar tu historial para la barbería seleccionada.')); }, []));
  const completed = entries.filter((entry) => entry.state === 'finalizado').length;
  return <WorkerScreenContainer activeNavigation="history"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View style={styles.heading}><Text style={[workerScreenStyles.eyebrow, { color: '#0D7A75' }]}>Rendimiento</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Mi historial</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Atenciones registradas en tu barbería seleccionada.</Text></View>
    <View style={styles.metrics}><View style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={[styles.metricLabel, { color: theme.textSecondary }]}>ATENDIDOS</Text><Text style={[styles.metricValue, { color: theme.text }]}>{completed}</Text></View><View style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={[styles.metricLabel, { color: theme.textSecondary }]}>REGISTROS</Text><Text style={[styles.metricValue, { color: theme.text }]}>{entries.length}</Text></View></View>
    <Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>Turnos recientes</Text>
    {error ? <View style={[workerScreenStyles.card, { backgroundColor: theme.destructiveMuted, borderColor: theme.destructive }]}><Text style={{ color: theme.destructive }}>{error}</Text></View> : entries.length === 0 ? <View accessible accessibilityLabel="Sin registros de historial" style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 12 }]}><Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>Aún no hay atenciones</Text><Text style={{ color: theme.textSecondary, lineHeight: 20 }}>Los turnos finalizados o ausentes aparecerán aquí.</Text></View> : entries.map((entry) => <View key={entry.ticketId} style={[workerScreenStyles.card, styles.entry, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><View style={[styles.code, { backgroundColor: entry.state === 'finalizado' ? '#0E1E2E' : '#FBEAE5' }]}><Text style={{ color: entry.state === 'finalizado' ? '#FFFFFF' : '#C85A3B', fontWeight: '700' }}>{entry.visibleCode}</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>{entry.serviceName || entry.queueName}</Text><Text style={{ color: entry.state === 'finalizado' ? '#0D7A75' : '#C85A3B', fontWeight: '700' }}>{entry.state === 'finalizado' ? 'Completado' : 'Ausente'}</Text></View></View>)}
  </ScrollView></WorkerScreenContainer>;
}

const styles = StyleSheet.create({ heading: { gap: 6 }, metrics: { flexDirection: 'row', gap: 12 }, metric: { borderRadius: 8, borderWidth: 1, flex: 1, gap: 4, padding: 14 }, metricLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 }, metricValue: { fontSize: 32, fontWeight: '700' }, entry: { alignItems: 'center', flexDirection: 'row' }, code: { alignItems: 'center', borderRadius: 8, height: 42, justifyContent: 'center', marginRight: 12, width: 48 } });
