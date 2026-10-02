import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { acceptPersonalInvitation, translateInvitationError } from '@/features/business/business-api';
import { useAuth } from '@/features/auth/use-auth';
import { workerIntentOutcome } from '@/features/public/public-route-policy';

const MIN_PASSWORD_LENGTH = 6;

export default function WorkerRegisterScreen() {
  const { signUp, reloadProfile, session, profile, isProfileLoading, isSupabaseConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitation, setInvitation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (session && isProfileLoading) return null;
  if (session && workerIntentOutcome(profile) === 'worker') return <Redirect href="/(app)/worker" />;
  if (session && !profile) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">No pudimos verificar tu perfil</ThemedText><ThemedText type="small">No podemos aceptar una invitación ni habilitar operaciones sin un perfil válido. Cierra sesión e intenta de nuevo; si continúa, contacta a tu administrador.</ThemedText></View><Link href="/(auth)/worker-access" style={styles.link}>Volver al acceso de personal</Link></AuthScreenContainer>;
  if (session && profile?.role === 'admin') return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Esta cuenta no puede registrarse como personal</ThemedText><ThemedText type="small">Una cuenta administradora no se convierte en cuenta operativa de barbero.</ThemedText></View><Link href="/(auth)/worker-access" style={styles.link}>Volver al acceso de personal</Link></AuthScreenContainer>;

  async function acceptInvitation() {
    setIsLoading(true); setError(null); setNotice(null);
    try { await acceptPersonalInvitation(invitation); const next = await reloadProfile(); if (workerIntentOutcome(next) !== 'worker') setError('La invitación fue aceptada, pero no se pudo preparar el perfil de barbero. Contacta a tu administrador.'); }
    catch (reason) { setError(translateInvitationError(reason instanceof Error ? reason.message : '')); }
    finally { setIsLoading(false); }
  }
  async function register() {
    setIsLoading(true); setError(null); setNotice(null);
    const failure = await signUp(email, password, { name });
    if (failure) setError(failure); else setNotice('Confirma tu correo si se te solicita. Luego inicia sesión y canjea la invitación para completar tu perfil de personal.');
    setIsLoading(false);
  }

  if (session) return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Completa tu registro de personal</ThemedText><ThemedText type="small">Ingresa el código de invitación enviado por el administrador de tu barbería. Este paso crea tu perfil operativo de barbero; no elegiremos una barbería por ti.</ThemedText></View><AuthField label="Código de invitación" value={invitation} onChangeText={setInvitation} placeholder="Código de invitación" autoCapitalize="none" editable={!isLoading} /><AuthErrorMessage message={error} /><AuthButton label="Aceptar invitación" onPress={() => void acceptInvitation()} disabled={!invitation.trim() || isLoading} isLoading={isLoading} /></AuthScreenContainer>;

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && !isLoading;
  return <AuthScreenContainer><View style={styles.header}><ThemedText type="subtitle">Registro de personal</ThemedText><ThemedText type="small">Necesitas una invitación emitida por el administrador de una barbería. No puedes elegir una barbería desde aquí.</ThemedText></View>{!isSupabaseConfigured && <ThemedText type="small">Falta configurar Supabase para crear la cuenta.</ThemedText>}<AuthField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" textContentType="name" editable={!isLoading} /><AuthField label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" textContentType="emailAddress" editable={!isLoading} /><AuthField label="Contraseña" value={password} onChangeText={setPassword} placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`} secureTextEntry textContentType="newPassword" editable={!isLoading} /><AuthErrorMessage message={error} />{notice && <ThemedText type="small">{notice}</ThemedText>}<AuthButton label="Crear cuenta de personal" onPress={() => void register()} disabled={!canSubmit || !isSupabaseConfigured} isLoading={isLoading} /><Link href="/(auth)/worker-access" style={styles.link}>Ya tengo una cuenta</Link></AuthScreenContainer>;
}

const styles = StyleSheet.create({ header: { gap: 4 }, link: { color: '#3c87f7', fontSize: 14, fontWeight: '600', lineHeight: 20 } });
