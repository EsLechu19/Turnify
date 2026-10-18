import { Redirect } from 'expo-router';
import * as Linking from 'expo-linking';
import { Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Palette, space, TypeScale } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { getOwnerOverview, setOwnerBusinessOpen, type OwnerOverview } from '@/features/business/owner-overview-api';
import { StateBlock } from '@/components/ui/state-block';

const adminWebUrl = process.env.EXPO_PUBLIC_ADMIN_WEB_URL?.trim() || null;

export default function AdminLandingScreen() {
  const { session, profile, signOut } = useAuth();
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const hasWorkerMembership = profile?.memberships.some((membership) => membership.role === 'WORKER') ?? false;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getOwnerOverview());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cargar el resumen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session && profile?.role === 'admin') void refresh(); }, [profile?.role, refresh, session]);

  if (!session) return <Redirect href="/" />;
  if (profile?.role !== 'admin') return <Redirect href="/" />;

  return (
    <Screen>
      <View style={{ gap: space(2), paddingTop: space(8) }}>
        <Text style={[TypeScale.eyebrow, { color: Palette.brand }]}>ADMINISTRACIÓN</Text>
        <Text style={[TypeScale.h1, { color: Palette.ink }]}>Resumen de tu negocio</Text>
      </View>
      {loading || error ? <StateBlock loading={loading} error={error} actionLabel="Reintentar" onAction={() => void refresh()} /> : null}
      {overview ? <>
        <Card padding="lg" tone={overview.business.isOpen ? 'success' : 'danger'}>
          <Text style={[TypeScale.eyebrow, { color: Palette.inkMuted }]}>ESTADO ACTUAL</Text>
          <Text style={[TypeScale.title, { color: Palette.ink }]}>{overview.business.isOpen ? 'Abierto' : 'Cerrado'}</Text>
          <Button label={overview.business.isOpen ? 'Cerrar negocio' : 'Abrir negocio'} variant={overview.business.isOpen ? 'danger' : 'success'} loading={updatingStatus} onPress={async () => { setUpdatingStatus(true); try { await setOwnerBusinessOpen(!overview.business.isOpen); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos actualizar el estado.'); } finally { setUpdatingStatus(false); } }} />
        </Card>
        <Card padding="lg">
          <Text style={[TypeScale.headline, { color: Palette.ink }]}>Ahora</Text>
          <Text style={[TypeScale.metric, { color: Palette.brand }]}>{overview.waitingCount}</Text>
          <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>clientes esperando</Text>
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Espera estimada: {overview.estimatedWaitMinutes} min</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Estimación basada en la cola y duración promedio configurada.</Text>
        </Card>
        {overview.alerts.map((alert) => <Card key={alert} padding="md" tone="gold"><Text style={[TypeScale.bodyStrong, { color: Palette.goldInk }]}>Aviso operativo</Text><Text style={[TypeScale.body, { color: Palette.ink }]}>{alert}</Text></Card>)}
        <Card padding="lg"><Text style={[TypeScale.headline, { color: Palette.ink }]}>Equipo</Text>{overview.team.length ? overview.team.map((member) => <Text key={member.barberId} style={[TypeScale.body, { color: Palette.ink }]}>{member.name}: {member.operationalState === 'disponible' ? 'Disponible' : member.operationalState === 'ocupado' ? 'Ocupado' : 'Fuera de turno'}</Text>) : <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>No hay estado de equipo disponible.</Text>}</Card>
        <Card padding="lg"><Text style={[TypeScale.headline, { color: Palette.ink }]}>Hoy</Text><Text style={[TypeScale.body, { color: Palette.ink }]}>Completados: {overview.metrics.completed}</Text><Text style={[TypeScale.body, { color: Palette.ink }]}>Ausentes: {overview.metrics.absent}</Text><Text style={[TypeScale.body, { color: Palette.ink }]}>Esperando: {overview.metrics.waiting} · Activos: {overview.metrics.active}</Text></Card>
        <Card padding="lg" tone="brand"><Text style={[TypeScale.headline, { color: Palette.ink }]}>Código de tu negocio</Text><QRCode value={`turnify:${overview.business.code}`} size={160} /><Text selectable style={[TypeScale.code, { color: Palette.ink }]}>{overview.business.code}</Text><Button label="Copiar o compartir código" variant="secondary" onPress={() => void Share.share({ message: overview.business.code })} /><Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Código verificado desde tu empresa. No generamos un código nuevo.</Text></Card>
        {hasWorkerMembership ? <Card padding="lg" tone="soft"><Text style={[TypeScale.headline, { color: Palette.ink }]}>Operar como trabajador</Text><Text style={[TypeScale.body, { color: Palette.inkMuted }]}>Tu cuenta tiene una membresía WORKER activa, pero el cambio de contexto todavía no está disponible de forma segura.</Text><Button label="Operar como trabajador" disabled variant="secondary" /></Card> : null}
      </> : null}
      <Card padding="lg" tone="soft">
        <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>
          La administración avanzada, servicios, reportes y configuración siguen en el panel web.
        </Text>
        {adminWebUrl ? (
          <Button label="Abrir panel web" onPress={() => void Linking.openURL(adminWebUrl)} />
        ) : (
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Configurá EXPO_PUBLIC_ADMIN_WEB_URL para abrir el panel web.</Text>
        )}
        <Button label="Cerrar sesión" onPress={() => void signOut()} variant="logout" />
      </Card>
    </Screen>
  );
}
