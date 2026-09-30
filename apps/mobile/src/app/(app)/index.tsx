import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';
import { acceptPersonalInvitation, translateInvitationError } from '@/features/business/business-api';
import { normalizeBusinessCode } from '@/features/queue/queue-api';

export default function HomeScreen() {
  const { session, profile, isProfileLoading, reloadProfile, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isRedeemingInvitation, setIsRedeemingInvitation] = useState(false);

  function handlePreview() {
    const validCode = normalizeBusinessCode(code);
    if (!validCode) {
      setError('Ingresa un código de empresa válido.');
      return;
    }
    setError(null);
    router.push({ pathname: '/(app)/preview', params: { code: validCode } });
  }

  async function handleRedeemInvitation() {
    if (!invitationCode.trim()) {
      setInvitationError('Ingresa el código de invitación.');
      return;
    }

    setIsRedeemingInvitation(true);
    setInvitationError(null);
    try {
      await acceptPersonalInvitation(invitationCode);
      await reloadProfile();
      router.replace('/(app)/admin');
    } catch (reason) {
      setInvitationError(translateInvitationError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsRedeemingInvitation(false);
    }
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
      {!isProfileLoading && profile?.role === 'cliente' && !profile.businessId && (
        <>
          <AuthButton label="Registrar mi empresa" onPress={() => router.push('/(app)/register-business' as Href)} />
          <View style={styles.invitationSection}>
            <ThemedText type="smallBold">¿Te invitaron como personal?</ThemedText>
            <AuthField
              label="Código de invitación"
              value={invitationCode}
              onChangeText={setInvitationCode}
              placeholder="Pega el código que recibiste"
              autoCapitalize="characters"
            />
            <AuthErrorMessage message={invitationError} />
            <AuthButton label="Aceptar invitación" onPress={() => void handleRedeemInvitation()} disabled={isRedeemingInvitation} isLoading={isRedeemingInvitation} />
          </View>
        </>
      )}
       {!isProfileLoading && (profile?.role === 'admin' || profile?.role === 'personal') && profile.businessId && (
         <AuthButton label="Panel de atención" onPress={() => router.push('/(app)/admin' as Href)} />
      )}
      <AuthButton label="Cerrar sesión" onPress={() => void signOut()} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  invitationSection: {
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
  },
});
