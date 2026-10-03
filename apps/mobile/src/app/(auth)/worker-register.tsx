import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';
import { resolveWorkerAccessState, validateWorkerRegistration } from '@/features/worker/worker-access-state';

function AwaitingAssignment({ signOut }: { signOut(): Promise<void> }) {
  return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Tu cuenta está lista</ThemedText><ThemedText type="small">Tu acceso operativo está en espera. Un administrador local debe agregar exactamente este correo a una barbería aprobada.</ThemedText></View><AuthButton label="Cerrar sesión" variant="secondary" onPress={() => void signOut()} /></AuthScreenContainer>;
}

export default function WorkerRegisterScreen() {
  const { signUp, signOut, session, profile, isProfileLoading, isSupabaseConfigured } = useAuth();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); const [error, setError] = useState<string | null>(null); const [isLoading, setIsLoading] = useState(false); const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const accessState = resolveWorkerAccessState(profile, isProfileLoading);

  if (session && accessState === 'resolving') return null;
  if (session && accessState === 'approved') return <Redirect href="/(app)/worker" />;
  if (session && accessState === 'awaiting-assignment') return <AwaitingAssignment signOut={signOut} />;
  if (session) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Registro no disponible</ThemedText><ThemedText type="small">Esta sesión no corresponde a una cuenta de personal autorizada.</ThemedText></View><AuthButton label="Cerrar sesión" variant="secondary" onPress={() => void signOut()} /></AuthScreenContainer>;
  if (awaitingConfirmation) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Confirma tu correo</ThemedText><ThemedText type="small">Revisa tu correo y confirma la cuenta antes de iniciar sesión. La confirmación no habilita operaciones: un administrador todavía debe asignarte a una barbería.</ThemedText></View><Link href="/(auth)/worker-access" style={styles.link}>Ir al acceso de personal</Link></AuthScreenContainer>;

  async function register() {
    const validationError = validateWorkerRegistration(name, email, password);
    if (validationError) { setError(validationError); return; }
    setIsLoading(true); setError(null);
    const failure = await signUp(email, password, { name, workerIntent: true });
    if (failure) setError(failure); else setAwaitingConfirmation(true);
    setIsLoading(false);
  }

  return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Registro de personal</ThemedText><ThemedText type="small">Crea tu cuenta. Un administrador deberá aprobar tu acceso a una barbería antes de habilitar operaciones.</ThemedText></View>{!isSupabaseConfigured && <ThemedText type="small">Falta configurar Supabase para crear la cuenta.</ThemedText>}<AuthField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" textContentType="name" editable={!isLoading} /><AuthField label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" textContentType="emailAddress" editable={!isLoading} /><AuthField label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry textContentType="newPassword" passwordVisibility={{ isVisible: isPasswordVisible, onToggle: () => setIsPasswordVisible((visible) => !visible) }} editable={!isLoading} /><AuthErrorMessage message={error} /><AuthButton label="Crear cuenta de personal" onPress={() => void register()} disabled={isLoading || !isSupabaseConfigured} isLoading={isLoading} /><Link href="/(auth)/worker-access" style={styles.link}>Ya tengo una cuenta</Link></AuthScreenContainer>;
}

const styles = StyleSheet.create({ header: { gap: 4 }, link: { color: '#00686C', fontSize: 14, fontWeight: '600', lineHeight: 20 } });
