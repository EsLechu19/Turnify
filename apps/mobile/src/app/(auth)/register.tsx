import { useState } from 'react';

import { AuthField } from '@/components/auth/auth-field';
import { AuthButton, AuthIntro, AuthSwitch } from '@/components/auth/auth-ui';
import { Card, Screen } from '@/components/ui';
import { AuthNote } from '@/components/auth/auth-field';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const isPasswordValid = password.length >= MIN_PASSWORD_LENGTH;

  if (isRegistered) {
    return (
      <Screen>
        <AuthIntro
          detail="Revisa tu correo para confirmar la cuenta y luego inicia sesión."
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
        detail="Crea tu cuenta para tomar turnos y ver tu historial."
        eyebrow="Cuenta"
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

        <AuthNote>Usamos tu correo solo para avisarte cuando llames tu turno.</AuthNote>

        <AuthButton label="Crear cuenta" onPress={() => setIsRegistered(true)} />
      </Card>

      <AuthSwitch action="Inicia sesión" href="/(auth)/login" question="¿Ya tienes cuenta?" />
    </Screen>
  );
}
