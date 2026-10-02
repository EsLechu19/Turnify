import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthField } from '@/components/auth/auth-field';
import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { AuthButton, AuthErrorMessage } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { getCustomerProfile, updateCustomerProfile } from '@/features/customer/customer-api';
import { useAuth } from '@/features/auth/use-auth';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const customerId = session?.user.id;
    if (!customerId) return;

    setIsLoading(true);
    try {
      const profile = await getCustomerProfile(customerId);
      setName(profile?.name ?? '');
      setPhone(profile?.phone ?? '');
      setError(null);
    } catch {
      setError('No pudimos cargar tu perfil. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleSave() {
    const customerId = session?.user.id;
    if (!customerId) return;

    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const profile = await updateCustomerProfile(customerId, name, phone);
      setName(profile?.name ?? '');
      setPhone(profile?.phone ?? '');
      setFeedback('Tus datos se guardaron correctamente.');
    } catch {
      setError('No pudimos guardar tus datos. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <CustomerScreenContainer activeNavigation="profile">
      <ThemedText type="subtitle">Mi perfil</ThemedText>
      {isLoading ? (
        <ThemedText type="small">Cargando perfil…</ThemedText>
      ) : (
        <View style={styles.content}>
          <ThemedText type="small">Correo: {session?.user.email ?? 'No disponible'}</ThemedText>
          <AuthField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
          <AuthField
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            placeholder="Tu teléfono"
            keyboardType="phone-pad"
          />
          <AuthErrorMessage message={error} />
          {feedback && <ThemedText type="small">{feedback}</ThemedText>}
          <AuthButton label="Guardar cambios" onPress={() => void handleSave()} disabled={isSaving} isLoading={isSaving} />
        </View>
      )}
      {isLoading && <AuthErrorMessage message={error} />}
      <AuthButton label="Volver al inicio" onPress={() => router.replace('/(app)')} disabled={isSaving} />
      <AuthButton label="Cerrar sesión" onPress={() => void signOut()} disabled={isSaving} />
    </CustomerScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});
