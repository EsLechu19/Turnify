import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { CustomerHeading, CustomerPage, CustomerState, TurnCard } from '@/components/customer/customer-ui';
import { Button, Icon, Pill } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { nearbyBarberias, type BarberDirectoryEntry } from '@/features/customer/barber-directory';
import { getCustomerActiveTicket, type TicketHistoryItem } from '@/features/customer/customer-api';
import { staffLanding } from '@/features/public/public-route-policy';
import { DEFAULT_DEMO_TICKET, useGuestFlow } from '@/features/public/guest-flow-session';
import { formatEstimatedWait } from '@/features/queue/ticket-presentation';
import { useEstimatedWaitSeconds } from '@/features/queue/use-estimated-wait';

export default function AppIndexScreen() {
  const { profile, isProfileLoading, session } = useAuth();
  const { beginDiscovery, demoTicket } = useGuestFlow();
  const [activeTicket, setActiveTicket] = useState<TicketHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    async function load() {
      if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
        const source = demoTicket ?? DEFAULT_DEMO_TICKET;
        setActiveTicket({
          id: `demo-${source.visibleCode}`,
          visibleCode: source.visibleCode,
          status: source.status,
          operatingDate: new Date().toISOString().slice(0, 10),
          origin: 'app',
          createdAt: new Date().toISOString(),
          serviceName: source.serviceName,
        });
        setIsLoading(false);
        setError(null);
        return;
      }
      if (!session?.user.id) return;
      setIsLoading(true);
      try {
        const ticket = await getCustomerActiveTicket(session.user.id);
        if (mounted) {
          setActiveTicket(ticket);
          setError(null);
        }
      } catch {
        if (mounted) setError('No pudimos cargar tu turno actual.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [demoTicket, session?.user.id]));

  const nearby = useMemo(() => nearbyBarberias(5), []);
  const demoWaitMinutes = demoTicket?.waitMinutes ?? DEFAULT_DEMO_TICKET.waitMinutes;
  const estimatedWaitSeconds = useEstimatedWaitSeconds(
    activeTicket?.status === 'en_espera' || activeTicket?.status === 'notificado'
      ? activeTicket.id.startsWith('demo')
        ? demoWaitMinutes
        : null
      : null,
  );

  function openBarberia(entry: BarberDirectoryEntry) {
    beginDiscovery(entry.code, entry.catalog);
    router.push('/(public)/service');
  }

  if (isProfileLoading) return null;
  if (process.env.EXPO_PUBLIC_SKIP_AUTH !== '1' && (profile?.role === 'personal' || profile?.role === 'admin')) return <Redirect href={staffLanding(profile)} />;

  return (
    <CustomerScreenContainer activeNavigation="home">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <CustomerHeading eyebrow="Inicio" title="Hola" detail="Tu turno actual y las barberías más cercanas." />

        {isLoading ? <CustomerState label="Cargando tu turno…" isLoading /> : null}
        {error ? <CustomerState label={error} detail="Revisa tu conexión e intenta nuevamente." /> : null}
        {!isLoading && !error && activeTicket ? (
          <TurnCard
            code={activeTicket.visibleCode}
            detail={activeTicket.origin === 'app' ? 'Origen: App' : 'Origen: Presencial'}
            peopleAhead={activeTicket.id.startsWith('demo') ? (demoTicket?.peopleAhead ?? DEFAULT_DEMO_TICKET.peopleAhead) : undefined}
            serviceName={activeTicket.serviceName}
            status={activeTicket.status}
            waitLabel={activeTicket.id.startsWith('demo') ? (estimatedWaitSeconds > 0 ? `~${formatEstimatedWait(estimatedWaitSeconds)}` : 'Próximo') : null}
            onPress={() => router.push('/(public)/ticket')}
          />
        ) : null}
        {!isLoading && !error && !activeTicket ? (
          <CustomerState label="No tienes un turno activo" detail="Escanea un código o elige una barbería para tomar turno." />
        ) : null}

        <Button fullWidth icon="qr" label="Escanear código QR" onPress={() => router.push('/(public)/scan')} />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <Icon color={Palette.brand} name="map-pin" size={18} />
            <Text style={styles.sectionTitle}>Cercanas a ti</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver todas las barberías" onPress={() => router.replace('/(app)/barbers')}>
            <Pill label="VER TODAS" tone="brand" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyRow}>
          {nearby.map((entry) => (
            <Pressable
              key={entry.businessId}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${entry.name}`}
              onPress={() => openBarberia(entry)}
              style={({ pressed }) => [styles.nearbyCard, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={styles.nearbyTop}>
                <Text numberOfLines={1} style={styles.nearbyName}>{entry.name}</Text>
                <Pill label={entry.isOpen ? 'Abierto' : 'Cerrado'} tone={entry.isOpen ? 'success' : 'neutral'} />
              </View>
              <View style={styles.nearbyMetaRow}>
                <Icon color={Palette.inkFaint} name="map-pin" size={13} />
                <Text style={styles.nearbyMeta}>{entry.distanceKm.toFixed(1)} km</Text>
                <Icon color={Palette.inkFaint} name="clock" size={13} />
                <Text style={styles.nearbyMeta}>~{entry.etaMinutes} min</Text>
              </View>
              <View style={styles.nearbyMetaRow}>
                <Icon color={Palette.inkFaint} name="scissors" size={13} />
                <Text style={styles.nearbyMeta}>{entry.catalog.services.length} servicios</Text>
                <Icon color={Palette.inkFaint} name="user" size={13} />
                <Text style={styles.nearbyMeta}>{entry.catalog.barbers.filter((item) => item.operationalState === 'disponible').length} libres</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
    </CustomerScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 640, paddingBottom: space(8), paddingHorizontal: space(4), paddingTop: space(4), width: '100%' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitleWrap: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  sectionTitle: { color: Palette.ink, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  nearbyRow: { gap: space(3), paddingRight: space(4) },
  nearbyCard: { backgroundColor: Palette.brandSoftest, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, gap: space(2), padding: space(4), width: 220 },
  nearbyTop: { alignItems: 'center', flexDirection: 'row', gap: space(2), justifyContent: 'space-between' },
  nearbyName: { color: Palette.ink, flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  nearbyMetaRow: { alignItems: 'center', flexDirection: 'row', gap: space(1) },
  nearbyMeta: { color: Palette.inkMuted, fontSize: 12, fontWeight: '500', lineHeight: 17, marginRight: space(2) },
});
