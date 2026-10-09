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
  const [queueId, setQueueId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerInRoom, setCustomerInRoom] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    void getWorkerWalkInOptions()
      .then((next) => {
        setServices(next.services);
        setBarbers(next.barbers);
        setQueueId((current) => current && next.services.some((service) => service.queueId === current) ? current : next.services[0]?.queueId ?? null);
        setBarberId((current) => current && next.barbers.some((barber) => barber.barberId === current) ? current : null);
        setError(null);
      })
      .catch(() => setError('No pudimos cargar servicios y barberos de la barbería seleccionada.'));
  }, []);

  useFocusEffect(load);

  async function submit() {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    if (!cleanName) {
      setError('El nombre del cliente es requerido.');
      return;
    }
    if (!queueId) {
      setError('Selecciona un servicio para continuar.');
      return;
    }
    if (cleanPhone.length < 7) {
      setError('Ingresa un teléfono móvil válido para enviar la alerta.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const service = services.find((item) => item.queueId === queueId);
      const barber = barberId ? barbers.find((item) => item.barberId === barberId) : null;
      const visibleCode = await createMyWalkInTicket(queueId, cleanName);
      setNotice(`Turno creado: ${visibleCode} · ${service?.name ?? 'Servicio'} · ${barber?.name ?? 'Cualquiera disponible'} · WhatsApp a ${cleanPhone}`);
      setName('');
      setPhone('');
      setBarberId(null);
    } catch {
      setError('No pudimos crear el turno presencial. Verifica la barbería seleccionada e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkerScreenContainer activeNavigation="live">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={workerUiStyles.page}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar registro presencial" onPress={() => router.back()}>
            <WorkerIcon name="close" />
          </Pressable>
          <WorkerPill label="AGREGAR CLIENTE" tone="teal" />
        </View>

        <View style={styles.heading}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Registro rápido</WorkerText>
          <WorkerText variant="title">Cliente presencial</WorkerText>
          <WorkerText color={workerColors.muted}>Completa los datos para crear un turno real.</WorkerText>
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

          <View style={styles.field}>
            <WorkerText variant="label">Teléfono móvil *</WorkerText>
            <TextInput
              accessibilityLabel="Teléfono móvil"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
              keyboardType="phone-pad"
              placeholder="Ej. 987 654 321"
              placeholderTextColor={workerColors.muted}
              style={styles.input}
            />
            <WorkerText color={workerColors.muted}>Se enviará alerta por WhatsApp cuando falten 5 min para su turno.</WorkerText>
          </View>
        </View>

        <View style={workerUiStyles.card}>
          <View style={styles.sectionHeader}>
            <WorkerText variant="headline">Servicio *</WorkerText>
            <WorkerText color={workerColors.muted}>Elige 1 servicio</WorkerText>
          </View>
          <View style={styles.servicesGrid}>
            {services.map((service) => {
              const selected = service.queueId === queueId;
              return (
                <Pressable
                  key={service.queueId}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setQueueId(service.queueId)}
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
                    {formatReferencePrice(service.priceCents) ?? 'Precio por confirmar'}
                  </WorkerText>
                </Pressable>
              );
            })}
          </View>
          {services.length === 0 && <WorkerText color={workerColors.muted}>No hay servicios compatibles disponibles para asignar.</WorkerText>}
        </View>

        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">Barbero asignado</WorkerText>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: barberId === null }}
            onPress={() => setBarberId(null)}
            style={[styles.barberAny, barberId === null ? styles.barberAnySelected : null]}
          >
            <WorkerText variant="label" color={barberId === null ? '#FFFFFF' : workerColors.body}>Cualquiera disponible</WorkerText>
            {barberId === null ? <WorkerIcon name="check" color="#FFFFFF" size={16} /> : null}
          </Pressable>
          <View style={styles.barberList}>
            {barbers.map((barber) => {
              const selected = barberId === barber.barberId;
              return (
                <Pressable
                  key={barber.barberId}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setBarberId(barber.barberId)}
                  style={[styles.barberRow, selected ? styles.barberRowSelected : null]}
                >
                  <WorkerText variant="label" color={selected ? '#FFFFFF' : workerColors.body}>{barber.name}</WorkerText>
                  {selected ? <WorkerIcon name="check" color="#FFFFFF" size={16} /> : null}
                </Pressable>
              );
            })}
          </View>
          {barbers.length === 0 && <WorkerText color={workerColors.muted}>No hay otros barberos disponibles.</WorkerText>}
        </View>

        <View style={workerUiStyles.card}>
          <CheckRow
            checked={customerInRoom}
            label="Cliente en sala / sin dispositivo"
            detail="Llamado por voz alta y pantalla general del estudio"
            onPress={() => setCustomerInRoom((current) => !current)}
          />
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

        <WorkerButton label="Asignar turno" disabled={loading || !name.trim() || !queueId || !phone.trim()} onPress={() => void submit()} />
      </ScrollView>
    </WorkerScreenContainer>
  );
}

function CheckRow({ checked, label, detail, onPress }: { checked: boolean; label: string; detail?: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
        {checked ? <WorkerIcon name="check" color="#FFFFFF" size={14} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <WorkerText variant="label">{label}</WorkerText>
        {detail ? <WorkerText color={workerColors.muted}>{detail}</WorkerText> : null}
      </View>
    </Pressable>
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
  checkRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  checkbox: { alignItems: 'center', borderColor: workerColors.outline, borderRadius: 6, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 22 },
  checkboxChecked: { backgroundColor: workerColors.teal, borderColor: workerColors.teal },
});
