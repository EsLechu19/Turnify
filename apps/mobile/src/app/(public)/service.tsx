import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar, Button, Card, Icon, OptionCard, Screen, StickyBar, StepTracker } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { formatReferencePrice } from '@/features/queue/commercial-booking';
import type { CommercialService } from '@/features/queue/commercial-queue-api';

function durationLabel(service: CommercialService) {
  return `${Math.ceil(service.estimatedDurationSeconds / 60)} min`;
}

function ServiceOption({ selected, service, onPress }: { selected: boolean; service: CommercialService; onPress(): void }) {
  const referencePrice = formatReferencePrice(service.referencePriceCents);

  return (
    <OptionCard
      accessibilityLabel={`Elegir ${service.name}`}
      badge={selected ? 'Elegido' : undefined}
      badgeTone="brand"
      detail={service.description ?? undefined}
      icon="scissors"
      meta={`${durationLabel(service)}${referencePrice ? ` · ${referencePrice}` : ''}`}
      onPress={onPress}
      selected={selected}
      title={service.name}
    />
  );
}

export default function ServiceScreen() {
  const insets = useSafeAreaInsets();
  const { draft, chooseService } = useGuestFlow();

  if (!draft) {
    return (
      <CustomerPage>
        <CustomerState label="Primero identifica una barbería." action={() => router.replace('/(app)')} />
      </CustomerPage>
    );
  }

  const selectedService = draft.catalog.services.find((service) => service.serviceId === draft.serviceId) ?? null;
  const selectedPrice = selectedService ? formatReferencePrice(selectedService.referencePriceCents) : null;

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: 150 + Math.max(insets.bottom, 16) }]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: Palette.canvas, flex: 1 }}
      >
        <BrandBar onBack={() => router.back()} step="1/3" />

        <View style={styles.intro}>
          <Text style={styles.shopName}>{draft.catalog.name}</Text>
          <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>Elige tu servicio</Text>
          <Text style={[TypeScale.body, styles.subtitle]}>
            Selecciona lo que necesitas antes de elegir tu barbero.
          </Text>
          <StepTracker activeStep={0} steps={['Servicio', 'Barbero', 'Confirmar']} />
        </View>

        <Card padding="md" tone="brand">
          <View style={styles.durationIcon}>
            <Icon color={Palette.brand} name="clock" size={19} />
          </View>
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>El tiempo depende del servicio</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            Mostramos una duración estimada para que elijas con información clara.
          </Text>
        </Card>

        {draft.catalog.services.length === 0 ? (
          <Card padding="lg">
            <Text style={[TypeScale.title, { color: Palette.ink, textAlign: 'center' }]}>
              No hay servicios activos disponibles.
            </Text>
            <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted, textAlign: 'center' }]}>
              Consulta en el local para conocer cuándo volver a intentar.
            </Text>
          </Card>
        ) : (
          <View accessibilityRole="radiogroup" style={styles.serviceList}>
            {draft.catalog.services.map((service) => (
              <ServiceOption
                key={service.serviceId}
                onPress={() => chooseService(service.serviceId)}
                selected={draft.serviceId === service.serviceId}
                service={service}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <StickyBar style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Icon color={Palette.brand} name={selectedService ? 'scissors' : 'clock'} size={18} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>Servicio seleccionado</Text>
            <Text numberOfLines={1} style={[TypeScale.bodyStrong, { color: Palette.ink }]}>
              {selectedService?.name ?? 'Elige una opción'}
            </Text>
            {selectedService ? (
              <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
                {durationLabel(selectedService)}
                {selectedPrice ? ` · ${selectedPrice}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
        <Button
          accessibilityLabel="Continuar para elegir un barbero"
          accessibilityState={{ disabled: !selectedService }}
          disabled={!selectedService}
          fullWidth
          iconRight="arrow-right"
          label="Continuar"
          onPress={() => router.push('/(public)/barber')}
          size="lg"
        />
      </StickyBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingHorizontal: space(5), paddingTop: space(2), width: '100%' },
  intro: { alignItems: 'center', gap: space(2), paddingHorizontal: space(2), paddingTop: space(2) },  shopName: { color: Palette.brandDeep, textAlign: 'center' },
  subtitle: { color: Palette.inkMuted, maxWidth: 350, textAlign: 'center' },
  durationIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  serviceList: { gap: space(3) },
  summary: { alignItems: 'center', flexDirection: 'row', gap: space(3), minHeight: 46 },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  summaryCopy: { flex: 1, gap: 1 },
  summaryLabel: { color: Palette.inkFaint, letterSpacing: 0.7 },
});
