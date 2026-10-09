import { useState } from 'react';

import { AuthField } from '@/components/auth/auth-field';
import { AuthButton, AuthErrorMessage, AuthIntro, AuthSwitch } from '@/components/auth/auth-ui';
import { Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/use-auth';
import { validateWorkerCredentials } from '@/features/worker/worker-access-state';
import { customerRegistrationRoute } from '@/features/public/public-route-policy';

export default function LoginScreen() {
  const { signIn, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    const validation = validateWorkerCredentials(email, password);
    if (validation) {
      setError(validation);
      return;
    }
    setIsLoading(true);
    setError(null);
    // Success needs no navigation: the (auth) guard redirects by role.
    setError(await signIn(email, password));
    setIsLoading(false);
  }

  return (
    <Screen>
      <AuthIntro
        detail="Acceso para barberos y personal de la barbería con tu cuenta de trabajo."
        eyebrow="Personal"
        title="Iniciar sesión"
      />

      <Card padding="lg">
        {!isSupabaseConfigured ? (
          <AuthErrorMessage message="Falta configurar Supabase. Copia apps/mobile/.env.example a apps/mobile/.env y completa los valores." />
        ) : null}
        <AuthField
          keyboardType="email-address"
          label="Correo"
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          textContentType="emailAddress"
          value={email}
        />

        <AuthField
          label="Contraseña"
          onChangeText={setPassword}
          passwordVisibility={{
            isVisible: isPasswordVisible,
            onToggle: () => setIsPasswordVisible((visible) => !visible),
          }}
          placeholder="Tu contraseña"
          textContentType="password"
          value={password}
        />

        <AuthErrorMessage message={error} />

        <AuthButton label="Ingresar" onPress={() => void handleSubmit()} isLoading={isLoading} disabled={isLoading} />

        <Button href="/" label="Entrar como invitado" variant="link" />
      </Card>

      <AuthSwitch
        action="Crear cuenta"
        href={customerRegistrationRoute}
        question="¿No tienes una cuenta?"
      />
    </Screen>
  );
}
