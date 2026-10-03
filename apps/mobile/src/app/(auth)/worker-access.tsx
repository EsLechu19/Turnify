import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
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
  if (session) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Acceso de personal no disponible</ThemedText><ThemedText type="small">Esta cuenta no está autorizada para las operaciones de personal. Usa una cuenta de personal aprobada o consulta con tu administrador.</ThemedText></View><AuthButton label="Cerrar sesión" variant="secondary" onPress={() => void signOut()} /></AuthScreenContainer>;

  async function handleSubmit() {
    const validationError = validateWorkerCredentials(email, password);
    if (validationError) { setError(validationError); return; }
    setIsLoading(true); setError(null);
    setError(await signIn(email, password));
    setIsLoading(false);
  }

  return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Ingresar como personal</ThemedText><ThemedText type="small">Accede con el correo y la contraseña de tu cuenta aprobada.</ThemedText></View>{!isSupabaseConfigured && <ThemedText type="small">Falta configurar Supabase para iniciar sesión.</ThemedText>}<AuthField label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" textContentType="emailAddress" editable={!isLoading} /><AuthField label="Contraseña" value={password} onChangeText={setPassword} placeholder="Tu contraseña" secureTextEntry textContentType="password" passwordVisibility={{ isVisible: isPasswordVisible, onToggle: () => setIsPasswordVisible((visible) => !visible) }} onSubmitEditing={() => void handleSubmit()} editable={!isLoading} /><AuthErrorMessage message={error} /><AuthButton label="Entrar como personal" onPress={() => void handleSubmit()} disabled={isLoading || !isSupabaseConfigured} isLoading={isLoading} /><Link href={workerRegistrationRoute} style={styles.link}>¿No tienes una cuenta? Regístrate como personal</Link></AuthScreenContainer>;
}

const styles = StyleSheet.create({ header: { gap: 4 }, link: { color: '#00686C', fontSize: 14, fontWeight: '600', lineHeight: 20 } });
