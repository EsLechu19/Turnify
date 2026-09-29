import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { useAuth } from '@/features/auth/use-auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  const { signIn, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    const failure = await signIn(email, password);
    setError(failure);
    setIsLoading(false);
  }

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <ThemedText type="subtitle">Iniciar sesión</ThemedText>
        <ThemedText type="small">Entra para tomar y seguir tu turno.</ThemedText>
      </View>

      {!isSupabaseConfigured && (
        <ThemedText type="small" style={styles.notice}>
          Falta configurar Supabase. Copia apps/mobile/.env.example a apps/mobile/.env y completa los
          valores.
        </ThemedText>
      )}

      <AuthField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!isLoading}
      />

      <AuthField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Tu contraseña"
        secureTextEntry
        textContentType="password"
        onSubmitEditing={handleSubmit}
        editable={!isLoading}
      />

      <AuthErrorMessage message={error} />

      <AuthButton
        label="Entrar"
        onPress={handleSubmit}
        disabled={!canSubmit || !isSupabaseConfigured}
        isLoading={isLoading}
      />

      <ThemedView style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta?</Text>
        <Link href="/(auth)/register" style={styles.link}>
          Regístrate
        </Link>
      </ThemedView>
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  notice: {
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3c87f7',
    fontWeight: 600,
  },
});
