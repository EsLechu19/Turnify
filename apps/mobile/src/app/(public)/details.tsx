import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar, Button, Card, Icon, IconButton, Screen, StickyBar, StepTracker, TextField } from '@/components/ui';
import { CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { bookingExpectation, formatReferencePrice, selectedBarber } from '@/features/queue/commercial-booking';
import { GUEST_AGE_RANGES, GUEST_GENDERS, normalizeGuestDetails, type GuestAgeRange, type GuestGender } from '@/features/queue/guest-ticket-details';
import { createGuestTicket } from '@/features/queue/public-guest-ticket-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { translateQueueError } from '@/features/queue/queue-api';

const ageLabels: Record<GuestAgeRange, string> = {
  under_18: 'Menos de 18',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_plus': '45 o más',
};

const genderLabels: Record<GuestGender, string> = {
  male: 'Hombre',
  female: 'Mujer',
  prefer_not_to_say: 'Prefiero no decirlo',
};

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const { draft, setDetails, setTicketAccess, setDemoTicket } = useGuestFlow();
  const [name, setName] = useState(draft?.details.name ?? '');
  const [ageRange, setAgeRange] = useState<GuestAgeRange | null>(draft?.details.ageRange ?? null);
  const [gender, setGender] = useState<GuestGender | null>(draft?.details.gender ?? null);
  const [showOptional, setShowOptional] = useState(Boolean(draft?.details.ageRange || draft?.details.gender));
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!draft?.serviceId) {
    return (
      <CustomerPage>
        <CustomerState label="Primero completa la selección del servicio." action={() => router.replace('/(app)')} />
      </CustomerPage>
    );
  }

  const service = draft.catalog.services.find((item) => item.serviceId === draft.serviceId);
  const barber = selectedBarber(
    draft.catalog.barbers,
    draft.requestedBarberId ? { kind: 'named', barberId: draft.requestedBarberId } : { kind: 'any' },
  );
  if (!service) {
    return (
      <CustomerPage>
        <CustomerState
          label="El servicio ya no está disponible."
          action={() => router.replace('/(public)/service')}
        />
      </CustomerPage>
    );
  }

  const currentDraft = draft;
  const selectedService = service;
  const duration = `${Math.ceil(selectedService.estimatedDurationSeconds / 60)} min`;
  const price = formatReferencePrice(selectedService.referencePriceCents);
  const barberPreference = barber?.name ?? 'Cualquier barbero compatible';

  async function confirm() {
    try {
      const details = normalizeGuestDetails({ name, ageRange, gender });
      setDetails(details);
      setIsCreating(true);
      setError(null);

      if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
        const prefix = currentDraft.catalog.name
          .replace(/[^A-Za-z]/g, '')
          .slice(0, 2)
          .toUpperCase() || 'TU';
        const number = 25 + Math.floor(Math.random() * 40);
        setDemoTicket({
          visibleCode: `${prefix}-${number}`,
          status: 'en_espera',
          serviceName: selectedService.name,
          barberName: barberPreference === 'Cualquier barbero compatible' ? null : barberPreference,
          peopleAhead: 1 + Math.floor(Math.random() * 5),
          waitMinutes: 5 + Math.floor(Math.random() * 15),
        });
        router.replace('/(app)');
        return;
      }

      const access = await createGuestTicket({
        companyCode: currentDraft.companyCode,
        serviceId: selectedService.serviceId,
        requestedBarberId: currentDraft.requestedBarberId,
        details,
      });
      setTicketAccess(access);
      router.replace('/(public)/ticket');
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message.includes('Guest name')
          ? 'Ingresa tu nombre para continuar.'
          : translateQueueError(reason instanceof Error ? reason.message : ''),
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: 120 + Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: Palette.canvas, flex: 1 }}
      >
        <BrandBar
          onBack={isCreating ? undefined : () => router.back()}
          right={<Text style={styles.step}>Paso 3 de 3</Text>}
        />

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Verifica tu turno</Text>
          <Text style={[TypeScale.display, { color: Palette.ink }]}>Casi listo</Text>
          <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>Confirma tus datos para generar tu código de turno.</Text>
          <StepTracker activeStep={2} steps={['Servicio', 'Barbero', 'Confirmar']} />
        </View>

        <Card elevated padding="md">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Icon color="#FFFFFF" name="calendar" size={19} />
            </View>
            <View style={styles.summaryTitle}>
              <Text style={styles.summaryLabel}>Resumen de tu visita</Text>
              <Text numberOfLines={1} style={[TypeScale.headline, { color: Palette.ink }]}>
                {currentDraft.catalog.name}
              </Text>
            </View>
            <IconButton
              accessibilityLabel="Editar selección"
              disabled={isCreating}
              name="edit"
              onPress={() => router.push('/(public)/barber')}
              size={38}
              tone="soft"
            />
          </View>

          <View style={styles.summaryFacts}>
            <View style={styles.summaryFact}>
              <Text style={styles.factLabel}>Servicio</Text>
              <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>{selectedService.name}</Text>
              <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
                {duration}
                {price ? ` · ${price}` : ''}
              </Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.summaryFact}>
              <Text style={styles.factLabel}>Preferencia</Text>
              <Text numberOfLines={2} style={[TypeScale.bodyStrong, { color: Palette.ink }]}>
                {barberPreference}
              </Text>
            </View>
          </View>

          <View style={styles.expectation}>
            <Icon color={Palette.brand} name="clock" size={17} />
            <Text style={[TypeScale.caption, { color: Palette.brandDeep, flex: 1 }]}>
              {bookingExpectation(selectedService, barber)}
            </Text>
          </View>
        </Card>

        <Card padding="md">
          <View style={styles.fieldHeading}>
            <View style={styles.fieldIcon}>
              <Icon color={Palette.brand} name="user" size={19} />
            </View>
            <View style={styles.fieldCopy}>
              <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>¿Cómo te llamas?</Text>
              <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Lo usaremos para identificar tu turno.</Text>
            </View>
          </View>
          <TextField
            autoCapitalize="words"
            editable={!isCreating}
            maxLength={80}
            onChangeText={setName}
            placeholder="Escribe tu nombre"
            size="md"
            value={name}
          />
        </Card>

        <Card padding="md" tone="brand">
          <View style={styles.noticeIcon}>
            <Icon color={Palette.brand} name="shield" size={18} />
          </View>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted, flex: 1 }]}>
            No necesitas crear una cuenta ni dejar tu teléfono. Recibirás un código de turno y te llamarán en pantalla o en el local.
          </Text>
        </Card>

        <Card padding="none">
          <View style={styles.optionalTrigger}>
            <View style={styles.fieldCopy}>
              <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Datos opcionales</Text>
              <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Edad y género son completamente opcionales.</Text>
            </View>
            <Button
              accessibilityHint="Muestra u oculta las opciones de edad y género"
              accessibilityState={{ expanded: showOptional }}
              disabled={isCreating}
              icon={showOptional ? 'chevron-down' : 'plus'}
              label={showOptional ? 'Ocultar' : 'Agregar'}
              onPress={() => setShowOptional((visible) => !visible)}
              size="sm"
              variant="secondary"
            />
          </View>

          {showOptional ? (
            <View style={styles.optionalContent}>
              <Text style={styles.choiceLabel}>Rango de edad</Text>
              <View style={styles.chipRow}>
                {GUEST_AGE_RANGES.map((value) => {
                  const selected = ageRange === value;

                  return (
                    <Button
                      accessibilityLabel={ageLabels[value]}
                      accessibilityState={{ selected }}
                      disabled={isCreating}
                      key={value}
                      label={ageLabels[value]}
                      onPress={() => setAgeRange(selected ? null : value)}
                      size="sm"
                      variant={selected ? 'primary' : 'secondary'}
                    />
                  );
                })}
              </View>

              <Text style={styles.choiceLabel}>Género</Text>
              <View accessibilityRole="radiogroup" style={styles.genderChoices}>
                {GUEST_GENDERS.map((value) => {
                  const selected = gender === value;

                  return (
                    <Button
                      accessibilityLabel={genderLabels[value]}
                      accessibilityState={{ selected }}
                      disabled={isCreating}
                      fullWidth
                      key={value}
                      label={genderLabels[value]}
                      onPress={() => setGender(selected ? null : value)}
                      size="md"
                      variant={selected ? 'soft' : 'secondary'}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
        </Card>

        {error ? (
          <View accessibilityRole="alert">
            <Card padding="md" tone="danger">
              <Text style={[TypeScale.bodySmall, { color: Palette.danger }]}>{error}</Text>
              <Text style={[TypeScale.caption, { color: Palette.danger }]}>
                Revisa tus datos o la disponibilidad e inténtalo nuevamente.
              </Text>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <StickyBar style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Button
          accessibilityLabel="Confirmar y obtener código de turno"
          accessibilityState={{ busy: isCreating }}
          disabled={isCreating}
          fullWidth
          icon="check"
          label="Confirmar turno"
          loading={isCreating}
          onPress={() => void confirm()}
          size="lg"
        />
      </StickyBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingHorizontal: space(5), paddingTop: space(2), width: '100%' },
  step: { color: Palette.brand, letterSpacing: 0.7, textAlign: 'right' },
  titleBlock: { gap: space(1.5), paddingHorizontal: space(2), paddingTop: space(2) },
  eyebrow: { color: Palette.goldDeep, letterSpacing: 1 },
  summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brand,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  summaryTitle: { flex: 1, gap: 1 },
  summaryLabel: { color: Palette.inkFaint, letterSpacing: 0.7 },
  summaryFacts: { backgroundColor: Palette.brandSoftest, borderRadius: Radius.medium, flexDirection: 'row', padding: space(3.5) },
  summaryFact: { flex: 1, gap: 2 },
  factDivider: { backgroundColor: Palette.border, marginHorizontal: space(3), width: 1 },
  factLabel: { color: Palette.inkFaint, letterSpacing: 0.7 },
  expectation: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  fieldHeading: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  fieldCopy: { flex: 1, gap: 1 },
  fieldIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  noticeIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionalTrigger: { alignItems: 'center', flexDirection: 'row', gap: space(3), padding: space(4) },
  optionalContent: { borderTopColor: Palette.border, borderTopWidth: 1, gap: space(3), padding: space(4) },
  choiceLabel: { color: Palette.inkFaint, letterSpacing: 0.7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  genderChoices: { gap: space(2) },
});
