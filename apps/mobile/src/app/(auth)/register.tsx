import { useState } from 'react';

import { AuthField } from '@/components/auth/auth-field';
import { AuthButton, AuthErrorMessage, AuthIntro, AuthSwitch } from '@/components/auth/auth-ui';
import { Card, Screen } from '@/components/ui';
import { AuthNote } from '@/components/auth/auth-field';
import { useAuth } from '@/features/auth/use-auth';
import { validateWorkerRegistration } from '@/features/worker/worker-access-state';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const isPasswordValid = password.length >= MIN_PASSWORD_LENGTH;

  async function handleSubmit() {
    const validation = validateWorkerRegistration(name, email, password);
    if (validation) {
      setError(validation);
      return;
    }
    setIsLoading(true);
    setError(null);
    // Worker-only registration: the account starts as personal and lands in
    // Mis barberías. Customers never need an account (direct QR entry).
    // Success needs no navigation: the auth guard redirects by role.
    const failure = await signUp(email, password, { name, workerIntent: true });
    setIsLoading(false);
    if (failure) {
      setError(failure);
      return;
    }
    setIsRegistered(true);
  }

  if (isRegistered) {
    return (
      <Screen>
        <AuthIntro
          detail="Inicia sesión y pide el código de invitación en Mis barberías para que te aprueben."
          eyebrow="Casi listo"
          icon="check-circle"
          title="Cuenta creada"
        />
        <Card padding="lg">
          <AuthSwitch action="Ir a iniciar sesión" href="/(auth)/login" question="¿Ya confirmaste tu correo?" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthIntro
        detail="Crea tu cuenta de trabajador para operar en tu barbería."
        eyebrow="Personal"
        icon="user"
        title="Crear cuenta"
      />

      <Card padding="lg">
        <AuthField
          autoCapitalize="words"
          autoCorrect={false}
          label="Nombre"
          onChangeText={setName}
          placeholder="Tu nombre"
          textContentType="name"
          value={name}
        />

        <AuthField
          keyboardType="email-address"
          label="Correo"
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          textContentType="emailAddress"
          value={email}
        />

        <AuthField
          error={!isPasswordValid && password.length > 0 ? `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` : null}
          label="Contraseña"
          onChangeText={setPassword}
          passwordVisibility={{
            isVisible: isPasswordVisible,
            onToggle: () => setIsPasswordVisible((visible) => !visible),
          }}
          placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          textContentType="newPassword"
          value={password}
        />

        <AuthNote>Los clientes entran sin cuenta por QR; esta cuenta es solo para personal.</AuthNote>

        <AuthErrorMessage message={error} />

        <AuthButton label="Crear cuenta" onPress={() => void handleSubmit()} isLoading={isLoading} disabled={isLoading} />
      </Card>

      <AuthSwitch action="Inicia sesión" href="/(auth)/login" question="¿Ya tienes cuenta?" />
    </Screen>
  );
}
