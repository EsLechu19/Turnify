import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { WorkerButton, WorkerIcon, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { formatReferencePrice } from '@/features/queue/commercial-booking';
import { createMyWalkInTicket, getWorkerWalkInOptions, type WorkerWalkInBarberOption, type WorkerWalkInServiceOption } from '@/features/queue/worker-barber-api';

export default function WorkerWalkInScreen() {
  const [services, setServices] = useState<WorkerWalkInServiceOption[]>([]);
  const [barbers, setBarbers] = useState<WorkerWalkInBarberOption[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    void getWorkerWalkInOptions()
      .then((next) => {
        setServices(next.services);
        setBarbers(next.barbers);
        setSelectedKey((current) => {
          const keys = next.services.map((service) => service.serviceId ?? `fila:${service.queueId}`);
          return current && keys.includes(current) ? current : keys[0] ?? null;
        });
        setBarberId((current) => current && next.barbers.some((barber) => barber.barberId === current) ? current : null);
        setError(null);
      })
      .catch(() => setError('No pudimos cargar servicios y barberos de la barbería seleccionada.'));
  }, []);

  useFocusEffect(load);

  async function submit() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError('El nombre del cliente es requerido.');
      return;
    }
    const selected = services.find((item) => (item.serviceId ?? `fila:${item.queueId}`) === selectedKey) ?? null;
    if (!selected) {
      setError('Selecciona un servicio para continuar.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const service = selected;
      const compatible = service.serviceId ? barbers.filter((item) => item.serviceIds.includes(service.serviceId as string)) : barbers;
      const effectiveBarberId = barberId && compatible.some((item) => item.barberId === barberId) ? barberId : null;
      const barber = effectiveBarberId ? barbers.find((item) => item.barberId === effectiveBarberId) : null;
      const visibleCode = await createMyWalkInTicket(service.queueId, cleanName, service.serviceId, effectiveBarberId);
      setNotice(
        barber
          ? `Turno creado: ${visibleCode} · ${service?.name ?? 'Servicio'} · asignado a ${barber.name}: lo verá en su Cola.`
          : `Turno creado: ${visibleCode} · ${service?.name ?? 'Servicio'}. Sin teléfono: espera en sala y atiende al llamado por voz.`,
      );
      setName('');
      setBarberId(null);
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes('no atiende') ? 'Ese barbero no atiende este servicio.' : 'No pudimos crear el turno manual. Verifica la barbería seleccionada e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  const pickedService = services.find((item) => (item.serviceId ?? `fila:${item.queueId}`) === selectedKey) ?? null;
  const compatibleBarbers = pickedService?.serviceId ? barbers.filter((item) => item.serviceIds.includes(pickedService.serviceId as string)) : barbers;
  const hiddenBarberCount = barbers.length - compatibleBarbers.length;

  return (
    <WorkerScreenContainer activeNavigation="queue">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={workerUiStyles.page}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a la cola" onPress={() => router.back()}>
            <WorkerIcon name="close" />
          </Pressable>
          <WorkerPill label="TICKET MANUAL" tone="teal" />
        </View>

        <View style={styles.heading}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Excepción, no flujo normal</WorkerText>
          <WorkerText variant="title">Ticket manual</WorkerText>
          <WorkerText color={workerColors.muted}>Solo cuando el cliente no puede generarlo solo: sin celular, sin batería o sin datos. Nombre y servicio, nada más.</WorkerText>
        </View>

        <View style={workerUiStyles.card}>
          <View style={styles.field}>
            <WorkerText variant="label">Nombre del cliente *</WorkerText>
            <TextInput
              accessibilityLabel="Nombre del cliente"
              value={name}
              onChangeText={setName}
              editable={!loading}
              placeholder="Ej. Carlos Méndez"
              placeholderTextColor={workerColors.muted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={workerUiStyles.card}>
          <View style={styles.sectionHeader}>
            <WorkerText variant="headline">Servicio *</WorkerText>
            <WorkerText color={workerColors.muted}>Elige 1 servicio</WorkerText>
          </View>
          <View style={styles.servicesGrid}>
            {services.map((service) => {
              const key = service.serviceId ?? `fila:${service.queueId}`;
              const selected = key === selectedKey;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSelectedKey(key);
                    if (barberId && service.serviceId && !barbers.some((item) => item.barberId === barberId && item.serviceIds.includes(service.serviceId as string))) {
                      setBarberId(null);
                    }
                  }}
                  style={[styles.serviceCard, selected ? styles.serviceCardSelected : null]}
                >
                  <View style={styles.serviceCardTop}>
                    <WorkerText variant="label" color={selected ? '#FFFFFF' : workerColors.body} style={{ flex: 1 }}>{service.name}</WorkerText>
                    {selected ? <WorkerIcon name="check" color="#FFFFFF" size={16} /> : null}
                  </View>
                  <WorkerText variant="label" color={selected ? 'rgba(255,255,255,0.82)' : workerColors.muted}>
                    {service.durationSeconds != null ? `${Math.round(service.durationSeconds / 60)} min` : 'Tiempo estimado'}
                  </WorkerText>
                  <WorkerText variant="label" color={selected ? 'rgba(255,255,255,0.82)' : workerColors.muted}>
                    {service.priceCents != null && formatReferencePrice(service.priceCents) ? `${formatReferencePrice(service.priceCents)} ref.` : 'Precio por confirmar'}
                  </WorkerText>
                </Pressable>
              );
            })}
          </View>
          {services.length === 0 && (
            <View style={{ gap: 8 }}>
              <WorkerText color={workerColors.muted}>Sin catálogo en esta barbería: pide al admin que registre servicios.</WorkerText>
              <WorkerButton label="Volver a la cola" tone="secondary" onPress={() => router.back()} />
            </View>
          )}
        </View>

        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">Barbero asignado</WorkerText>
          <WorkerText color={workerColors.muted}>
            {pickedService?.serviceId
              ? `Solo quienes atienden ${pickedService.name}.`
              : 'Sin servicio del catálogo: atiende quien lo crea.'}
          </WorkerText>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: barberId === null }}
            onPress={() => setBarberId(null)}
            style={[styles.barberAny, barberId === null ? styles.barberAnySelected : null]}
          >
            <WorkerText variant="label" color={barberId === null ? '#FFFFFF' : workerColors.body}>Quien lo crea</WorkerText>
            {barberId === null ? <WorkerIcon name="check" color="#FFFFFF" size={16} /> : null}
          </Pressable>
          <View style={styles.barberList}>
            {compatibleBarbers.map((barber) => {
              const selected = barberId === barber.barberId;
              return (
                <Pressable
                  key={barber.barberId}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setBarberId(barber.barberId)}
                  style={[styles.barberRow, selected ? styles.barberRowSelected : null]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <WorkerText variant="label" color={selected ? '#FFFFFF' : workerColors.body}>{barber.name}</WorkerText>
                    <WorkerText variant="label" color={selected ? 'rgba(255,255,255,0.82)' : workerColors.muted}>
                      Atiende este servicio · lo verá en su Cola
                    </WorkerText>
                  </View>
                  {selected ? <WorkerIcon name="check" color="#FFFFFF" size={16} /> : null}
                </Pressable>
              );
            })}
          </View>
          {compatibleBarbers.length === 0 && <WorkerText color={workerColors.muted}>Nadie atiende este servicio todavía.</WorkerText>}
          {hiddenBarberCount > 0 && <WorkerText color={workerColors.muted}>{hiddenBarberCount} no {hiddenBarberCount === 1 ? 'atiende' : 'atienden'} este servicio.</WorkerText>}
        </View>

        {notice ? (
          <View accessibilityRole="alert" style={[workerUiStyles.card, { backgroundColor: workerColors.tealContainer }]}>
            <WorkerText variant="label" color={workerColors.teal}>{notice}</WorkerText>
          </View>
        ) : null}
        {error ? (
          <View accessibilityRole="alert" style={[workerUiStyles.card, { backgroundColor: workerColors.errorContainer }]}>
            <WorkerText variant="label" color={workerColors.error}>{error}</WorkerText>
          </View>
        ) : null}

        {name.trim() && pickedService ? (
          <WorkerText color={workerColors.muted}>
            Se creará para {name.trim()} · {pickedService.name} · {barberId ? (barbers.find((item) => item.barberId === barberId)?.name ?? 'barbero elegido') : 'quien lo crea'}.
          </WorkerText>
        ) : null}
        <WorkerButton label="Crear ticket manual" disabled={loading || !name.trim() || !selectedKey} onPress={() => void submit()} />
      </ScrollView>
    </WorkerScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heading: { gap: 6 },
  field: { gap: 6 },
  input: { backgroundColor: workerColors.low, borderColor: workerColors.outline, borderRadius: 8, borderWidth: 1, color: workerColors.body, fontFamily: 'Work Sans', fontSize: 16, minHeight: 52, paddingHorizontal: 12 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceCard: { backgroundColor: workerColors.low, borderColor: workerColors.outline, borderRadius: 10, borderWidth: 1, flexBasis: '47%', flexGrow: 1, gap: 6, minHeight: 96, padding: 12 },
  serviceCardSelected: { backgroundColor: workerColors.ink, borderColor: workerColors.ink },
  serviceCardTop: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  barberAny: { alignItems: 'center', backgroundColor: workerColors.low, borderColor: workerColors.outline, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 12 },
  barberAnySelected: { backgroundColor: workerColors.ink, borderColor: workerColors.ink },
  barberList: { gap: 8 },
  barberRow: { alignItems: 'center', backgroundColor: workerColors.card, borderColor: workerColors.outline, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 12 },
  barberRowSelected: { backgroundColor: workerColors.ink, borderColor: workerColors.ink },
});
