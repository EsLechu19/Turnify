import { useState } from 'react';

import { AuthButton, AuthErrorMessage, AuthIntro, AuthNotice, AuthSwitch } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/use-auth';

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
    <Screen>
      <AuthIntro
        detail="Acceso exclusivo para barberos y personal autorizado."
        eyebrow="Equipo"
        icon="lock"
        title="Iniciar sesión"
      />

      {!isSupabaseConfigured && (
        <AuthNotice message="Falta configurar Supabase. Copia apps/mobile/.env.example a apps/mobile/.env y completa los valores." />
      )}

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
          label="Contraseña"
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          placeholder="Tu contraseña"
          secureTextEntry
          textContentType="password"
          value={password}
        />

        <AuthErrorMessage message={error} />

        <AuthButton
          disabled={!canSubmit || !isSupabaseConfigured}
          isLoading={isLoading}
          label="Entrar"
          onPress={handleSubmit}
        />
      </Card>

      <AuthSwitch action="Regístrate como personal" href="/(auth)/worker-register" question="¿Eres barbero o quieres sumarte al equipo?" />
    </Screen>
  );
}