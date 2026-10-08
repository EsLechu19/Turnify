import { useState } from 'react';

import { AuthButton, AuthErrorMessage, AuthIntro, AuthNotice, AuthSwitch } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { Card, Screen } from '@/components/ui';
import { space } from '@/constants/theme';
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
      <Screen bottomInset={space(8)}>
        <AuthIntro
          detail="Revisa tu correo para confirmar la cuenta y luego inicia sesión."
          eyebrow="Casi listo"
          icon="check-circle"
          title="Cuenta creada"
        />
        <Card padding="lg" tone="success">
          <AuthSwitch action="Ir a iniciar sesión" href="/(auth)/login" question="¿Ya confirmaste tu correo?" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthIntro detail="Regístrate para tomar turnos." icon="user" title="Crear cuenta" />

      {!isSupabaseConfigured && <AuthNotice message="Falta configurar Supabase para crear la cuenta." />}

      <Card padding="lg">
        <AuthField
          editable={!isLoading}
          keyboardType="email-address"
          label="Correo"
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          textContentType="emailAddress"
          value={email}
        />

        <AuthField
          editable={!isLoading}
          error={!isPasswordValid && password.length > 0 ? `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` : null}
          label="Contraseña"
          onChangeText={setPassword}
          placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />

        <AuthErrorMessage message={error} />

        <AuthButton
          disabled={!canSubmit || !isSupabaseConfigured}
          isLoading={isLoading}
          label="Crear cuenta"
          onPress={handleSubmit}
        />
      </Card>

      <AuthSwitch action="Inicia sesión" href="/(auth)/login" question="¿Ya tienes cuenta?" />
    </Screen>
  );
}