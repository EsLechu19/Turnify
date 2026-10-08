import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerState } from '@/components/customer/customer-ui';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';
import { useTheme } from '@/hooks/use-theme';
import Svg, { Path } from 'react-native-svg';

function getDurationMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

function StarIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <Svg width="32" height="32" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

export function CompletedGuestTicket({ ticket, error, isRating, onRate, onRetry, onReturn }: {
  ticket: GuestTicketState;
  error: string | null;
  isRating: boolean;
  onRate: (rating: number, comment?: string) => void;
  onRetry: () => void;
  onReturn: () => void;
}) {
  const theme = useTheme();
  const [draftRating, setDraftRating] = useState(0);
  const [comment, setComment] = useState('');

  const durationMin = getDurationMinutes(ticket.startedAt, ticket.finishedAt);

  return <>
    <View style={[styles.completionIcon, { backgroundColor: theme.primaryMuted }]}><Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text></View>
    <CustomerHeading title="¡Gracias por visitarnos!" detail="Esperamos que hayas disfrutado tu experiencia." />
    {error && <CustomerState label={error} action={onRetry} />}

    <CustomerCard style={styles.ticketCard}>
      <View style={styles.ticketTop}>
        <View><Text style={[styles.label, { color: theme.textSecondary }]}>TU NÚMERO DE TURNO</Text><Text style={[styles.code, { color: theme.text }]}>{ticket.visibleCode}</Text></View>
        <View style={[styles.completedPill, { backgroundColor: theme.primaryMuted }]}><Text style={[styles.pillLabel, { color: theme.primary }]}>✓ COMPLETADO</Text></View>
      </View>
      {(ticket.serviceName || ticket.assignedBarberName || durationMin) && <View style={[styles.facts, { borderTopColor: theme.border }]}>
        {ticket.assignedBarberName && <View style={styles.fact}><Text style={[styles.label, { color: theme.textSecondary }]}>PROFESIONAL A CARGO</Text><Text style={[styles.factValue, { color: theme.text }]}>{ticket.assignedBarberName}</Text></View>}
        {ticket.serviceName && <View style={styles.fact}><Text style={[styles.label, { color: theme.textSecondary }]}>SERVICIO</Text><Text style={[styles.factValue, { color: theme.text }]}>{ticket.serviceName}</Text></View>}
        {durationMin !== null && <View style={styles.fact}><Text style={[styles.label, { color: theme.textSecondary }]}>DURACIÓN</Text><Text style={[styles.factValue, { color: theme.text }]}>{durationMin} {durationMin === 1 ? 'minuto' : 'minutos'}</Text></View>}
      </View>}
    </CustomerCard>

    {!ticket.rating ? (
      <CustomerCard style={styles.ratingCard}>
        <Text style={[styles.ratingTitle, { color: theme.text }]}>¿Cómo calificarías tu atención?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((score) => (
            <Pressable key={score} onPress={() => setDraftRating(score)} disabled={isRating}>
              <StarIcon filled={score <= draftRating} color={theme.primary} />
            </Pressable>
          ))}
        </View>
        {draftRating > 0 && (
          <View style={styles.feedbackForm}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="¿Algún comentario adicional? (Opcional)"
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={1000}
              value={comment}
              onChangeText={setComment}
              editable={!isRating}
            />
            <CustomerButton label="Enviar calificación" onPress={() => onRate(draftRating, comment)} loading={isRating} disabled={isRating} />
          </View>
        )}
      </CustomerCard>
    ) : (
      <CustomerCard style={styles.ratingCard}>
        <Text style={[styles.ratingTitle, { color: theme.text }]}>¡Gracias por tu calificación!</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((score) => (
            <StarIcon key={score} filled={score <= ticket.rating!} color={theme.primary} />
          ))}
        </View>
      </CustomerCard>
    )}

    <CustomerButton label="Volver al inicio" onPress={onReturn} variant="secondary" />
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
  ratingCard: { alignItems: 'center', gap: 16, padding: 20 },
  ratingTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  feedbackForm: { alignSelf: 'stretch', gap: 12, marginTop: 4 },
  input: { borderRadius: 8, borderWidth: 1, minHeight: 80, padding: 12, textAlignVertical: 'top' },
});
