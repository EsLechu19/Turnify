import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState, ProfileHeader } from '@/components/customer/customer-ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { getCustomerProfile, updateCustomerProfile } from '@/features/customer/customer-api';
import { useAuth } from '@/features/auth/use-auth';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
      setName('Cliente Demo');
      setPhone('987 654 321');
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!session?.user.id) return;
    setIsLoading(true);
    try {
      const profile = await getCustomerProfile(session.user.id);
      setName(profile?.name ?? '');
      setPhone(profile?.phone ?? '');
      setError(null);
    } catch {
      setError('No pudimos cargar tu perfil. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') { setFeedback('Datos guardados en modo demo.'); return; }
    if (!session?.user.id) return;
    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const profile = await updateCustomerProfile(session.user.id, name, phone);
      setName(profile?.name ?? '');
      setPhone(profile?.phone ?? '');
      setFeedback('Tus datos se guardaron correctamente.');
    } catch {
      setError('No pudimos guardar tus datos. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <CustomerScreenContainer activeNavigation="profile">
      <CustomerPage>
        <CustomerHeading eyebrow="Cuenta" title="Mi perfil" detail="Mantén tus datos de contacto actualizados." />
        {isLoading ? <CustomerState label="Cargando perfil…" isLoading /> : (
          <>
            <ProfileHeader name={name} email={process.env.EXPO_PUBLIC_SKIP_AUTH === '1' ? 'cliente@turnify.com' : session?.user.email ?? null} />
            <CustomerCard>
              <Text style={[TypeScale.eyebrow, { color: Palette.inkFaint }]}>CORREO</Text>
              <Text style={[TypeScale.body, { color: Palette.ink }]}>{process.env.EXPO_PUBLIC_SKIP_AUTH === '1' ? 'cliente@turnify.com' : session?.user.email ?? 'No disponible'}</Text>
            </CustomerCard>
            <CustomerCard>
              <Text style={[TypeScale.h3, { color: Palette.ink }]}>Datos de contacto</Text>
              <View style={{ gap: space(2) }}>
                <Text style={[TypeScale.label, { color: Palette.inkMuted }]}>Nombre</Text>
                <TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={Palette.inkFaint} style={styles.input} />
              </View>
              <View style={{ gap: space(2) }}>
                <Text style={[TypeScale.label, { color: Palette.inkMuted }]}>Teléfono</Text>
                <TextInput accessibilityLabel="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Tu teléfono" placeholderTextColor={Palette.inkFaint} style={styles.input} />
              </View>
              <CustomerButton label={isSaving ? 'Guardando…' : 'Guardar cambios'} disabled={isSaving} onPress={() => void save()} />
              {feedback ? <Text style={[TypeScale.caption, { color: Palette.successInk }]}>{feedback}</Text> : null}
              {error ? <Text style={[TypeScale.caption, { color: Palette.dangerInk }]}>{error}</Text> : null}
            </CustomerCard>
            <CustomerButton label="Cerrar sesión" variant="destructive" onPress={async () => { await signOut(); router.replace('/'); }} />
          </>
        )}
      </CustomerPage>
    </CustomerScreenContainer>
  );
}

const styles = {
  input: { backgroundColor: Palette.brandSoftest, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, color: Palette.ink, minHeight: 52, paddingHorizontal: space(4) },
};
