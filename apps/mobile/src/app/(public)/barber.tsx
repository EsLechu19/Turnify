import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar, Button, Card, Icon, OptionCard, Pill, Screen, StickyBar, StepTracker } from '@/components/ui';
import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { compatibleBarbers } from '@/features/queue/commercial-booking';
import type { CommercialBarber } from '@/features/queue/commercial-queue-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';

function BarberOption({ barber, selected, onPress }: { barber: CommercialBarber; selected: boolean; onPress(): void }) {
  const available = barber.operationalState === 'disponible';
  const status = available ? 'Disponible' : 'Ocupado';

  return (
    <OptionCard
      accessibilityLabel={`Elegir a ${barber.name}, ${status}`}
      badge={status}
      badgeTone={available ? 'success' : 'neutral'}
      onPress={onPress}
      selected={selected}
      title={barber.name}
    />
  );
}

export default function BarberScreen() {
  const insets = useSafeAreaInsets();
  const { draft, chooseBarber } = useGuestFlow();

  if (!draft?.serviceId) {
    return (
      <CustomerPage>
        <CustomerState label="Primero elige un servicio." action={() => router.replace('/(public)/service')} />
      </CustomerPage>
    );
  }

  const selectedService = draft.catalog.services.find((service) => service.serviceId === draft.serviceId) ?? null;
  const duration = selectedService ? `${Math.ceil(selectedService.estimatedDurationSeconds / 60)} min` : null;
  const barbers = compatibleBarbers(draft.catalog, draft.serviceId);
  const hasBarbers = barbers.length > 0;

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: 140 + Math.max(insets.bottom, 16) }]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: Palette.canvas, flex: 1 }}
      >
        <BrandBar onBack={() => router.back()} step="2/3" />

        <View style={styles.intro}>
          <Text style={styles.shopName}>{draft.catalog.name}</Text>
          <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>Elige tu barbero</Text>
          <Text style={[TypeScale.body, styles.subtitle]}>
            Puedes indicar una preferencia o dejar la elección flexible.
          </Text>
          <StepTracker activeStep={1} steps={['Servicio', 'Barbero', 'Confirmar']} />
        </View>

        {selectedService ? (
          <Card padding="sm" tone="brand">
            <View style={styles.serviceIcon}>
              <Icon color={Palette.brand} name="scissors" size={18} />
            </View>
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceLabel}>Servicio seleccionado</Text>
              <Text numberOfLines={1} style={[TypeScale.bodyStrong, { color: Palette.ink }]}>
                {selectedService.name}
              </Text>
            </View>
            {duration ? <Text style={styles.duration}>{duration}</Text> : null}
          </Card>
        ) : null}

        {hasBarbers ? (
          <View accessibilityRole="radiogroup" style={styles.options}>
            <OptionCard
              accessibilityLabel="Elegir cualquier barbero compatible"
              badge="Elección flexible"
              badgeTone="gold"
              detail="Damos preferencia al primer barbero compatible que esté disponible cuando llamen tu turno."
              icon="sparkle"
              onPress={() => chooseBarber(null)}
              selected={draft.requestedBarberId === null}
              title="Cualquier barbero compatible"
            />

            <View style={styles.listLabel}>
              <Pill label="O elige una preferencia" tone="neutral" />
            </View>

            {barbers.map((barber) => (
              <BarberOption
                barber={barber}
                key={barber.barberId}
                onPress={() => chooseBarber(barber.barberId)}
                selected={draft.requestedBarberId === barber.barberId}
              />
            ))}
          </View>
        ) : (
          <Card padding="lg">
            <View style={styles.emptyIcon}>
              <Icon color={Palette.brand} name="user" size={22} />
            </View>
            <Text style={[TypeScale.title, { color: Palette.ink, textAlign: 'center' }]}>
              No hay barberos compatibles en turno.
            </Text>
            <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted, textAlign: 'center' }]}>
              Vuelve a elegir un servicio o consulta en el local.
            </Text>
          </Card>
        )}

        <Card padding="md" tone="brand">
          <View style={styles.infoIcon}>
            <Icon color={Palette.brand} name="info" size={19} />
          </View>
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Tu preferencia queda registrada</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            Si eliges un barbero específico, tu turno espera a que pueda atenderte. La asignación ocurre cuando llamen tu turno.
          </Text>
        </Card>
      </ScrollView>

      <StickyBar style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View style={styles.bottomHint}>
          <Icon color={Palette.inkMuted} name={draft.requestedBarberId === null ? 'sparkle' : 'user'} size={15} />
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            {draft.requestedBarberId === null ? 'Elección flexible' : 'Barbero seleccionado'}
          </Text>
        </View>
        <Button
          accessibilityLabel="Continuar con los datos del turno"
          accessibilityState={{ disabled: !hasBarbers }}
          disabled={!hasBarbers}
          fullWidth
          iconRight="arrow-right"
          label="Continuar"
          onPress={() => router.push('/(public)/details')}
          size="lg"
        />
      </StickyBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingHorizontal: space(5), paddingTop: space(2), width: '100%' },
  intro: { alignItems: 'center', gap: space(2), paddingHorizontal: space(2), paddingTop: space(2) },
  shopName: { color: Palette.brandDeep, textAlign: 'center' },
  subtitle: { color: Palette.inkMuted, maxWidth: 350, textAlign: 'center' },
  serviceIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  serviceCopy: { flex: 1, gap: 1 },
  serviceLabel: { color: Palette.inkFaint, letterSpacing: 0.7 },
  duration: { color: Palette.brandDeep },
  options: { gap: space(3) },
  listLabel: { alignItems: 'center', paddingTop: space(1) },
  emptyIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.medium,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  bottomHint: { alignItems: 'center', flexDirection: 'row', gap: space(1.5) },
});
