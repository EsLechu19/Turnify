import { useState } from 'react';

import { AuthField } from '@/components/auth/auth-field';
import { AuthButton, AuthErrorMessage, AuthIntro, AuthNotice, AuthSwitch } from '@/components/auth/auth-ui';
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
  const [justSignedIn, setJustSignedIn] = useState(false);

  async function handleSubmit() {
    const validation = validateWorkerCredentials(email, password);
    if (validation) {
      setError(validation);
      return;
    }
    setIsLoading(true);
    setError(null);
    setJustSignedIn(false);
    // Success needs no navigation: the (auth) guard redirects by role.
    const failure = await signIn(email, password);
    setIsLoading(false);
    if (failure) {
      setError(failure);
      return;
    }
    setJustSignedIn(true);
  }

  return (
    <Screen>
      <AuthIntro
        detail="Solo para barberos y personal con cuenta de trabajo. Los clientes entran sin cuenta por QR."
        eyebrow="Trabajadores"
        icon="user"
        title="Acceso de trabajadores"
      />

      <Card padding="lg">
        {__DEV__ && !isSupabaseConfigured ? (
          <AuthErrorMessage message="Falta configurar Supabase en apps/mobile/.env (solo desarrollo)." />
        ) : null}
        <AuthField
          editable={!isLoading}
          keyboardType="email-address"
          label="Correo de trabajo"
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />

        <AuthField
          editable={!isLoading}
          label="Contraseña"
          onChangeText={setPassword}
          onSubmitEditing={() => void handleSubmit()}
          passwordVisibility={{
            isVisible: isPasswordVisible,
            onToggle: () => setIsPasswordVisible((visible) => !visible),
          }}
          placeholder="Tu contraseña"
          returnKeyType="go"
          textContentType="password"
          value={password}
        />

        <AuthErrorMessage message={error} />
        {justSignedIn && !error ? (
          <AuthNotice message="Sesión iniciada. Entrando a tus barberías…" />
        ) : null}

        <AuthButton label={justSignedIn ? 'Entrando…' : 'Ingresar'} onPress={() => void handleSubmit()} isLoading={isLoading} disabled={isLoading || justSignedIn} />
      </Card>

      <Button href="/" label="¿Eres cliente? Tomar un turno" variant="link" />

      <AuthSwitch
        action="Crear cuenta de trabajador"
        href={customerRegistrationRoute}
        question="¿Trabajas aquí y no tienes cuenta?"
      />
    </Screen>
  );
}
