import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';
import {
  createManagedQueue,
  getBusinessConfiguration,
  getManagedQueues,
  updateBusinessConfiguration,
  updateManagedQueue,
  type ManagedQueue,
} from '@/features/business/business-configuration-api';

type QueueDraft = Omit<ManagedQueue, 'activeStations'> & { activeStations: string };

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ConfigurationScreen() {
  const { profile, isProfileLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [positionNotice, setPositionNotice] = useState('');
  const [graceMinutes, setGraceMinutes] = useState('');
  const [priorityEvery, setPriorityEvery] = useState('');
  const [queues, setQueues] = useState<QueueDraft[]>([]);
  const [newQueueName, setNewQueueName] = useState('');
  const [newQueuePrefix, setNewQueuePrefix] = useState('');
  const [newQueueStations, setNewQueueStations] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const businessId = profile?.businessId;

  const loadConfiguration = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      const [configuration, managedQueues] = await Promise.all([
        getBusinessConfiguration(businessId),
        getManagedQueues(businessId),
      ]);
      if (!configuration) {
        setError('No encontramos la configuración de tu empresa.');
        return;
      }
      setOpen(configuration.open);
      setPositionNotice(String(configuration.positionNotice));
      setGraceMinutes(String(configuration.graceMinutes));
      setPriorityEvery(String(configuration.priorityEvery));
      setQueues(managedQueues.map((queue) => ({ ...queue, activeStations: String(queue.activeStations) })));
      setError(null);
    } catch {
      setError('No pudimos cargar la configuración. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      void loadConfiguration();
    }, [loadConfiguration]),
  );

  if (!isProfileLoading && (profile?.role !== 'admin' || !businessId)) {
    return <Redirect href="/(app)" />;
  }

  function updateQueueDraft(id: string, patch: Partial<QueueDraft>) {
    setQueues((current) => current.map((queue) => queue.id === id ? { ...queue, ...patch } : queue));
  }

  async function handleSaveBusiness() {
    if (!businessId) return;
    const parsedPositionNotice = parsePositiveInteger(positionNotice);
    const parsedGraceMinutes = parsePositiveInteger(graceMinutes);
    const parsedPriorityEvery = parsePositiveInteger(priorityEvery);
    if (!parsedPositionNotice || !parsedGraceMinutes || !parsedPriorityEvery) {
      setError('Aviso de posiciones, minutos de gracia y frecuencia preferencial deben ser enteros positivos.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateBusinessConfiguration(businessId, {
        open,
        positionNotice: parsedPositionNotice,
        graceMinutes: parsedGraceMinutes,
        priorityEvery: parsedPriorityEvery,
      });
      setFeedback('La configuración de la empresa se guardó correctamente.');
    } catch {
      setError('No pudimos guardar la configuración de la empresa. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveQueue(queue: QueueDraft) {
    if (!businessId) return;
    const activeStations = parsePositiveInteger(queue.activeStations);
    const prefix = queue.prefix.trim();
    if (!queue.name.trim() || prefix.length < 1 || prefix.length > 3 || !activeStations) {
      setError('Cada fila necesita nombre, prefijo de 1 a 3 caracteres y puestos activos positivos.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateManagedQueue(businessId, { ...queue, prefix, activeStations });
      await loadConfiguration();
      setFeedback('La fila se guardó correctamente.');
    } catch {
      setError('No pudimos guardar la fila. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateQueue() {
    if (!businessId) return;
    const activeStations = parsePositiveInteger(newQueueStations);
    const prefix = newQueuePrefix.trim();
    if (!newQueueName.trim() || prefix.length < 1 || prefix.length > 3 || !activeStations) {
      setError('La nueva fila necesita nombre, prefijo de 1 a 3 caracteres y puestos activos positivos.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await createManagedQueue(businessId, { name: newQueueName, prefix, activeStations });
      setNewQueueName('');
      setNewQueuePrefix('');
      setNewQueueStations('1');
      await loadConfiguration();
      setFeedback('La fila se creó correctamente.');
    } catch {
      setError('No pudimos crear la fila. Verifica el nombre y el prefijo e intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">Configuración</ThemedText>
        {isLoading ? (
          <ThemedText type="small">Cargando configuración…</ThemedText>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <ThemedText type="smallBold">Empresa abierta</ThemedText>
                <Switch value={open} onValueChange={setOpen} disabled={isSaving} />
              </View>
              <AuthField label="Avisar cada posiciones" value={positionNotice} onChangeText={setPositionNotice} keyboardType="number-pad" />
              <AuthField label="Minutos de gracia" value={graceMinutes} onChangeText={setGraceMinutes} keyboardType="number-pad" />
              <AuthField label="Atender preferencial cada" value={priorityEvery} onChangeText={setPriorityEvery} keyboardType="number-pad" />
              <AuthButton label="Guardar configuración" onPress={() => void handleSaveBusiness()} disabled={isSaving} isLoading={isSaving} />
            </View>
            <View style={styles.section}>
              <ThemedText type="smallBold">Filas</ThemedText>
              {/* filas has no active flag and puestos_activos is constrained to positive integers. */}
              <ThemedText type="small">Las filas actuales no tienen un estado activo independiente: permanecen disponibles mientras tengan puestos activos positivos.</ThemedText>
              {queues.map((queue) => (
                <View key={queue.id} style={styles.queueCard}>
                  <AuthField label="Nombre" value={queue.name} onChangeText={(name) => updateQueueDraft(queue.id, { name })} />
                  <AuthField label="Prefijo (1 a 3 caracteres)" value={queue.prefix} onChangeText={(prefix) => updateQueueDraft(queue.id, { prefix })} autoCapitalize="characters" maxLength={3} />
                  <AuthField label="Puestos activos" value={queue.activeStations} onChangeText={(activeStations) => updateQueueDraft(queue.id, { activeStations })} keyboardType="number-pad" />
                  <AuthButton label="Guardar fila" onPress={() => void handleSaveQueue(queue)} disabled={isSaving} />
                </View>
              ))}
              <View style={styles.queueCard}>
                <ThemedText type="smallBold">Nueva fila</ThemedText>
                <AuthField label="Nombre" value={newQueueName} onChangeText={setNewQueueName} placeholder="Ej. Caja" />
                <AuthField label="Prefijo (1 a 3 caracteres)" value={newQueuePrefix} onChangeText={setNewQueuePrefix} placeholder="CAJ" autoCapitalize="characters" maxLength={3} />
                <AuthField label="Puestos activos" value={newQueueStations} onChangeText={setNewQueueStations} keyboardType="number-pad" />
                <AuthButton label="Crear fila" onPress={() => void handleCreateQueue()} disabled={isSaving} />
              </View>
            </View>
          </>
        )}
        <AuthErrorMessage message={error} />
        {feedback && <ThemedText type="small">{feedback}</ThemedText>}
        <AuthButton label="Volver al panel" onPress={() => router.replace('/(app)/admin')} disabled={isSaving} />
      </ScrollView>
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingVertical: 24 },
  section: { gap: 12 },
  switchRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  queueCard: { gap: 10, borderRadius: 8, backgroundColor: '#F8F9FA', padding: 12 },
});
