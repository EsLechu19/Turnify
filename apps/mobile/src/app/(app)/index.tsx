import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/use-auth';

export default function HomeScreen() {
  const { session, signOut } = useAuth();

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <ThemedText type="subtitle">Turnify</ThemedText>
        <ThemedText type="small">{session?.user.email ?? ''}</ThemedText>
      </View>

      <ThemedText type="small">
        El flujo de tomar turno llega en el siguiente slice.
      </ThemedText>

      <AuthButton label="Cerrar sesión" onPress={() => void signOut()} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
});
