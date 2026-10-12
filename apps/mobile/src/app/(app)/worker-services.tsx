import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { WorkerButton, WorkerPill, WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';
import { formatReferencePrice } from '@/features/queue/commercial-booking';
import { getWorkerShops, type WorkerShop } from '@/features/worker/worker-membership-api';
import { getMyWorkerServices, type WorkerServiceGroup } from '@/features/worker/worker-profile-api';

export default function WorkerServicesScreen() {
  const [shops, setShops] = useState<WorkerShop[]>([]);
  const [serviceGroups, setServiceGroups] = useState<WorkerServiceGroup[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;

    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setShops([{ businessId: 'demo', name: 'Barbería Demo', isCurrent: true }]);
      setSelectedShopId('demo');
      setServiceGroups([{ businessId: 'demo', businessName: 'Barbería Demo', isCurrent: true, services: [
        { serviceId: 'demo-1', name: 'Corte clásico', description: null, durationSeconds: 1800, priceCents: 2000 },
        { serviceId: 'demo-2', name: 'Perfilado de barba', description: null, durationSeconds: 1200, priceCents: 1500 },
      ] }]);
      setServicesError(null);
      return () => {
        active = false;
      };
    }

    void getWorkerShops().then((next) => {
      if (active) {
        setShops(next);
        setSelectedShopId((current) => current ?? next.find((shop) => shop.isCurrent)?.businessId ?? next[0]?.businessId ?? null);
      }
    }).catch(() => {
      if (active) setShops([]);
    });
    void getMyWorkerServices().then((next) => {
      if (active) {
        setServiceGroups(next);
        setServicesError(null);
      }
    }).catch(() => {
      if (active) setServicesError('No pudimos cargar tus servicios.');
    });

    return () => {
      active = false;
    };
  }, []));

  const serviceShopOptions = shops.length > 0
    ? shops.map((shop) => ({ businessId: shop.businessId, name: shop.name, isCurrent: shop.isCurrent }))
    : serviceGroups.map((shop) => ({ businessId: shop.businessId, name: shop.businessName, isCurrent: shop.isCurrent }));
  const currentShop = shops.find((shop) => shop.isCurrent) ?? null;
  const activeServiceShopId = selectedShopId ?? currentShop?.businessId ?? serviceShopOptions[0]?.businessId ?? null;
  const selectedServiceGroup = serviceGroups.find((shop) => shop.businessId === activeServiceShopId) ?? null;

  return (
    <WorkerScreenContainer activeNavigation="profile">
      <ScrollView contentContainerStyle={workerUiStyles.page}>
        <View style={{ gap: 4 }}>
          <WorkerText variant="eyebrow" color={workerColors.teal}>Cuenta</WorkerText>
          <WorkerText variant="title">Servicios por barbería</WorkerText>
          <WorkerText color={workerColors.muted}>Entra a una barbería para ver únicamente los servicios que ofrece.</WorkerText>
        </View>

        {servicesError ? <WorkerText color={workerColors.error}>{servicesError}</WorkerText> : null}
        {!servicesError && serviceShopOptions.length === 0 ? <WorkerText color={workerColors.muted}>No tienes barberías aprobadas todavía.</WorkerText> : null}

        <View style={styles.selector}>
          {serviceShopOptions.map((shop) => {
            const isSelected = shop.businessId === activeServiceShopId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={shop.businessId}
                onPress={() => setSelectedShopId(shop.businessId)}
                style={[styles.shopOption, isSelected ? styles.shopOptionSelected : null]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <WorkerText variant="headline">{shop.name}</WorkerText>
                  <WorkerText color={workerColors.muted}>{shop.isCurrent ? 'Barbería activa' : 'Membresía aprobada'}</WorkerText>
                </View>
                {isSelected ? <WorkerPill label="VER SERVICIOS" tone="teal" /> : null}
              </Pressable>
            );
          })}
        </View>

        {selectedServiceGroup ? (
          <View style={workerUiStyles.card}>
            <WorkerText variant="label" color={workerColors.teal}>{selectedServiceGroup.businessName}</WorkerText>
            {selectedServiceGroup.services.length === 0 ? <WorkerText color={workerColors.muted}>Sin servicios asignados.</WorkerText> : selectedServiceGroup.services.map((service) => (
              <View key={service.serviceId} style={styles.serviceRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <WorkerText variant="headline">{service.name}</WorkerText>
                  <WorkerText color={workerColors.muted}>{service.description ?? 'Tiempo y precio referencial'}</WorkerText>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <WorkerText variant="label" color={workerColors.teal}>{Math.round(service.durationSeconds / 60)} min</WorkerText>
                  <WorkerText variant="label" color={workerColors.muted}>{formatReferencePrice(service.priceCents) ?? '—'}</WorkerText>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <WorkerButton label="Volver al perfil" tone="secondary" onPress={() => router.replace('/(app)/worker-profile')} />
      </ScrollView>
    </WorkerScreenContainer>
  );
}

const styles = StyleSheet.create({
  selector: { gap: 8 },
  shopOption: { alignItems: 'center', backgroundColor: workerColors.card, borderColor: workerColors.outline, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 12 },
  shopOptionSelected: { backgroundColor: workerColors.container, borderColor: workerColors.teal },
  serviceRow: { alignItems: 'center', borderTopColor: workerColors.outline, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingTop: 12 },
});
