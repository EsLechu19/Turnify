import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { AuthButton, AuthErrorMessage } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { AppCard, StatusBadge } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';
import { bookingExpectation, compatibleBarbers, formatReferencePrice, selectedBarber, type BarberChoice } from '@/features/queue/commercial-booking';
import { getCommercialCatalog, takeCommercialTurn, type CommercialCatalog } from '@/features/queue/commercial-queue-api';
import { normalizeBusinessCode, translateQueueError } from '@/features/queue/queue-api';

export default function PreviewScreen() {
  const theme = useTheme();
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const code = normalizeBusinessCode(rawCode ?? '');
  const [catalog, setCatalog] = useState<CommercialCatalog | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [barberChoice, setBarberChoice] = useState<BarberChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTakingTurn, setIsTakingTurn] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!code) {
      setError('El código de empresa no es válido.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextCatalog = await getCommercialCatalog(code);
      setCatalog(nextCatalog);
      setSelectedServiceId(null);
      setBarberChoice(null);
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedService = catalog?.services.find((service) => service.serviceId === selectedServiceId) ?? null;
  const compatible = catalog ? compatibleBarbers(catalog, selectedServiceId) : [];
  const chosenBarber = selectedBarber(compatible, barberChoice);
  const canSubmit = Boolean(catalog?.open && selectedService && barberChoice && !isTakingTurn);

  async function handleTakeTurn() {
    if (!code || !selectedService || !barberChoice) return;
    setIsTakingTurn(true);
    setError(null);
    try {
      const ticket = await takeCommercialTurn({
        companyCode: code,
        serviceId: selectedService.serviceId,
        requestedBarberId: barberChoice.kind === 'named' ? barberChoice.barberId : null,
      });
      router.replace({ pathname: '/(app)/ticket', params: { ticketId: ticket.ticketId, queueId: ticket.queueId } });
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
    } finally {
      setIsTakingTurn(false);
    }
  }

  return (
    <CustomerScreenContainer activeNavigation="home">
      <ThemedText type="eyebrow" themeColor="primary">Turnify</ThemedText>
      <ThemedText type="subtitle">Reserva tu lugar</ThemedText>
      {isLoading && <ThemedText type="small">Consultando la barbería…</ThemedText>}
      <AuthErrorMessage message={error} />
      {error && !isLoading && <AuthButton label="Reintentar" variant="secondary" onPress={() => void loadCatalog()} />}
      {catalog && (
        <View style={styles.content}>
          <AppCard>
            <ThemedText type="smallBold">{catalog.name}</ThemedText>
            <StatusBadge label={catalog.open ? 'Abierto ahora' : 'Cerrado ahora'} tone={catalog.open ? 'success' : 'destructive'} />
          </AppCard>
          {!catalog.open && <ThemedText type="small">Esta barbería está cerrada en este momento.</ThemedText>}
          <ThemedText type="smallBold">Elige un servicio</ThemedText>
          {catalog.services.map((service) => {
            const isSelected = selectedServiceId === service.serviceId;
            const price = formatReferencePrice(service.referencePriceCents);
            return (
            <Pressable
              key={service.serviceId}
              accessibilityRole="button"
              accessibilityLabel={`Servicio: ${service.name}`}
              accessibilityState={{ selected: isSelected, disabled: isTakingTurn || !catalog.open }}
              onPress={() => { setSelectedServiceId(service.serviceId); setBarberChoice(null); }}
              disabled={isTakingTurn || !catalog.open}
              style={({ pressed }) => [
                styles.queueCard,
                { backgroundColor: theme.backgroundElement, borderColor: isSelected ? theme.primary : theme.border, opacity: pressed ? 0.86 : 1 },
              ]}>
              <View style={styles.queueRow}>
                <ThemedText type="smallBold">{service.name}</ThemedText>
                {isSelected && <StatusBadge label="Seleccionado" tone="primary" />}
              </View>
              {service.description && <ThemedText type="small">{service.description}</ThemedText>}
              <ThemedText type="small">{Math.ceil(service.estimatedDurationSeconds / 60)} min{price ? ` · Referencia ${price}` : ''}</ThemedText>
            </Pressable>
          );
          })}
          {catalog.services.length === 0 && <ThemedText type="small">No hay servicios activos disponibles.</ThemedText>}
          {selectedService && (
            <>
              <ThemedText type="smallBold">¿Con quién deseas atenderte?</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cualquier barbero disponible"
                accessibilityState={{ selected: barberChoice?.kind === 'any', disabled: isTakingTurn || !catalog.open }}
                onPress={() => setBarberChoice({ kind: 'any' })}
                disabled={isTakingTurn || !catalog.open}
                style={({ pressed }) => [styles.queueCard, { backgroundColor: theme.backgroundElement, borderColor: barberChoice?.kind === 'any' ? theme.primary : theme.border, opacity: pressed ? 0.86 : 1 }]}>
                <ThemedText type="smallBold">Cualquier barbero disponible</ThemedText>
                <ThemedText type="small">La opción más rápida según la compatibilidad del servicio.</ThemedText>
              </Pressable>
              {compatible.map((barber) => {
                const isSelected = barberChoice?.kind === 'named' && barberChoice.barberId === barber.barberId;
                return (
                  <Pressable
                    key={barber.barberId}
                    accessibilityRole="button"
                    accessibilityLabel={`Barbero: ${barber.name}, ${barber.operationalState === 'ocupado' ? 'atendiendo' : 'disponible'}`}
                    accessibilityState={{ selected: isSelected, disabled: isTakingTurn || !catalog.open }}
                    onPress={() => setBarberChoice({ kind: 'named', barberId: barber.barberId })}
                    disabled={isTakingTurn || !catalog.open}
                    style={({ pressed }) => [styles.queueCard, { backgroundColor: theme.backgroundElement, borderColor: isSelected ? theme.primary : theme.border, opacity: pressed ? 0.86 : 1 }]}>
                    <View style={styles.queueRow}>
                      <ThemedText type="smallBold">{barber.name}</ThemedText>
                      <StatusBadge label={barber.operationalState === 'ocupado' ? 'Atendiendo' : 'Disponible'} tone={barber.operationalState === 'ocupado' ? 'neutral' : 'success'} />
                    </View>
                  </Pressable>
                );
              })}
              {compatible.length === 0 && <ThemedText type="small">No hay barberos en turno compatibles con este servicio.</ThemedText>}
            </>
          )}
          {selectedService && barberChoice && (
            <AppCard>
              <ThemedText type="smallBold">Confirma tu turno</ThemedText>
              <ThemedText type="small">{selectedService.name} · {chosenBarber?.name ?? 'Cualquier barbero disponible'}</ThemedText>
              <ThemedText type="small">{bookingExpectation(selectedService, chosenBarber)}</ThemedText>
            </AppCard>
          )}
          <AuthButton
            label="Confirmar turno"
            onPress={handleTakeTurn}
            disabled={!canSubmit}
            isLoading={isTakingTurn}
          />
        </View>
      )}
      <AuthButton label="Volver" variant="secondary" onPress={() => router.back()} disabled={isTakingTurn} />
    </CustomerScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  queueCard: { borderWidth: 1, borderRadius: 20, gap: 8, minHeight: 88, padding: 16 },
  queueRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
