import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/use-auth';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const { signUp, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const isPasswordValid = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = email.trim().length > 0 && isPasswordValid && !isLoading;

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    const failure = await signUp(email, password);
    setError(failure);
    // The session event takes the user to the app when confirmation is disabled;
    // otherwise we ask them to confirm by email first.
    setIsRegistered(failure === null);
    setIsLoading(false);
  }

  if (isRegistered) {
    return (
      <AuthScreenContainer>
        <View style={styles.header}>
          <ThemedText type="subtitle">Cuenta creada</ThemedText>
          <ThemedText type="small">
            Revisa tu correo para confirmar la cuenta y luego inicia sesión.
          </ThemedText>
        </View>
        <Link href="/(auth)/login" style={styles.link}>
          Ir a iniciar sesión
        </Link>
      </AuthScreenContainer>
    );
  }

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <ThemedText type="subtitle">Crear cuenta</ThemedText>
        <ThemedText type="small">
          Para tomar un turno como cliente no necesitas una cuenta. Si eres personal de una barbería, regístrate como personal.
        </ThemedText>
      </View>

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
        placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
        secureTextEntry
        textContentType="newPassword"
        editable={!isLoading}
      />

      {!isPasswordValid && password.length > 0 && (
        <ThemedText type="small">La contraseña debe tener al menos 6 caracteres.</ThemedText>
      )}

      <AuthErrorMessage message={error} />

      <AuthButton
        label="Crear cuenta"
        onPress={handleSubmit}
        disabled={!canSubmit || !isSupabaseConfigured}
        isLoading={isLoading}
      />

      <ThemedView style={styles.footer}>
        <Text style={styles.footerText}>¿Eres personal de barbería?</Text>
        <Link href="/(auth)/worker-register" style={styles.link}>
          Regístrate como personal
        </Link>
      </ThemedView>

      <ThemedView style={styles.footer}>
        <Link href="/" style={styles.secondaryLink}>
          Volver al inicio (Clientes)
        </Link>
      </ThemedView>
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
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
    color: '#00686C',
    fontWeight: '600',
  },
  secondaryLink: {
    color: '#526075',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
});
