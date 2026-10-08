import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { AuthField } from '@/components/auth/auth-field';
import { ThemedText } from '@/components/themed-text';
import { AppCard } from '@/components/ui/surface';
import { useAuth } from '@/features/auth/use-auth';
import { getMyPendingWorkerRequests, getWorkerShops, requestWorkerInvitation, selectWorkerShop, type PendingWorkerRequest, type WorkerShop } from '@/features/worker/worker-membership-api';

export default function WorkerShopsScreen() {
  const { profile, isProfileLoading, reloadProfile, signOut } = useAuth();
  const [shops, setShops] = useState<WorkerShop[]>([]);
  const [pending, setPending] = useState<PendingWorkerRequest[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const load = useCallback(async () => {
    try { const [nextShops, nextPending] = await Promise.all([getWorkerShops(), getMyPendingWorkerRequests()]); setShops(nextShops); setPending(nextPending); setError(null); }
    catch { setError('No pudimos cargar tus barberías. Inténtalo nuevamente.'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!isProfileLoading && profile?.role !== 'personal') return <Redirect href="/" />;
  async function submitCode() { setIsActing(true); setError(null); try { await requestWorkerInvitation(code); setCode(''); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo enviar la solicitud.'); } finally { setIsActing(false); } }
  async function chooseShop(shop: WorkerShop) { setIsActing(true); setError(null); try { await selectWorkerShop(shop.businessId); await reloadProfile(); router.replace('/(app)/worker'); } catch { setError('No pudimos seleccionar la barbería. Inténtalo nuevamente.'); } finally { setIsActing(false); } }
  return <AuthScreenContainer><ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 24 }} keyboardShouldPersistTaps="handled"><View style={{ gap: 4 }}><ThemedText type="eyebrow" themeColor="primary">Cuenta personal</ThemedText><ThemedText type="subtitle">Mis barberías</ThemedText><ThemedText type="small">Selecciona una barbería aprobada antes de comenzar tu jornada.</ThemedText></View>
    {shops.length > 0 && <AppCard style={{ gap: 10 }}><ThemedText type="smallBold">Barberías aprobadas</ThemedText>{shops.map((shop) => <AuthButton key={shop.businessId} label={shop.isCurrent ? `${shop.name} (actual)` : `Seleccionar ${shop.name}`} variant={shop.isCurrent ? 'secondary' : 'primary'} onPress={() => void chooseShop(shop)} disabled={isActing} />)}</AppCard>}
    <AppCard style={{ gap: 10 }}><ThemedText type="smallBold">Unirme a una barbería</ThemedText><ThemedText type="small">Ingresa el código que te compartió el administrador para este correo.</ThemedText><AuthField label="Código de invitación" value={code} onChangeText={setCode} placeholder="Código recibido" autoCapitalize="none" editable={!isActing} /><AuthButton label="Enviar solicitud" onPress={() => void submitCode()} disabled={isActing || !code.trim()} isLoading={isActing} /></AppCard>
    {pending.length > 0 && <AppCard style={{ gap: 6 }}><ThemedText type="smallBold">Solicitudes pendientes</ThemedText>{pending.map((request) => <ThemedText key={request.businessId} type="small">{request.name} · Esperando aprobación</ThemedText>)}</AppCard>}
    <AuthErrorMessage message={error} /><AuthButton label="Cerrar sesión" variant="secondary" onPress={async () => { await signOut(); router.replace('/(auth)/login'); }} /></ScrollView></AuthScreenContainer>;
}
