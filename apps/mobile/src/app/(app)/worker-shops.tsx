import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthErrorMessage } from '@/components/auth/auth-ui';
import { Button, Card, Icon, OptionCard, Pill, Row, Screen, TextField } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { getMyPendingWorkerRequests, getWorkerShops, requestWorkerInvitation, selectWorkerShop, type PendingWorkerRequest, type WorkerShop } from '@/features/worker/worker-membership-api';

/**
 * Post-login worker gate: approved shops first, join-by-code while waiting for
 * the admin, pending requests listed. Choosing a shop enters the worker panel.
 */
export default function WorkerShopsScreen() {
  const { profile, isProfileLoading, reloadProfile, signOut } = useAuth();
  const [shops, setShops] = useState<WorkerShop[]>([]);
  const [pending, setPending] = useState<PendingWorkerRequest[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextShops, nextPending] = await Promise.all([getWorkerShops(), getMyPendingWorkerRequests()]);
      setShops(nextShops);
      setPending(nextPending);
      setError(null);
    } catch {
      setError('No pudimos cargar tus barberías. Inténtalo nuevamente.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!isProfileLoading && profile?.role !== 'personal') return <Redirect href="/" />;

  async function submitCode() {
    setIsActing(true);
    setError(null);
    try {
      await requestWorkerInvitation(code);
      setCode('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar la solicitud.');
    } finally {
      setIsActing(false);
    }
  }

  async function chooseShop(shop: WorkerShop) {
    setIsActing(true);
    setError(null);
    try {
      await selectWorkerShop(shop.businessId);
      await reloadProfile();
      router.replace('/(app)/worker');
    } catch {
      setError('No pudimos seleccionar la barbería. Inténtalo nuevamente.');
    } finally {
      setIsActing(false);
    }
  }

  return (
    <Screen>
      <Card elevated padding="lg" tone="brand">
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Icon color="#FFFFFF" name="storefront" size={24} />
          </View>
          <Pill label={shops.length === 1 ? '1 APROBADA' : `${shops.length} APROBADAS`} tone="brand" />
        </View>
        <Text style={[TypeScale.eyebrow, { color: Palette.brandDeep }]}>CUENTA PERSONAL</Text>
        <Text style={[TypeScale.title, { color: Palette.ink }]}>Mis barberías</Text>
        <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>
          Elige dónde operar hoy. Puedes pertenecer a varias y cambiar cuando quieras.
        </Text>
      </Card>

      {shops.length > 0 ? (
        <View style={styles.section}>
          {shops.map((shop) => (
            <OptionCard
              accessibilityLabel={shop.isCurrent ? `${shop.name}, barbería actual` : `Entrar a ${shop.name}`}
              badge={shop.isCurrent ? 'ACTUAL' : 'ENTRAR'}
              badgeTone={shop.isCurrent ? 'success' : 'brand'}
              detail={shop.isCurrent ? 'Operando aquí ahora' : 'Toca para operar aquí'}
              disabled={isActing}
              icon="storefront"
              key={shop.businessId}
              onPress={() => void chooseShop(shop)}
              selected={shop.isCurrent}
              title={shop.name}
            />
          ))}
        </View>
      ) : null}

      <Card padding="lg" style={styles.section}>
        <View style={styles.sectionHeading}>
          <View style={styles.joinIcon}>
            <Icon color={Palette.brand} name="code" size={20} />
          </View>
          <View style={styles.sectionTitles}>
            <Text style={[TypeScale.headline, { color: Palette.ink }]}>Unirme a una barbería</Text>
            <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
              Pide el código al administrador para este correo.
            </Text>
          </View>
        </View>
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isActing}
          label="Código de invitación"
          onChangeText={setCode}
          onSubmitEditing={() => void submitCode()}
          placeholder="Código recibido"
          returnKeyType="send"
          value={code}
        />
        <Button
          disabled={isActing || !code.trim()}
          fullWidth
          iconRight="arrow-right"
          label="Enviar solicitud"
          loading={isActing}
          onPress={() => void submitCode()}
        />
      </Card>

      {pending.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.listLabel}>
            <Pill icon="clock" label="SOLICITUDES PENDIENTES" tone="gold" />
          </View>
          {pending.map((request) => (
            <Row
              badge="En espera"
              badgeTone="gold"
              detail="El administrador la está revisando"
              icon="clock"
              key={request.businessId}
              title={request.name}
            />
          ))}
        </View>
      ) : null}

      {shops.length === 0 && pending.length === 0 ? (
        <Card padding="lg" tone="soft">
          <Text style={[TypeScale.body, { color: Palette.inkMuted, textAlign: 'center' }]}>
            Todavía no tienes barberías. Cuando un administrador apruebe tu solicitud, aparecerá aquí.
          </Text>
        </Card>
      ) : null}

      <AuthErrorMessage message={error} />

      <Button
        fullWidth
        icon="logout"
        label="Cerrar sesión"
        onPress={() => {
          void signOut().then(() => router.replace('/'));
        }}
        variant="ghost"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brand,
    borderRadius: Radius.medium,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  section: { gap: space(3) },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  sectionTitles: { flex: 1, gap: space(0.5) },
  joinIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  listLabel: { alignItems: 'flex-start' },
});
