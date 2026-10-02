import { StyleSheet, Text, View } from 'react-native';

import { CustomerCard, CustomerHeading, CustomerState } from '@/components/customer/customer-ui';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { useTheme } from '@/hooks/use-theme';

export function CalledGuestTicket({ ticket, error, onRetry }: { ticket: GuestTicketState; error: string | null; onRetry: () => void }) {
  const theme = useTheme();

  return <>
    <CustomerHeading eyebrow="Aviso de llamado" title="¡Es tu turno!" detail="Acércate al personal para continuar con tu turno." />
    {error && <CustomerState label={error} action={onRetry} />}
    <View style={[styles.alert, { backgroundColor: theme.primary }]}>
      <Text style={[styles.alertEyebrow, { color: theme.background }]}>AVISO DE LLAMADO</Text>
      <Text style={[styles.alertTitle, { color: theme.background }]}>TE ESTAMOS ESPERANDO</Text>
      <View style={[styles.livePill, { backgroundColor: theme.backgroundElement }]}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>LLAMANDO</Text></View>
    </View>
    <CustomerCard style={styles.codeCard}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>CÓDIGO DE ATENCIÓN</Text>
      <Text style={[styles.code, { color: theme.text }]}>{ticket.visibleCode}</Text>
    </CustomerCard>
    {(ticket.serviceName || ticket.assignedBarberName) && <CustomerCard>
      <Text style={[styles.label, { color: theme.textSecondary }]}>DETALLES DE ASIGNACIÓN</Text>
      {ticket.assignedBarberName && <View style={[styles.fact, { borderBottomColor: theme.border }]}><Text style={{ color: theme.textSecondary }}>Barbero asignado</Text><Text style={[styles.factValue, { color: theme.text }]}>{ticket.assignedBarberName}</Text></View>}
      {ticket.serviceName && <View style={styles.fact}><Text style={{ color: theme.textSecondary }}>Servicio</Text><Text style={[styles.factValue, { color: theme.text }]}>{ticket.serviceName}</Text></View>}
    </CustomerCard>}
  </>;
}

const styles = StyleSheet.create({
  alert: { borderRadius: 16, gap: 4, overflow: 'hidden', padding: 20 },
  alertEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  alertTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -.4 },
  livePill: { alignSelf: 'flex-start', borderRadius: 999, marginTop: 10, paddingHorizontal: 10, paddingVertical: 6 },
  codeCard: { alignItems: 'center', gap: 4, paddingVertical: 24 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  code: { fontSize: 56, fontWeight: '800', letterSpacing: -1, lineHeight: 64 },
  fact: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 12 },
  factValue: { flex: 1, fontWeight: '700', textAlign: 'right' },
});
