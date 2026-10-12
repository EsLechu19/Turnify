import { Alert, ScrollView, View } from 'react-native';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { WorkerButton, WorkerPill, WorkerText, workerUiStyles } from '@/components/worker/worker-ui';
import { useAuth } from '@/features/auth/use-auth';
import { getWorkerShops, type WorkerShop } from '@/features/worker/worker-membership-api';

/** Slim account card shown INSIDE a shop. No data editing, no dead lists. */
export function WorkerOperationalAccount() {
  const { signOut } = useAuth();
  const [currentShop, setCurrentShop] = useState<WorkerShop | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setCurrentShop({ businessId: 'demo', name: 'Barbería Demo', isCurrent: true });
      return () => {
        active = false;
      };
    }
    void getWorkerShops().then((next) => {
      if (active) setCurrentShop(next.find((shop) => shop.isCurrent) ?? null);
    }).catch(() => {
      if (active) setCurrentShop(null);
    });
    return () => {
      active = false;
    };
  }, []));

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir en mitad del turno?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={workerUiStyles.page}>
      <View style={{ gap: 4 }}>
        <WorkerText variant="eyebrow">Cuenta</WorkerText>
        <WorkerText variant="title">Estás dentro</WorkerText>
        <WorkerText>De la operación vuelves a tu cuenta en un tap.</WorkerText>
      </View>

      <View style={workerUiStyles.card}>
        <View style={workerUiStyles.split}>
          <WorkerText variant="headline">{currentShop?.name ?? 'Sin barbería activa'}</WorkerText>
          {currentShop ? <WorkerPill label="ACTUAL" tone="teal" /> : null}
        </View>
        <WorkerButton label="Ir a Hoy" onPress={() => router.replace('/(app)/worker')} />
        <WorkerButton label="Volver a cuenta personal" tone="secondary" onPress={() => router.push('/(app)/worker-shops')} />
        <WorkerButton label="Ver servicios por barbería" tone="secondary" onPress={() => router.push('/(app)/worker-services')} />
      </View>

      <View style={workerUiStyles.card}>
        <WorkerText variant="headline">Sesión</WorkerText>
        <WorkerButton label="Cerrar sesión" tone="logout" onPress={confirmSignOut} />
      </View>
    </ScrollView>
  );
}
