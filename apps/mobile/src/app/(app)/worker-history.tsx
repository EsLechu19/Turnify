import { ScrollView, Text, View } from 'react-native';

import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { useTheme } from '@/hooks/use-theme';

export default function WorkerHistoryScreen() {
  const theme = useTheme();
  return <WorkerScreenContainer activeNavigation="history"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View style={{ gap: 6 }}><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Mi actividad</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Historial</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Consulta tus atenciones cuando el historial esté disponible.</Text></View>
    <View accessible accessibilityLabel="Historial no disponible" style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 12, marginTop: 8 }]}><Text style={[workerScreenStyles.eyebrow, { color: theme.textSecondary }]}>SIN DATOS DISPONIBLES</Text><Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>Aún no hay registros disponibles</Text><Text style={{ color: theme.textSecondary, lineHeight: 20 }}>La operación actual no expone un historial de atenciones por trabajador. No mostramos métricas ni clientes que el sistema no proporciona.</Text></View>
  </ScrollView></WorkerScreenContainer>;
}
