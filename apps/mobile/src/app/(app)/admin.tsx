import QRCode from 'react-native-qrcode-svg';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { getBusiness, type Business } from '@/features/business/business-api';
import { useAuth } from '@/features/auth/use-auth';

export default function AdminScreen() {
  const { profile, isProfileLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBusiness = useCallback(async () => {
    if (!profile?.businessId) return;

    setIsLoading(true);
    try {
      setBusiness(await getBusiness(profile.businessId));
      setError(null);
    } catch {
      setError('No pudimos cargar los datos de tu empresa. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.businessId]);

  useFocusEffect(
    useCallback(() => {
      void loadBusiness();
    }, [loadBusiness]),
  );

  if (!isProfileLoading && (profile?.role !== 'admin' || !profile.businessId)) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthScreenContainer>
      <ThemedText type="subtitle">Panel de administración</ThemedText>
      {isLoading ? (
        <ThemedText type="small">Cargando empresa…</ThemedText>
      ) : business ? (
        <View style={styles.content}>
          <ThemedText type="smallBold">{business.name}</ThemedText>
          <ThemedText type="small">Código de empresa</ThemedText>
          <ThemedText type="title">{business.code}</ThemedText>
          <View style={styles.qr}>
            <QRCode value={`turnify:${business.code}`} size={208} />
          </View>
          <View style={styles.guidance}>
            <ThemedText type="smallBold">Compártelo con tus clientes</ThemedText>
            <ThemedText type="small">Pueden escanear este QR o ingresar el código de 8 caracteres en Turnify para ver tus filas.</ThemedText>
          </View>
        </View>
      ) : (
        <ThemedText type="small">No encontramos una empresa asociada a tu cuenta.</ThemedText>
      )}
      <AuthErrorMessage message={error} />
      {error && <AuthButton label="Reintentar" onPress={() => void loadBusiness()} />}
      <AuthButton label="Volver al inicio" onPress={() => router.replace('/(app)')} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 12 },
  qr: { backgroundColor: '#FFFFFF', padding: 16 },
  guidance: { alignSelf: 'stretch', gap: 6, padding: 16, borderRadius: 8, backgroundColor: '#E8F0FE' },
});
