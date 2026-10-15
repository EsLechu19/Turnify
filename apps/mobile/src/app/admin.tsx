import { Redirect } from 'expo-router';
import * as Linking from 'expo-linking';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Palette, space, TypeScale } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';

const adminWebUrl = process.env.EXPO_PUBLIC_ADMIN_WEB_URL?.trim() || null;

export default function AdminLandingScreen() {
  const { session, profile, signOut } = useAuth();

  if (!session) return <Redirect href="/" />;
  if (profile?.role !== 'admin') return <Redirect href="/" />;

  return (
    <Screen>
      <View style={{ gap: space(2), paddingTop: space(8) }}>
        <Text style={[TypeScale.eyebrow, { color: Palette.brand }]}>ADMINISTRACIÓN</Text>
        <Text style={[TypeScale.h1, { color: Palette.ink }]}>Usá el panel web de Turnify</Text>
      </View>
      <Card padding="lg" tone="soft">
        <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>
          Esta cuenta administra una empresa y no puede usar las operaciones de personal desde la app móvil.
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
