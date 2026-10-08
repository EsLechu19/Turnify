import { Redirect } from 'expo-router';
import { useState } from 'react';

import { AuthButton, AuthErrorMessage, AuthIntro, AuthNotice, AuthSwitch } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/use-auth';
import { resolveWorkerAccessState, validateWorkerRegistration } from '@/features/worker/worker-access-state';

export default function WorkerRegisterScreen() {
  const { signUp, signOut, session, profile, isProfileLoading, isSupabaseConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const accessState = resolveWorkerAccessState(profile, isProfileLoading);

  if (session && accessState === 'resolving') return null;
  if (session && accessState === 'approved') return <Redirect href="/(app)/worker" />;
  if (session && accessState === 'awaiting-assignment') return <Redirect href="/(app)/worker-shops" />;
  if (session) {
    return (
      <Screen>
        <AuthIntro
          detail="Esta sesión no corresponde a una cuenta de personal autorizada."
          eyebrow="Acceso bloqueado"
          icon="shield"
          title="Registro no disponible"
        />
        <AuthButton label="Cerrar sesión" onPress={() => void signOut()} variant="secondary" />
      </Screen>
    );
  }

  if (awaitingConfirmation) {
    return (
      <Screen>
        <AuthIntro
          detail="Revisa tu correo y confirma la cuenta antes de iniciar sesión. La confirmación no habilita operaciones: un administrador todavía debe asignarte a una barbería."
          eyebrow="Pendiente"
          icon="mail"
          title="Confirma tu correo"
        />
        <AuthSwitch action="Ir al acceso de personal" href="/(auth)/worker-access" question="¿Ya confirmaste tu correo?" />
      </Screen>
    );
  }

  async function register() {
    const validationError = validateWorkerRegistration(name, email, password);
    if (validationError) { setError(validationError); return; }
    setIsLoading(true); setError(null);
    const failure = await signUp(email, password, { name, workerIntent: true });
    if (failure) setError(failure); else setAwaitingConfirmation(true);
    setIsLoading(false);
  }

  return (
    <Screen>
      <AuthIntro
        detail="Crea tu cuenta. Un administrador deberá aprobar tu acceso a una barbería antes de habilitar operaciones."
        eyebrow="Equipo"
        icon="user"
        title="Registro de personal"
      />

      {!isSupabaseConfigured && <AuthNotice message="Falta configurar Supabase para crear la cuenta." />}

      <Card padding="lg">
        <AuthField
          editable={!isLoading}
          label="Nombre"
          onChangeText={setName}
          placeholder="Tu nombre"
          textContentType="name"
          value={name}
        />
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
          passwordVisibility={{ isVisible: isPasswordVisible, onToggle: () => setIsPasswordVisible((visible) => !visible) }}
          placeholder="Mínimo 6 caracteres"
          textContentType="newPassword"
          value={password}
        />

        <AuthErrorMessage message={error} />

        <AuthButton
          disabled={isLoading || !isSupabaseConfigured}
          isLoading={isLoading}
          label="Crear cuenta de personal"
          onPress={() => void register()}
        />
      </Card>

      <AuthSwitch action="Ya tengo una cuenta" href="/(auth)/worker-access" question="¿Ya tienes cuenta de personal?" />
    </Screen>
  );
}