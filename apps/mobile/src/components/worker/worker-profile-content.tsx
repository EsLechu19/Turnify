import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { WorkerButton, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { useAuth } from '@/features/auth/use-auth';
import { getMyWorkerAvatar, pickWorkerAvatar, uploadWorkerAvatar } from '@/features/worker/worker-avatar';
import { getMyWorkerProfileDetails, updateMyWorkerProfileDetails } from '@/features/worker/worker-profile-api';
import { getWorkerShops, type WorkerShop } from '@/features/worker/worker-membership-api';

export function WorkerProfileContent() {
  const { session, signOut } = useAuth();
  const [shops, setShops] = useState<WorkerShop[]>([]);
  const [areShopsExpanded, setAreShopsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;

    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setShops([{ businessId: 'demo', name: 'Barbería Demo', isCurrent: true }]);
      setName('Esau S');
      setPhone('987 654 321');
      return () => {
        active = false;
      };
    }

    void getWorkerShops().then((next) => {
      if (active) setShops(next);
    }).catch(() => {
      if (active) setShops([]);
    });
    void getMyWorkerProfileDetails().then((details) => {
      if (active) {
        setName(details.name);
        setPhone(details.phone);
      }
    }).catch(() => {
      if (active) setNotice(null);
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
  const currentShop = shops.find((shop) => shop.isCurrent) ?? null;
  return (
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
        <WorkerText variant="eyebrow" color={workerColors.muted}>Información de cuenta</WorkerText>
        <WorkerText variant="headline">Datos personales</WorkerText>
        <WorkerText color={workerColors.muted}>Mantén tus datos actualizados para que el equipo pueda reconocerte.</WorkerText>
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
          <WorkerText variant="eyebrow" color={workerColors.muted}>Barberías aprobadas</WorkerText>
          <WorkerPill label={`${shops.length}`} tone="neutral" />
        </View>
        {currentShop ? (
          <View style={styles.currentShop}>
            <WorkerText color={workerColors.muted}>Barbería activa</WorkerText>
            <WorkerText variant="headline">{currentShop.name}</WorkerText>
          </View>
        ) : (
          <WorkerText color={workerColors.muted}>Tu acceso aún espera aprobación o necesitas elegir una barbería.</WorkerText>
        )}
        <WorkerButton label={areShopsExpanded ? 'Ocultar barberías' : 'Ver barberías y cambiar'} tone="secondary" onPress={() => setAreShopsExpanded((expanded) => !expanded)} />
        {areShopsExpanded ? shops.map((shop) => (
          <View key={shop.businessId} style={styles.shopRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <WorkerText variant="headline">{shop.name}</WorkerText>
              <WorkerText color={workerColors.muted}>{shop.isCurrent ? 'Barbería seleccionada' : 'Membresía aprobada'}</WorkerText>
            </View>
            <WorkerPill label={shop.isCurrent ? 'ACTUAL' : 'APROBADA'} tone={shop.isCurrent ? 'teal' : 'neutral'} />
          </View>
        )) : null}
        {shops.length > 0 ? (
          <WorkerButton label="Cambiar de barbería" tone="secondary" onPress={() => router.replace('/(app)/worker-shops')} />
        ) : null}
      </View>

      <View style={workerUiStyles.card}>
        <WorkerText variant="headline">Servicios por barbería</WorkerText>
        <WorkerText color={workerColors.muted}>Entra y selecciona una barbería para ver los servicios que ofrece.</WorkerText>
        <WorkerButton label="Ver servicios por barbería" onPress={() => router.push('/(app)/worker-services')} />
      </View>

      <View style={workerUiStyles.card}>
        <WorkerText variant="headline">Horario de trabajo</WorkerText>
        <WorkerText color={workerColors.muted}>No hay un horario fijo guardado en la app. Tu disponibilidad puntual se administra desde En vivo y el estado de la barbería desde Turno/Ocupado.</WorkerText>
      </View>

      <WorkerButton label="Cerrar sesión" tone="logout" onPress={() => { void signOut(); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { alignItems: 'center', backgroundColor: workerColors.ink, borderRadius: 999, height: 54, justifyContent: 'center', width: 54 },
  avatarImage: { borderRadius: 999, height: 54, width: 54 },
  field: { gap: 6 },
  input: { backgroundColor: workerColors.low, borderColor: workerColors.outline, borderRadius: 8, borderWidth: 1, color: workerColors.body, fontFamily: 'Work Sans', fontSize: 16, minHeight: 52, paddingHorizontal: 12 },
  currentShop: { backgroundColor: workerColors.low, borderRadius: 12, gap: 4, padding: 14 },
  shopRow: { alignItems: 'center', borderTopColor: workerColors.outline, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingTop: 12 },
  shopServices: { gap: 10 },
});
