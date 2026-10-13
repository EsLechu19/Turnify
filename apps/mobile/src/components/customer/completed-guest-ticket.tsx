import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerState } from '@/components/customer/customer-ui';
import { Button, Icon, Mascot, Pill } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';

export function CompletedGuestTicket({
  ticket,
  error,
  onRetry,
  onReturn,
  onNewTicket,
  puntuacion,
  isRating,
  onRate,
}: {
  ticket: GuestTicketState;
  error: string | null;
  onRetry: () => void;
  onReturn: () => void;
  onNewTicket: () => void;
  puntuacion: number | null;
  isRating: boolean;
  onRate: (puntos: number) => void;
}) {
  const isAbsent = ticket.status === 'ausente';
  const isCancelled = ticket.status === 'cancelado';
  const isTerminalBad = isAbsent || isCancelled;
  const [selected, setSelected] = useState(0);

  function confirmRate() {
    if (selected === 0 || isRating) return;
    Alert.alert(`Confirmar ${selected} de 5`, 'Tu voto queda registrado y no podrás cambiarlo. ¿Confirmas?', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Enviar voto', onPress: () => onRate(selected) },
    ]);
  }

  function chooseRating(star: number) {
    setSelected(star);
    Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <>
      {isTerminalBad ? (
        <View accessibilityElementsHidden style={styles.completionIcon}>
          <Icon color={Palette.danger} name="alert" size={30} />
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <Mascot size={64} celebrate="once" />
        </View>
      )}

      <CustomerHeading
        detail={
          isAbsent
            ? 'Tu tolerancia venció antes de que pudieras presentarte.'
            : isCancelled
              ? 'Perdiste tu lugar en la fila. Saca otro cuando quieras.'
              : 'Esperamos que hayas disfrutado tu experiencia.'
        }
        title={isAbsent ? 'Tu turno quedó como ausente' : isCancelled ? 'Tu turno fue cancelado' : '¡Gracias por visitarnos!'}
      />

      {error ? <CustomerState action={onRetry} label={error} /> : null}

      <CustomerCard style={styles.ticketCard}>
        <View style={styles.ticketTop}>
          <View style={styles.ticketCopy}>
            <Text style={styles.label}>TU NÚMERO DE TURNO</Text>
            <Text style={styles.code}>{ticket.visibleCode}</Text>
          </View>
          <Pill label={isAbsent ? 'Ausente' : isCancelled ? 'Cancelado' : 'Completado'} tone={isAbsent || isCancelled ? 'danger' : 'success'} />
        </View>

        {ticket.serviceName || ticket.assignedBarberName ? (
          <View style={styles.facts}>
            {ticket.assignedBarberName ? (
              <View style={styles.fact}>
                <Text style={styles.label}>PROFESIONAL A CARGO</Text>
                <Text style={styles.factValue}>{ticket.assignedBarberName}</Text>
              </View>
            ) : null}
            {ticket.serviceName ? (
              <View style={styles.fact}>
                <Text style={styles.label}>SERVICIO</Text>
                <Text style={styles.factValue}>{ticket.serviceName}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </CustomerCard>

      <CustomerButton label={isTerminalBad ? 'Sacar otro turno' : 'Volver al inicio'} onPress={isTerminalBad ? onNewTicket : onReturn} />

      {!isTerminalBad ? (
        <View style={styles.rating}>
          {puntuacion != null ? (
            <>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    color={star <= puntuacion ? Palette.gold : Palette.inkFaint}
                    key={star}
                    name="star"
                    size={28}
                  />
                ))}
              </View>
              <Text style={[TypeScale.bodySmall, styles.ratingThanks]}>Gracias por tu puntuación.</Text>
            </>
          ) : (
            <>
              <Text style={[TypeScale.bodyStrong, styles.ratingTitle]}>
                {ticket.assignedBarberName ? `¿Cómo te atendió ${ticket.assignedBarberName}?` : '¿Cómo te atendimos?'}
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    accessibilityLabel={`Puntuar ${star} de 5`}
                    accessibilityRole="button"
                    disabled={isRating}
                    hitSlop={12}
                    key={star}
                    onPress={() => chooseRating(star)}
                    style={({ pressed }) => [pressed ? styles.starPressed : null, isRating ? styles.ratingBusy : null]}
                  >
                    <Icon color={star <= selected ? Palette.gold : Palette.inkFaint} name="star" size={40} />
                  </Pressable>
                ))}
              </View>
              <Button
                disabled={selected === 0 || isRating}
                label="Enviar puntuación"
                onPress={confirmRate}
              />
              <Text style={[TypeScale.caption, styles.ratingHint]}>Toca una estrella y confirma tu voto. No podrás cambiarlo.</Text>
            </>
          )}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  completionIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.pill,
    height: 64,
    justifyContent: 'center',
    marginTop: space(1),
    width: 64,
  },
  ticketCard: { gap: space(4), padding: space(5) },
  ticketTop: { alignItems: 'flex-start', flexDirection: 'row', gap: space(3), justifyContent: 'space-between' },
  ticketCopy: { flex: 1, gap: space(0.5) },
  label: { color: Palette.inkFaint, ...TypeScale.eyebrow },
  code: { color: Palette.ink, ...TypeScale.metric },
  facts: { borderTopColor: Palette.border, borderTopWidth: 1, gap: space(3.5), paddingTop: space(4) },
  fact: { gap: space(1) },
  factValue: { color: Palette.ink, ...TypeScale.bodyStrong },
  rating: { alignItems: 'center', gap: space(2), paddingTop: space(2) },
  ratingTitle: { color: Palette.ink, textAlign: 'center' },
  ratingThanks: { color: Palette.inkMuted, textAlign: 'center' },
  ratingHint: { color: Palette.inkMuted, textAlign: 'center' },
  ratingBusy: { opacity: 0.6 },
  starPressed: { transform: [{ scale: 0.88 }] },
  stars: { flexDirection: 'row', gap: space(2), justifyContent: 'center' },
});
