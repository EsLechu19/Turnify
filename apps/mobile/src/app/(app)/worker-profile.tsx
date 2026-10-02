import { ScrollView, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth/auth-ui';
import { WorkerScreenContainer, workerScreenStyles } from '@/components/worker/worker-screen-container';
import { useAuth } from '@/features/auth/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function WorkerProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  return <WorkerScreenContainer activeNavigation="profile"><ScrollView contentContainerStyle={[workerScreenStyles.page, { backgroundColor: theme.background }]}>
    <View style={{ gap: 6 }}><Text style={[workerScreenStyles.eyebrow, { color: theme.primary }]}>Cuenta</Text><Text style={[workerScreenStyles.title, { color: theme.text }]}>Mi perfil</Text><Text style={[workerScreenStyles.detail, { color: theme.textSecondary }]}>Cuenta de trabajador de Turnify.</Text></View>
    <View style={[workerScreenStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 10 }]}><Text style={[workerScreenStyles.eyebrow, { color: theme.textSecondary }]}>CORREO</Text><Text selectable style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>{session?.user.email ?? 'No disponible'}</Text><Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>Los datos de perfil adicionales no están disponibles en esta cuenta.</Text></View>
    <AuthButton label="Cerrar sesión" variant="destructive" onPress={() => void signOut()} />
  </ScrollView></WorkerScreenContainer>;
}
