import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { workerIntentOutcome, workerRegistrationRoute } from '@/features/public/public-route-policy';
import { useAuth } from '@/features/auth/use-auth';

export default function WorkerAccessScreen() {
  const { signIn, signOut, session, profile, isProfileLoading, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (session && isProfileLoading) return null;
  if (session) {
    const outcome = workerIntentOutcome(profile);
    if (outcome === 'worker') return <Redirect href="/(app)/worker" />;
    const detail = outcome === 'missing-profile'
      ? 'No pudimos verificar tu perfil de personal. Cierra sesión e intenta de nuevo; si continúa, contacta a tu administrador.'
      : outcome === 'missing-business'
        ? 'Tu cuenta de personal aún no tiene una barbería aprobada. Solicita a un administrador que agregue tu correo.'
        : 'Esta cuenta no es una cuenta de personal. No puede acceder a las operaciones de barberos.';
    return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Acceso de personal no disponible</ThemedText><ThemedText type="small">{detail}</ThemedText></View>{outcome === 'not-worker' && <Link href={workerRegistrationRoute} style={styles.link}>Tengo una invitación de personal</Link>}<AuthButton label="Volver al inicio" variant="secondary" onPress={() => void signOut()} /></AuthScreenContainer>;
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;
  async function handleSubmit() { setIsLoading(true); setError(null); setError(await signIn(email, password)); setIsLoading(false); }

  return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Ingresar como personal</ThemedText><ThemedText type="small">Acceso exclusivo para barberos y personal autorizado.</ThemedText></View>{!isSupabaseConfigured && <ThemedText type="small">Falta configurar Supabase para iniciar sesión.</ThemedText>}<AuthField label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" textContentType="emailAddress" editable={!isLoading} /><AuthField label="Contraseña" value={password} onChangeText={setPassword} placeholder="Tu contraseña" secureTextEntry textContentType="password" onSubmitEditing={handleSubmit} editable={!isLoading} /><AuthErrorMessage message={error} /><AuthButton label="Entrar como personal" onPress={handleSubmit} disabled={!canSubmit || !isSupabaseConfigured} isLoading={isLoading} /><Link href={workerRegistrationRoute} style={styles.link}>¿Tienes una invitación? Regístrate como personal</Link></AuthScreenContainer>;
}

const styles = StyleSheet.create({ header: { gap: 4 }, link: { color: '#3c87f7', fontSize: 14, fontWeight: '600', lineHeight: 20 } });
