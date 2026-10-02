import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { AuthButton, AuthErrorMessage } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';
import { normalizeBusinessCode } from '@/features/queue/queue-api';

export default function HomeScreen() {
  const { session, profile, isProfileLoading, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handlePreview() {
    const validCode = normalizeBusinessCode(code);
    if (!validCode) {
      setError('Ingresa un código de empresa válido.');
      return;
    }
    setError(null);
    router.push({ pathname: '/(app)/preview', params: { code: validCode } });
  }

  if (isProfileLoading) {
    return null;
  }

  if (profile?.role === 'personal' && profile.businessId) {
    return <Redirect href="/(app)/worker" />;
  }

  if (profile?.role === 'admin' && profile.businessId) {
    return <Redirect href="/(app)/admin" />;
  }

  return (
    <CustomerScreenContainer activeNavigation="home">
      <View>
        <ThemedText type="eyebrow" themeColor="primary">Turnify</ThemedText>
        <ThemedText type="subtitle">Encuentra tu barbería</ThemedText>
        <ThemedText type="small">{session?.user.email ?? ''}</ThemedText>
      </View>

      <ThemedText type="small">Ingresa el código de la empresa o escanea su QR.</ThemedText>

      <AuthField
        label="Código de empresa"
        value={code}
        onChangeText={setCode}
        placeholder="Ej. TURNO-123"
        autoCapitalize="characters"
        onSubmitEditing={handlePreview}
      />
      <AuthErrorMessage message={error} />
      <AuthButton label="Ver servicios" onPress={handlePreview} />
      <AuthButton label="Escanear código QR" onPress={() => router.push('/(app)/scan')} />
      <AuthButton label="Cerrar sesión" onPress={() => void signOut()} />
    </CustomerScreenContainer>
  );
}
