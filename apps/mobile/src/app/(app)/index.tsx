import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';
import { normalizeBusinessCode } from '@/features/queue/queue-api';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
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

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <ThemedText type="subtitle">Turnify</ThemedText>
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
      <AuthButton label="Ver filas" onPress={handlePreview} />
      <AuthButton label="Escanear código QR" onPress={() => router.push('/(app)/scan')} />
      <AuthButton label="Mis turnos" onPress={() => router.push('/(app)/history' as Href)} />
      <AuthButton label="Mi perfil" onPress={() => router.push('/(app)/profile' as Href)} />
      <AuthButton label="Cerrar sesión" onPress={() => void signOut()} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
});
