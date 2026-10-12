import { Alert, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { WorkerButton, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { useAuth } from '@/features/auth/use-auth';
import { getMyWorkerAvatar, pickWorkerAvatar, uploadWorkerAvatar } from '@/features/worker/worker-avatar';
import { getMyWorkerProfileDetails, updateMyWorkerProfileDetails } from '@/features/worker/worker-profile-api';

/** Personal account hub. Nothing operational lives here: photo, data, links, session. */
export function WorkerProfileContent() {
  const { session, signOut } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;

    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setName('Esau S');
      setPhone('987 654 321');
      return () => {
        active = false;
      };
    }

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

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  const email = session?.user.email ?? 'No disponible';
  return (
    <ScrollView contentContainerStyle={workerUiStyles.page} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 4 }}>
        <WorkerText variant="eyebrow" color={workerColors.teal}>Cuenta personal</WorkerText>
        <WorkerText variant="title">Mi perfil</WorkerText>
        <WorkerText color={workerColors.muted}>Tu foto y tus datos. Se muestran igual en todas tus barberías.</WorkerText>
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
        <WorkerButton
          label={isPhotoLoading ? 'Subiendo…' : 'Cambiar foto'}
          tone="secondary"
          disabled={isPhotoLoading}
          onPress={() => void changePhoto()}
        />
      </View>

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
        <WorkerText variant="headline">Mis barberías</WorkerText>
        <WorkerText color={workerColors.muted}>Elige dónde operar. El cambio real se hace ahí.</WorkerText>
        <WorkerButton label="Ir a mis barberías" tone="secondary" onPress={() => router.replace('/(app)/worker-shops')} />
      </View>

      <View style={workerUiStyles.card}>
        <WorkerText variant="headline">Servicios por barbería</WorkerText>
        <WorkerText color={workerColors.muted}>Entra y selecciona una barbería para ver los servicios que ofrece.</WorkerText>
        <WorkerButton label="Ver servicios por barbería" tone="secondary" onPress={() => router.push('/(app)/worker-services')} />
      </View>

      <View style={workerUiStyles.card}>
        <WorkerText variant="headline">Sesión</WorkerText>
        <WorkerText color={workerColors.muted}>Sal de tu cuenta en este dispositivo.</WorkerText>
        <WorkerButton label="Cerrar sesión" tone="logout" onPress={confirmSignOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { alignItems: 'center', backgroundColor: workerColors.ink, borderRadius: 999, height: 54, justifyContent: 'center', width: 54 },
  avatarImage: { borderRadius: 999, height: 54, width: 54 },
  field: { gap: 6 },
  input: { backgroundColor: workerColors.low, borderColor: workerColors.outline, borderRadius: 8, borderWidth: 1, color: workerColors.body, fontFamily: 'Work Sans', fontSize: 16, minHeight: 52, paddingHorizontal: 12 },
});
