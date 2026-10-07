import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AuthField } from '@/components/auth/auth-field';
import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { createBusiness } from '@/features/business/business-api';
import { useAuth } from '@/features/auth/use-auth';

export default function RegisterBusinessScreen() {
  const { profile, isProfileLoading, reloadProfile } = useAuth();
  const [name, setName] = useState('');
  const [fiscalId, setFiscalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isProfileLoading && (profile?.role !== 'cliente' || profile.businessId)) {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Ingresa el nombre de tu empresa.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createBusiness({ name, fiscalId, email, phone, address });
      await reloadProfile();
      router.replace('/(app)/admin');
    } catch {
      setError('No pudimos registrar tu empresa. Revisa los datos e intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">Registra tu empresa</ThemedText>
        <ThemedText type="small">Crea tu primera fila y recibe un código para tus clientes.</ThemedText>
        <AuthField label="Nombre de la empresa" value={name} onChangeText={setName} placeholder="Ej. Clínica Central" />
        <AuthField label="ID fiscal (opcional)" value={fiscalId} onChangeText={setFiscalId} placeholder="Ej. 30-12345678-9" />
        <AuthField label="Correo (opcional)" value={email} onChangeText={setEmail} placeholder="contacto@empresa.com" keyboardType="email-address" autoCapitalize="none" />
        <AuthField label="Teléfono (opcional)" value={phone} onChangeText={setPhone} placeholder="Tu teléfono" keyboardType="phone-pad" />
        <AuthField label="Dirección (opcional)" value={address} onChangeText={setAddress} placeholder="Dirección de atención" />
        <AuthErrorMessage message={error} />
        <AuthButton label="Registrar empresa" onPress={() => void handleSubmit()} disabled={isSaving} isLoading={isSaving} />
        <AuthButton label="Volver al inicio" onPress={() => router.replace('/')} disabled={isSaving} />
      </ScrollView>
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingVertical: 24 },
});
