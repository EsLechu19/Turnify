import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AuthButton, AuthErrorMessage } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { createMyWalkInTicket, getWorkerQueues } from '@/features/queue/worker-barber-api';
import { useTheme } from '@/hooks/use-theme';

export default function WorkerWalkInScreen() {
  const theme = useTheme(); const [queues, setQueues] = useState<Array<{ queueId: string; name: string }>>([]); const [queueId, setQueueId] = useState<string | null>(null); const [name, setName] = useState(''); const [notice, setNotice] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const load = useCallback(() => { void getWorkerQueues().then((next) => { setQueues(next); setQueueId((current) => current && next.some((queue) => queue.queueId === current) ? current : next[0]?.queueId ?? null); }).catch(() => setError('No pudimos cargar las filas de la barbería seleccionada.')); }, []);
  useFocusEffect(load);
  async function submit() { if (!queueId) return; setLoading(true); setError(null); try { setNotice(`Turno creado: ${await createMyWalkInTicket(queueId, name)}`); setName(''); } catch { setError('No pudimos crear el turno presencial. Verifica la barbería seleccionada e intenta nuevamente.'); } finally { setLoading(false); } }
  return <WorkerScreenContainer activeNavigation="live"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled"><View style={{ gap: 6 }}><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Walk-in</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Add walk-in client</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Create a real queue ticket for your selected shop.</Text></View><View style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><Text style={[workerScreenStyles.sectionTitle, { color: theme.text }]}>Queue</Text>{queues.map((queue) => <AuthButton key={queue.queueId} label={queue.queueId === queueId ? `${queue.name} (selected)` : queue.name} variant="secondary" onPress={() => setQueueId(queue.queueId)} />)}<AuthField label="Client reference" value={name} onChangeText={setName} placeholder="Optional name" editable={!loading} /><AuthButton label="Add to queue" onPress={() => void submit()} disabled={!queueId || loading} isLoading={loading} />{notice && <Text accessibilityRole="alert" style={{ color: theme.primary, fontWeight: '700' }}>{notice}</Text>}</View><AuthErrorMessage message={error} /><AuthButton label="Back to live queue" variant="secondary" onPress={() => router.replace('/(app)/worker')} /></ScrollView></WorkerScreenContainer>;
}
