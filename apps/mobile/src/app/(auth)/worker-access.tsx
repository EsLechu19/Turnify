import { Redirect } from 'expo-router';
import { useState } from 'react';

import { AuthButton, AuthErrorMessage, AuthIntro, AuthNotice, AuthSwitch } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/use-auth';
import { workerRegistrationRoute } from '@/features/public/public-route-policy';
import { resolveWorkerAccessState, validateWorkerCredentials } from '@/features/worker/worker-access-state';

export default function WorkerAccessScreen() {
  const { signIn, signOut, session, profile, isProfileLoading, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const accessState = resolveWorkerAccessState(profile, isProfileLoading);

  if (session && accessState === 'resolving') return null;
  if (session && accessState === 'approved') return <Redirect href="/(app)/worker" />;
  if (session && accessState === 'awaiting-assignment') return <Redirect href="/(app)/worker-shops" />;
  if (session) {
    return (
      <Screen>
        <AuthIntro
          detail="Esta cuenta no está autorizada para las operaciones de personal. Usa una cuenta de personal aprobada o consulta con tu administrador."
          eyebrow="Acceso bloqueado"
          icon="shield"
          title="Acceso de personal no disponible"
        />
        <AuthButton label="Cerrar sesión" onPress={() => void signOut()} variant="secondary" />
      </Screen>
    );
  }

  async function handleSubmit() {
    const validationError = validateWorkerCredentials(email, password);
    if (validationError) { setError(validationError); return; }
    setIsLoading(true); setError(null);
    setError(await signIn(email, password));
    setIsLoading(false);
  }

  return (
    <Screen>
      <AuthIntro
        detail="Accede con el correo y la contraseña de tu cuenta aprobada."
        eyebrow="Equipo"
        icon="user"
        title="Ingresar como personal"
      />

      {!isSupabaseConfigured && <AuthNotice message="Falta configurar Supabase para iniciar sesión." />}

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
          onSubmitEditing={() => void handleSubmit()}
          passwordVisibility={{ isVisible: isPasswordVisible, onToggle: () => setIsPasswordVisible((visible) => !visible) }}
          placeholder="Tu contraseña"
          textContentType="password"
          value={password}
        />

        <AuthErrorMessage message={error} />

        <AuthButton
          disabled={isLoading || !isSupabaseConfigured}
          isLoading={isLoading}
          label="Entrar como personal"
          onPress={() => void handleSubmit()}
        />
      </Card>

      <AuthSwitch action="Regístrate como personal" href={workerRegistrationRoute} question="¿No tienes una cuenta?" />
    </Screen>
  );
}