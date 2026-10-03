import { ScrollView, Text, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { AuthButton } from '@/components/auth/auth-ui';
import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { useAuth } from '@/features/auth/use-auth';
import { getWorkerShops, selectWorkerShop, type WorkerShop } from '@/features/worker/worker-membership-api';
import { useTheme } from '@/hooks/use-theme';

export default function WorkerProfileScreen() {
  const theme = useTheme();
  const { session, signOut, reloadProfile } = useAuth();
  const [shops, setShops] = useState<WorkerShop[]>([]);
  useFocusEffect(useCallback(() => { void getWorkerShops().then(setShops).catch(() => setShops([])); }, []));
  return <WorkerScreenContainer activeNavigation="profile"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View style={{ gap: 6 }}><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Cuenta</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Mi perfil</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Cuenta de trabajador de Turnify.</Text></View>
    <View style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 10 }]}><Text style={[workerScreenStyles.eyebrow, { color: theme.textSecondary }]}>CORREO</Text><Text selectable style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>{session?.user.email ?? 'No disponible'}</Text><Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>Selecciona una barbería aprobada antes de operar.</Text>{shops.length === 0 ? <Text style={{ color: theme.textSecondary }}>Tu acceso aún espera la aprobación de un administrador.</Text> : shops.map((shop) => <AuthButton key={shop.businessId} label={shop.isCurrent ? `${shop.name} (actual)` : shop.name} variant="secondary" onPress={() => void selectWorkerShop(shop.businessId).then(reloadProfile)} />)}</View>
    <AuthButton label="Cerrar sesión" variant="destructive" onPress={() => void signOut()} />
  </ScrollView></WorkerScreenContainer>;
}
