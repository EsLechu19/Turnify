import { ScrollView, Text, View } from 'react-native';

import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { useTheme } from '@/hooks/use-theme';

export default function WorkerHistoryScreen() {
  const theme = useTheme();
  return <WorkerScreenContainer activeNavigation="history"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Mi actividad</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Historial</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Consulta tus atenciones cuando el historial esté disponible.</Text></View>
    <View style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Aún no hay registros disponibles</Text><Text style={{ color: theme.textSecondary }}>La operación actual no expone un historial de atenciones por trabajador.</Text></View>
  </ScrollView></WorkerScreenContainer>;
}
