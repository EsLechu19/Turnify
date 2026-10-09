import { StyleSheet, Text, View } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerState } from '@/components/customer/customer-ui';
import { Icon, Pill } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';

export function CompletedGuestTicket({
  ticket,
  error,
  onRetry,
  onReturn,
  onNewTicket,
}: {
  ticket: GuestTicketState;
  error: string | null;
  onRetry: () => void;
  onReturn: () => void;
  onNewTicket: () => void;
}) {
  const isAbsent = ticket.status === 'ausente';

  return (
    <>
      <View accessibilityElementsHidden style={styles.completionIcon}>
        <Icon color={isAbsent ? Palette.danger : Palette.brand} name={isAbsent ? 'alert' : 'check-circle'} size={30} />
      </View>

      <CustomerHeading
        detail={isAbsent ? 'Tu tolerancia venció antes de que pudieras presentarte.' : 'Esperamos que hayas disfrutado tu experiencia.'}
        title={isAbsent ? 'Tu turno quedó como ausente' : '¡Gracias por visitarnos!'}
      />

      {error ? <CustomerState action={onRetry} label={error} /> : null}

      <CustomerCard style={styles.ticketCard}>
        <View style={styles.ticketTop}>
          <View style={styles.ticketCopy}>
            <Text style={styles.label}>TU NÚMERO DE TURNO</Text>
            <Text style={styles.code}>{ticket.visibleCode}</Text>
          </View>
          <Pill label={isAbsent ? 'Ausente' : 'Completado'} tone={isAbsent ? 'danger' : 'success'} />
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

      <CustomerButton label={isAbsent ? 'Sacar otro turno' : 'Volver al inicio'} onPress={isAbsent ? onNewTicket : onReturn} />
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
});
