import { StyleSheet, Text, View } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerState } from '@/components/customer/customer-ui';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { useTheme } from '@/hooks/use-theme';

export function CompletedGuestTicket({ ticket, error, onRetry, onReturn }: {
  ticket: GuestTicketState;
  error: string | null;
  onRetry: () => void;
  onReturn: () => void;
}) {
  const theme = useTheme();

  return <>
    <View style={[styles.completionIcon, { backgroundColor: theme.primaryMuted }]}><Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text></View>
    <CustomerHeading title="¡Gracias por visitarnos!" detail="Esperamos que hayas disfrutado tu experiencia." />
    {error && <CustomerState label={error} action={onRetry} />}
    <CustomerCard style={styles.ticketCard}>
      <View style={styles.ticketTop}>
        <View><Text style={[styles.label, { color: theme.textSecondary }]}>TU NÚMERO DE TURNO</Text><Text style={[styles.code, { color: theme.text }]}>{ticket.visibleCode}</Text></View>
        <View style={[styles.completedPill, { backgroundColor: theme.primaryMuted }]}><Text style={[styles.pillLabel, { color: theme.primary }]}>✓ COMPLETADO</Text></View>
      </View>
      {(ticket.serviceName || ticket.assignedBarberName) && <View style={[styles.facts, { borderTopColor: theme.border }]}>
        {ticket.assignedBarberName && <View style={styles.fact}><Text style={[styles.label, { color: theme.textSecondary }]}>PROFESIONAL A CARGO</Text><Text style={[styles.factValue, { color: theme.text }]}>{ticket.assignedBarberName}</Text></View>}
        {ticket.serviceName && <View style={styles.fact}><Text style={[styles.label, { color: theme.textSecondary }]}>SERVICIO</Text><Text style={[styles.factValue, { color: theme.text }]}>{ticket.serviceName}</Text></View>}
      </View>}
    </CustomerCard>
    <CustomerButton label="Volver al inicio" onPress={onReturn} />
  </>;
}

const styles = StyleSheet.create({
  completionIcon: { alignItems: 'center', alignSelf: 'center', borderRadius: 32, height: 64, justifyContent: 'center', marginTop: 4, width: 64 },
  checkmark: { fontSize: 34, fontWeight: '700' },
  ticketCard: { gap: 16, padding: 20 },
  ticketTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: .8 },
  code: { fontSize: 48, fontWeight: '800', letterSpacing: -1, lineHeight: 54, marginTop: 4 },
  completedPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillLabel: { fontSize: 10, fontWeight: '800', letterSpacing: .6 },
  facts: { borderTopWidth: 1, gap: 14, paddingTop: 16 },
  fact: { gap: 4 },
  factValue: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
});
