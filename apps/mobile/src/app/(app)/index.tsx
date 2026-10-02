import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage } from '@/components/customer/customer-ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/features/auth/use-auth';
import { normalizeBusinessCode } from '@/features/queue/queue-api';

export default function HomeScreen() {
  const theme = useTheme();
  const { profile, isProfileLoading, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  function handlePreview() { const validCode = normalizeBusinessCode(code); if (!validCode) { setError('Ingresa un código de empresa válido.'); return; } setError(null); router.push({ pathname: '/(app)/preview', params: { code: validCode } }); }
  if (isProfileLoading) return null;
  if (profile?.role === 'personal' && profile.businessId) return <Redirect href="/(app)/worker" />;
  if (profile?.role === 'admin' && profile.businessId) return <Redirect href="/(app)/admin" />;
  return <CustomerScreenContainer activeNavigation="home"><CustomerPage>
    <View style={{ alignItems: 'center', gap: 8, paddingTop: 20 }}><View style={{ alignItems: 'center', backgroundColor: theme.primary, borderRadius: 16, height: 48, justifyContent: 'center', width: 48 }}><View style={{ backgroundColor: theme.background, borderRadius: 2, height: 20, width: 20 }} /></View><CustomerHeading eyebrow="Turnify · En vivo" title="Tu turno, sin esperar de más" detail="Escanea el código QR de la barbería o ingresa su código para unirte a la fila." /></View>
    <CustomerCard style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}><View style={{ borderColor: theme.primary, borderRadius: 20, borderWidth: 2, height: 140, width: 140 }} /><View style={{ height: 2, backgroundColor: theme.primary, width: 112 }} /><TextInput accessibilityLabel="Código de empresa" value={code} onChangeText={setCode} placeholder="Ej. TURNO-123" placeholderTextColor={theme.textSecondary} autoCapitalize="characters" onSubmitEditing={handlePreview} style={{ alignSelf: 'stretch', backgroundColor: theme.background, borderColor: theme.border, borderRadius: 10, borderWidth: 1, color: theme.text, minHeight: 52, paddingHorizontal: 14 }} /></CustomerCard>
    {error && <CustomerCard style={{ borderColor: theme.destructive }}><View><CustomerHeading title={error} /></View></CustomerCard>}
    <CustomerButton label="Ver servicios" onPress={handlePreview} /><CustomerButton label="Escanear código QR" variant="secondary" onPress={() => router.push('/(app)/scan')} /><CustomerButton label="Cerrar sesión" variant="secondary" onPress={() => void signOut()} />
  </CustomerPage></CustomerScreenContainer>;
}
