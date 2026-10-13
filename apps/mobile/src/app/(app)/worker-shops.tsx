import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AuthErrorMessage } from '@/components/auth/auth-ui';
import { WorkerAccountContainer } from '@/components/worker/worker-account-container';
import { Button, Card, Icon, OptionCard, Pill, Row, Screen, Skeleton, TextField } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { getMyPendingWorkerRequests, getWorkerShops, requestWorkerInvitation, selectWorkerShop, type PendingWorkerRequest, type WorkerShop } from '@/features/worker/worker-membership-api';

/**
 * Post-login worker gate: approved shops first, join-by-code while waiting for
 * the admin, pending requests listed. Choosing a shop enters the worker panel.
 */
export default function WorkerShopsScreen() {
  const { reloadProfile, signOut } = useAuth();
  const [shops, setShops] = useState<WorkerShop[]>([]);
  const [pending, setPending] = useState<PendingWorkerRequest[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isMounted = useRef(false);

  const load = useCallback(async () => {
    try {
      const [nextShops, nextPending] = await Promise.all([getWorkerShops(), getMyPendingWorkerRequests()]);
      if (!isMounted.current) return;
      setShops(nextShops);
      setPending(nextPending);
      setHasLoaded(true);
      setError(null);
    } catch {
      if (isMounted.current) {
        setHasLoaded(true);
        setError('No pudimos cargar tus barberías. Revisa tu conexión e inténtalo nuevamente.');
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
    };
  }, [load]));

  const joinExpanded = joinOpen || (hasLoaded && shops.length === 0);

  async function submitCode() {
    setIsSubmittingCode(true);
    setError(null);
    try {
      await requestWorkerInvitation(code);
      setCode('');
      setJoinOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar la solicitud.');
    } finally {
      setIsSubmittingCode(false);
    }
  }

  async function chooseShop(shop: WorkerShop) {
    // The current shop is navigation only: never re-select what is active.
    if (shop.isCurrent) {
      router.replace('/(app)/worker');
      return;
    }
    setChoosingId(shop.businessId);
    setError(null);
    try {
      await selectWorkerShop(shop.businessId);
      await reloadProfile();
      router.replace('/(app)/worker');
    } catch {
      setError('No pudimos seleccionar la barbería. Inténtalo nuevamente.');
    } finally {
      setChoosingId(null);
    }
  }

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <WorkerAccountContainer activeNavigation="shops">
      <Screen>
      <Card elevated padding="lg" tone="brand">
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Icon color="#FFFFFF" name="storefront" size={24} />
          </View>
          <View style={styles.heroPills}>
            <Pill label={shops.length === 0 ? 'SIN BARBERÍAS' : shops.length === 1 ? '1 APROBADA' : `${shops.length} APROBADAS`} tone="brand" />
            {pending.length > 0 ? <Pill label={pending.length === 1 ? '1 PENDIENTE' : `${pending.length} PENDIENTES`} tone="gold" /> : null}
          </View>
        </View>
        <Text style={[TypeScale.eyebrow, { color: Palette.brandDeep }]}>CUENTA PERSONAL</Text>
        <Text style={[TypeScale.title, { color: Palette.ink }]}>Mis barberías</Text>
        <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>
          Elige dónde operar hoy. Puedes pertenecer a varias y cambiar cuando quieras.
        </Text>
      </Card>

      {!hasLoaded && !error ? (
        <View style={styles.section}>
          <Skeleton height={76} />
          <Skeleton height={76} />
        </View>
      ) : null}

      {shops.length > 0 ? (
        <View style={styles.section}>
          {shops.map((shop) => (
            <OptionCard
              accessibilityLabel={shop.isCurrent ? `${shop.name}, barbería actual` : `Entrar a ${shop.name}`}
              badge={shop.isCurrent ? 'ACTUAL' : choosingId === shop.businessId ? 'ENTRANDO…' : 'ENTRAR'}
              badgeTone={shop.isCurrent ? 'success' : 'brand'}
              detail={shop.isCurrent ? 'Toca para entrar sin cambiar nada' : 'Toca para operar aquí'}
              disabled={choosingId !== null}
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
        {joinExpanded ? (
          <>
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmittingCode}
              label="Código de invitación"
              onChangeText={setCode}
              onSubmitEditing={() => void submitCode()}
              placeholder="Código recibido"
              returnKeyType="send"
              value={code}
            />
            <Button
              disabled={isSubmittingCode || !code.trim()}
              fullWidth
              iconRight="arrow-right"
              label="Enviar solicitud"
              loading={isSubmittingCode}
              onPress={() => void submitCode()}
            />
          </>
        ) : (
          <Button
            fullWidth
            label="Tengo un código"
            onPress={() => setJoinOpen(true)}
            variant="secondary"
          />
        )}
        {shops.length > 0 && joinExpanded ? (
          <Button
            fullWidth
            label="Ocultar"
            onPress={() => setJoinOpen(false)}
            variant="ghost"
          />
        ) : null}
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

      {hasLoaded && shops.length === 0 && pending.length === 0 && !error ? (
        <Card padding="lg" tone="soft">
          <Text style={[TypeScale.body, { color: Palette.inkMuted, textAlign: 'center' }]}>
            Todavía no tienes barberías. Pide el código al administrador e ingrésalo en “Unirme a una barbería”.
          </Text>
        </Card>
      ) : null}

      <AuthErrorMessage message={error} />
      {error ? (
        <Button
          fullWidth
          label="Reintentar"
          onPress={() => void load()}
          variant="secondary"
        />
      ) : null}

      <Button
        fullWidth
        icon="logout"
        label="Cerrar sesión"
        onPress={confirmSignOut}
        variant="logout"
      />
      </Screen>
    </WorkerAccountContainer>
  );
}

const styles = StyleSheet.create({
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroPills: { alignItems: 'flex-end', gap: 6 },
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
