import { router } from 'expo-router';
import { useState } from 'react';

import { AuthField } from '@/components/auth/auth-field';
import { AuthButton, AuthIntro, AuthSwitch } from '@/components/auth/auth-ui';
import { Card, Screen } from '@/components/ui';
import { customerRegistrationRoute } from '@/features/public/public-route-policy';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <Screen>
      <AuthIntro
        detail="Accede con el correo y la contraseña de tu cuenta. También puedes entrar directo a una vista."
        eyebrow="Bienvenido"
        title="Iniciar sesión"
      />

      <Card padding="lg">
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

        <AuthButton label="Ingresar" onPress={() => {}} />

        <AuthButton label="Cliente" onPress={() => router.replace('/(app)')} variant="secondary" />
        <AuthButton label="Empleado" onPress={() => router.replace('/(app)/worker')} variant="secondary" />
      </Card>

      <AuthSwitch
        action="Crear cuenta"
        href={customerRegistrationRoute}
        question="¿No tienes una cuenta?"
      />
    </Screen>
  );
}
