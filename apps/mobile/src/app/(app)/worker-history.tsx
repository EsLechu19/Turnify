import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { useTheme } from '@/hooks/use-theme';
import { getWorkerHistory, type WorkerHistoryEntry } from '@/features/queue/worker-barber-api';

export default function WorkerHistoryScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<WorkerHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { void getWorkerHistory().then((next) => { setEntries(next); setError(null); }).catch(() => setError('No pudimos cargar tu historial para la barbería seleccionada.')); }, []));
  return <WorkerScreenContainer activeNavigation="history"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View style={{ gap: 6 }}><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Mi actividad</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Historial</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Consulta tus atenciones cuando el historial esté disponible.</Text></View>
    {error ? <View style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={{ color: theme.textSecondary }}>{error}</Text></View> : entries.length === 0 ? <View accessible accessibilityLabel="No history entries" style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 12, marginTop: 8 }]}><Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>No completed services yet</Text><Text style={{ color: theme.textSecondary, lineHeight: 20 }}>Completed and absent tickets in this shop will appear here.</Text></View> : entries.map((entry) => <View key={entry.ticketId} style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>{entry.visibleCode}</Text><Text style={{ color: theme.textSecondary }}>{entry.serviceName || entry.queueName}</Text><Text style={{ color: theme.textSecondary }}>{entry.state === 'finalizado' ? 'Completed' : 'Absent'}</Text></View>)}
  </ScrollView></WorkerScreenContainer>;
}
