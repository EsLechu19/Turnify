import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { WorkerButton, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerAccountContainer } from '@/components/worker/worker-account-container';
import { useAuth } from '@/features/auth/use-auth';
import { formatReferencePrice } from '@/features/queue/commercial-booking';
import { getMyWorkerAvatar, pickWorkerAvatar, uploadWorkerAvatar } from '@/features/worker/worker-avatar';
import { getMyWorkerProfileDetails, getMyWorkerServices, updateMyWorkerProfileDetails, type WorkerAssignedService } from '@/features/worker/worker-profile-api';
import { getWorkerShops, type WorkerShop } from '@/features/worker/worker-membership-api';

export default function WorkerProfileScreen() {
  const { session, signOut } = useAuth();
  const [currentShop, setCurrentShop] = useState<WorkerShop | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState<WorkerAssignedService[]>([]);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;

    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setCurrentShop({ businessId: 'demo', name: 'Barbería Demo', isCurrent: true });
      setName('Esau S');
      setPhone('987 654 321');
      setServices([
        { serviceId: 'demo-1', name: 'Corte clásico', description: null, durationSeconds: 1800, priceCents: 2000 },
        { serviceId: 'demo-2', name: 'Perfilado de barba', description: null, durationSeconds: 1200, priceCents: 1500 },
      ]);
      setServicesError(null);
      return () => {
        active = false;
      };
    }

    void getWorkerShops().then((next) => {
      if (active) setCurrentShop(next.find((shop) => shop.isCurrent) ?? null);
    }).catch(() => {
      if (active) setCurrentShop(null);
    });
    void getMyWorkerProfileDetails().then((details) => {
      if (active) {
        setName(details.name);
        setPhone(details.phone);
      }
    }).catch(() => {
      if (active) setNotice(null);
    });
    void getMyWorkerServices().then((next) => {
      if (active) {
        setServices(next);
        setServicesError(null);
      }
    }).catch(() => {
      if (active) setServicesError('No pudimos cargar tus servicios.');
    });
    void getMyWorkerAvatar().then((next) => {
      if (active) setFotoUrl(next);
    }).catch(() => {
      if (active) setFotoUrl(null);
    });

    return () => {
      active = false;
    };
  }, []));

  async function changePhoto() {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setNotice('Demo: foto simulada.');
      return;
    }
    if (isPhotoLoading) return;
    setIsPhotoLoading(true);
    setNotice(null);
    try {
      const base64 = await pickWorkerAvatar();
      if (!base64) return;
      setFotoUrl(await uploadWorkerAvatar(base64));
      setNotice('Foto actualizada.');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'No pudimos actualizar tu foto.');
    } finally {
      setIsPhotoLoading(false);
    }
  }

  async function save() {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') { setNotice('Datos guardados en demo.'); return; }
    setIsSaving(true);
    setNotice(null);
    try {
      const updated = await updateMyWorkerProfileDetails({ name, phone });
      setName(updated.name);
      setPhone(updated.phone);
      setNotice('Datos personales guardados.');
    } catch {
      setNotice('No pudimos guardar tus datos personales.');
    } finally {
      setIsSaving(false);
    }
  }

  const email = session?.user.email ?? 'No disponible';
  return (
    <WorkerAccountContainer activeNavigation="profile">
      <ScrollView contentContainerStyle={workerUiStyles.page} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Cuenta</WorkerText>
          <WorkerText variant="title">Mi perfil</WorkerText>
          <WorkerText color={workerColors.muted}>Tu información, barbería y servicios activos.</WorkerText>
        </View>

        <View style={[workerUiStyles.card, styles.heroCard]}>
          {fotoUrl ? (
            <Image accessibilityLabel="Tu foto de perfil" source={{ uri: fotoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <WorkerText variant="metric" color="#FFFFFF">{email.trim().charAt(0).toUpperCase() || 'U'}</WorkerText>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <WorkerText variant="headline">{name || email}</WorkerText>
            <WorkerText color={workerColors.muted}>{email}</WorkerText>
          </View>
        </View>

        <WorkerButton
          label={isPhotoLoading ? 'Subiendo foto…' : 'Cambiar foto'}
          tone="secondary"
          disabled={isPhotoLoading}
          onPress={() => void changePhoto()}
        />
        <WorkerText color={workerColors.muted}>Tu foto, nombre y teléfono se muestran igual en todas tus barberías.</WorkerText>

        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">Datos personales</WorkerText>
          <View style={styles.field}>
            <WorkerText variant="label">Nombre</WorkerText>
            <TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={workerColors.muted} style={styles.input} />
          </View>
          <View style={styles.field}>
            <WorkerText variant="label">Teléfono</WorkerText>
            <TextInput accessibilityLabel="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Tu teléfono" placeholderTextColor={workerColors.muted} style={styles.input} />
          </View>
          <WorkerButton label={isSaving ? 'Guardando…' : 'Guardar datos'} disabled={isSaving} onPress={() => void save()} />
          {notice ? <WorkerText variant="label" color={workerColors.teal}>{notice}</WorkerText> : null}
        </View>

        <View style={workerUiStyles.card}>
          <View style={workerUiStyles.split}>
            <WorkerText variant="eyebrow" color={workerColors.muted}>Barbería activa</WorkerText>
            <WorkerPill label={currentShop ? 'SELECCIONADA' : 'SIN ELEGIR'} tone={currentShop ? 'teal' : 'neutral'} />
          </View>
          {currentShop ? (
            <View style={styles.currentShop}>
              <WorkerText color={workerColors.muted}>Operando ahora en</WorkerText>
              <WorkerText variant="headline">{currentShop.name}</WorkerText>
            </View>
          ) : (
            <WorkerText color={workerColors.muted}>Tu acceso aún espera aprobación o necesitas elegir una barbería.</WorkerText>
          )}
          {currentShop ? (
            <WorkerButton label="Cambiar de barbería" tone="secondary" onPress={() => router.replace('/(app)/worker-shops')} />
          ) : null}
        </View>

        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">Servicios que empleas</WorkerText>
          {servicesError ? <WorkerText color={workerColors.error}>{servicesError}</WorkerText> : null}
          {!servicesError && services.length === 0 ? <WorkerText color={workerColors.muted}>No tienes servicios asignados todavía.</WorkerText> : null}
          {services.map((service) => (
            <View key={service.serviceId} style={styles.serviceRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <WorkerText variant="headline">{service.name}</WorkerText>
                <WorkerText color={workerColors.muted}>{service.description ?? 'Tiempo y precio referencial'}</WorkerText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <WorkerText variant="label" color={workerColors.teal}>{Math.round(service.durationSeconds / 60)} min</WorkerText>
                <WorkerText variant="label" color={workerColors.muted}>{formatReferencePrice(service.priceCents) ?? '—'}</WorkerText>
              </View>
            </View>
          ))}
        </View>

        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">Horario de trabajo</WorkerText>
          <WorkerText color={workerColors.muted}>No hay un horario fijo guardado en la app. Tu disponibilidad puntual se administra desde En vivo y el estado de la barbería desde Turno/Ocupado.</WorkerText>
        </View>

        <WorkerButton label="Cerrar sesión" tone="danger" onPress={() => { void signOut(); }} />
      </ScrollView>
    </WorkerAccountContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { alignItems: 'center', backgroundColor: workerColors.ink, borderRadius: 999, height: 54, justifyContent: 'center', width: 54 },
  avatarImage: { borderRadius: 999, height: 54, width: 54 },
  field: { gap: 6 },
  input: { backgroundColor: workerColors.low, borderColor: workerColors.outline, borderRadius: 8, borderWidth: 1, color: workerColors.body, fontFamily: 'Work Sans', fontSize: 16, minHeight: 52, paddingHorizontal: 12 },
  currentShop: { backgroundColor: workerColors.low, borderRadius: 12, gap: 4, padding: 14 },
  serviceRow: { alignItems: 'center', borderTopColor: workerColors.outline, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingTop: 12 },
});
