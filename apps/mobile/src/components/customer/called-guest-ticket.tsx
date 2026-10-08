import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CustomerCard, CustomerState } from '@/components/customer/customer-ui';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';

const colors = { ink: '#111D27', muted: '#60707D', teal: '#00686C', tealBright: '#0E8388', low: '#EDF4FF', terracotta: '#B75C45', terracottaLow: '#FBE9E3', white: '#FFFFFF', border: '#DCE3F2' };
const toleranceSeconds = 5 * 60;

function remainingSeconds(deadline: string | null): number {
  return deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0;
}

function formatRemaining(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatDeadline(deadline: string): string {
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(deadline));
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function AlertIcon() {
  return <View accessibilityElementsHidden style={styles.alertIcon}><Svg fill="none" height={22} viewBox="0 0 24 24" width={22}><Path d="M12 8v5m0 3h.01M10.3 3.8 2.5 17.3A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.7L13.7 3.8a2 2 0 0 0-3.4 0Z" stroke={colors.white} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} /></Svg></View>;
}

export function CalledGuestTicket({ ticket, error, isResponding, onRespond, onRetry }: { ticket: GuestTicketState; error: string | null; isResponding: boolean; onRespond: (response: NonNullable<GuestTicketState['customerResponse']>) => void; onRetry: () => void }) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(ticket.calledDeadlineAt));
  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(ticket.calledDeadlineAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [ticket.calledDeadlineAt]);

  const barberName = ticket.assignedBarberName ?? ticket.requestedBarberName;
  const responseLabel = ticket.customerResponse === 'presente' ? 'Confirmaste: ya estás aquí' : ticket.customerResponse === 'llega_en_2_min' ? 'Confirmaste: llegas en 2 minutos' : null;
  const canRespond = seconds > 0 && !ticket.customerResponse;
  const decay = Math.min(1, seconds / toleranceSeconds);

  return <>
    <View accessibilityLabel="Aviso de llamado activo" style={styles.alert}>
      <View style={styles.alertTop}><AlertIcon /><Text style={styles.alertEyebrow}>Aviso de llamado</Text><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.livePillText}>LLAMANDO</Text></View></View>
      <Text style={styles.alertTitle}>¡ES TU TURNO!</Text>
      <Text style={styles.alertDetail}>Acércate al personal para continuar con tu turno.</Text>
    </View>

    {error && <CustomerState label={error} action={onRetry} />}

    <CustomerCard style={styles.identityCard}>
      <View style={styles.identityTop}><View><Text style={styles.label}>CÓDIGO DE TURNO</Text><Text accessibilityLabel={`Código de turno ${ticket.visibleCode}`} style={styles.code}>{ticket.visibleCode}</Text></View></View>
      {ticket.calledDeadlineAt ? <View style={styles.countdown}><View style={styles.countdownTop}><View><Text style={styles.countdownLabel}>TOLERANCIA RESTANTE</Text><Text style={styles.deadlineText}>Vence a las {formatDeadline(ticket.calledDeadlineAt)}</Text></View><Text accessibilityLabel={`${formatRemaining(seconds)} de tolerancia restante`} style={styles.countdownValue}>{formatRemaining(seconds)}</Text></View><View accessibilityElementsHidden style={styles.decayTrack}><View style={[styles.decayFill, { width: `${decay * 100}%` }]} /></View></View> : <Text style={styles.missingDeadline}>El personal actualizará el estado de tu turno.</Text>}
    </CustomerCard>

    {(ticket.serviceName || barberName) && <CustomerCard style={styles.assignmentCard}>
      <Text style={styles.cardTitle}>Tu atención</Text>
      {barberName && <View style={styles.assignmentRow}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(barberName)}</Text></View><View style={styles.assignmentCopy}><Text style={styles.label}>{ticket.assignedBarberName ? 'BARBERO ASIGNADO' : 'BARBERO SOLICITADO'}</Text><Text style={styles.assignmentValue}>{barberName}</Text></View></View>}
      {ticket.serviceName && <View style={[styles.assignmentRow, barberName && styles.assignmentDivider]}><View style={styles.assignmentCopy}><Text style={styles.label}>SERVICIO</Text><Text style={styles.assignmentValue}>{ticket.serviceName}</Text></View></View>}
    </CustomerCard>}

    <View style={styles.warning}><Text style={styles.warningTitle}>La tolerancia base es de 5 minutos</Text><Text style={styles.warningDetail}>Si no te presentas dentro del plazo, tu turno puede marcarse como ausente. Confirmar tu llegada no adelanta la atención.</Text></View>

    {responseLabel ? <View accessibilityRole="alert" style={styles.response}><Text style={styles.responseText}>{responseLabel}</Text><Text style={styles.responseDetail}>El personal decide cuándo iniciar la atención.</Text></View> : canRespond ? <View style={styles.actions}><Pressable accessibilityLabel="Confirmar que ya estoy aquí" accessibilityRole="button" accessibilityState={{ disabled: isResponding }} disabled={isResponding} onPress={() => onRespond('presente')} style={({ pressed }) => [styles.primaryAction, (pressed || isResponding) && styles.pressed]}><Text style={styles.primaryActionText}>{isResponding ? 'Enviando…' : 'Ya estoy aquí'}</Text></Pressable><Pressable accessibilityLabel="Informar que llego en 2 minutos" accessibilityRole="button" accessibilityState={{ disabled: isResponding }} disabled={isResponding} onPress={() => onRespond('llega_en_2_min')} style={({ pressed }) => [styles.secondaryAction, (pressed || isResponding) && styles.pressed]}><Text style={styles.secondaryActionText}>Llego en 2 minutos</Text></Pressable></View> : <View accessibilityRole="alert" style={styles.expired}><Text style={styles.expiredText}>La tolerancia terminó. Espera la actualización del turno.</Text></View>}
  </>;
}

