import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';
import { workerIntentOutcome } from '@/features/public/public-route-policy';
import { registerAsWorker } from '@/features/worker/worker-membership-api';

const MIN_PASSWORD_LENGTH = 6;

export default function WorkerRegisterScreen() {
  const { signUp, reloadProfile, session, profile, isProfileLoading, isSupabaseConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (session && isProfileLoading) return null;
  if (session && workerIntentOutcome(profile) === 'worker') return <Redirect href="/(app)/worker" />;
  if (session && !profile) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">No pudimos verificar tu perfil</ThemedText><ThemedText type="small">No podemos habilitar operaciones sin un perfil válido. Cierra sesión e intenta de nuevo; si continúa, contacta a tu administrador.</ThemedText></View><Link href="/(auth)/worker-access" style={styles.link}>Volver al acceso de personal</Link></AuthScreenContainer>;
  if (session && profile?.role === 'admin') return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Esta cuenta no puede registrarse como personal</ThemedText><ThemedText type="small">Una cuenta administradora no se convierte en cuenta operativa de barbero.</ThemedText></View><Link href="/(auth)/worker-access" style={styles.link}>Volver al acceso de personal</Link></AuthScreenContainer>;

  async function registerWorkerProfile() { setIsLoading(true); setError(null); try { await registerAsWorker(); await reloadProfile(); setNotice('Tu cuenta está creada. Un administrador debe aprobar tu acceso antes de que puedas operar.'); } catch { setError('No pudimos preparar tu cuenta de personal.'); } finally { setIsLoading(false); } }
  async function register() {
    setIsLoading(true); setError(null); setNotice(null);
    const failure = await signUp(email, password, { name, workerIntent: true });
    if (failure) setError(failure); else setNotice('Confirma tu correo si se te solicita. Luego inicia sesión para completar tu cuenta de personal; el acceso operativo espera la aprobación de un administrador.');
    setIsLoading(false);
  }

  if (session) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Completa tu registro de personal</ThemedText><ThemedText type="small">Tu cuenta de personal es independiente. Un administrador debe aprobar tu acceso a una barbería antes de habilitar operaciones.</ThemedText></View><AuthErrorMessage message={error} />{notice && <ThemedText type="small">{notice}</ThemedText>}<AuthButton label="Crear perfil de personal" onPress={() => void registerWorkerProfile()} disabled={isLoading || profile?.role === 'personal'} isLoading={isLoading} /><Link href="/(auth)/worker-access" style={styles.link}>Ir al acceso de personal</Link></AuthScreenContainer>;

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && !isLoading;
  return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Registro de personal</ThemedText><ThemedText type="small">Crea tu cuenta independiente. Un administrador deberá aprobar tu acceso a una barbería antes de habilitar operaciones.</ThemedText></View>{!isSupabaseConfigured && <ThemedText type="small">Falta configurar Supabase para crear la cuenta.</ThemedText>}<AuthField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" textContentType="name" editable={!isLoading} /><AuthField label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" textContentType="emailAddress" editable={!isLoading} /><AuthField label="Contraseña" value={password} onChangeText={setPassword} placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`} secureTextEntry textContentType="newPassword" editable={!isLoading} /><AuthErrorMessage message={error} />{notice && <ThemedText type="small">{notice}</ThemedText>}<AuthButton label="Crear cuenta de personal" onPress={() => void register()} disabled={!canSubmit || !isSupabaseConfigured} isLoading={isLoading} /><Link href="/(auth)/worker-access" style={styles.link}>Ya tengo una cuenta</Link></AuthScreenContainer>;
}

const styles = StyleSheet.create({ header: { gap: 4 }, link: { color: '#3c87f7', fontSize: 14, fontWeight: '600', lineHeight: 20 } });