const styles = StyleSheet.create({
  alert: { backgroundColor: colors.teal, borderRadius: 12, gap: 8, padding: 18 }, alertTop: { alignItems: 'center', flexDirection: 'row', gap: 9 }, alertIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8, height: 36, justifyContent: 'center', width: 36 }, alertEyebrow: { color: '#D9F2F0', flex: 1, fontSize: 12, fontWeight: '800' }, alertTitle: { color: colors.white, fontSize: 26, fontWeight: '800', letterSpacing: -.6, marginTop: 4 }, alertDetail: { color: '#D9F2F0', fontSize: 14, lineHeight: 20 }, livePill: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 6 }, liveDot: { backgroundColor: '#A8F0EB', borderRadius: 4, height: 7, width: 7 }, livePillText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: .6 },
  identityCard: { borderRadius: 12, gap: 16, padding: 16 }, identityTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }, label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .8 }, code: { color: colors.ink, fontSize: 42, fontWeight: '800', letterSpacing: -1.4, lineHeight: 49, marginTop: 2 }, countdown: { backgroundColor: colors.low, borderRadius: 8, gap: 10, padding: 12 }, countdownTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }, countdownLabel: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: .8 }, deadlineText: { color: colors.muted, fontSize: 12, marginTop: 4 }, countdownValue: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -.8 }, decayTrack: { backgroundColor: '#D4E7F5', borderRadius: 3, height: 6, overflow: 'hidden' }, decayFill: { backgroundColor: colors.tealBright, borderRadius: 3, height: '100%' }, missingDeadline: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  assignmentCard: { borderRadius: 12, gap: 14, padding: 16 }, cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, assignmentRow: { alignItems: 'center', flexDirection: 'row', gap: 12 }, assignmentDivider: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 }, avatar: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, avatarText: { color: colors.white, fontSize: 12, fontWeight: '800' }, assignmentCopy: { flex: 1, gap: 3 }, assignmentValue: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  warning: { backgroundColor: colors.terracottaLow, borderRadius: 12, gap: 5, padding: 16 }, warningTitle: { color: colors.terracotta, fontSize: 14, fontWeight: '800' }, warningDetail: { color: '#6D3B30', fontSize: 13, lineHeight: 19 }, actions: { gap: 10 }, primaryAction: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 8, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, primaryActionText: { color: colors.white, fontSize: 15, fontWeight: '800' }, secondaryAction: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.teal, borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, secondaryActionText: { color: colors.teal, fontSize: 15, fontWeight: '800' }, response: { backgroundColor: colors.low, borderRadius: 12, gap: 3, padding: 16 }, responseText: { color: colors.teal, fontSize: 14, fontWeight: '800' }, responseDetail: { color: colors.muted, fontSize: 13, lineHeight: 19 }, expired: { backgroundColor: colors.terracottaLow, borderRadius: 12, padding: 14 }, expiredText: { color: '#6D3B30', fontSize: 13, fontWeight: '700' }, pressed: { opacity: .68 },
});
