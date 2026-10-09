import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CustomerState } from '@/components/customer/customer-ui';
import { Button, Card, Icon, Pill, ProgressBar } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';

const toleranceSeconds = 5 * 60;

function remainingSeconds(deadline: string | null): number {
  return deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0;
}

function formatRemaining(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatDeadline(deadline: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date(deadline));
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function CalledGuestTicket({
  ticket,
  error,
  isResponding,
  onRespond,
  onRetry,
}: {
  ticket: GuestTicketState;
  error: string | null;
  isResponding: boolean;
  onRespond: (response: NonNullable<GuestTicketState['customerResponse']>) => void;
  onRetry: () => void;
}) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(ticket.calledDeadlineAt));

  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(ticket.calledDeadlineAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [ticket.calledDeadlineAt]);

  const barberName = ticket.assignedBarberName ?? ticket.requestedBarberName;
  const responseLabel =
    ticket.customerResponse === 'presente'
      ? 'Confirmaste: ya estás aquí'
      : ticket.customerResponse === 'llega_en_2_min'
        ? 'Confirmaste: llegas en 2 minutos'
        : null;
  const canRespond = seconds > 0 && !ticket.customerResponse;
  const decay = Math.min(1, seconds / toleranceSeconds);
  const isUrgent = seconds <= 60;

  return (
    <>
      <View accessibilityLabel="Aviso de llamado activo" style={styles.alert}>
        <View style={styles.alertTop}>
          <View style={styles.alertIcon}>
            <Icon color="#FFFFFF" name="bell" size={24} />
          </View>
          <View style={styles.alertTitles}>
            <Text style={styles.alertEyebrow}>Aviso de llamado</Text>
            <Text style={styles.alertTitle}>¡ES TU TURNO!</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LLAMANDO</Text>
          </View>
        </View>
        <Text style={styles.alertDetail}>Acércate al personal para continuar con tu turno.</Text>
      </View>

      {error ? <CustomerState action={onRetry} label={error} /> : null}

      <Card padding="lg">
        <View style={styles.identityTop}>
          <View style={styles.identityCopy}>
            <Text style={styles.label}>CÓDIGO DE TURNO</Text>
            <Text accessibilityLabel={`Código de turno ${ticket.visibleCode}`} style={styles.code}>
              {ticket.visibleCode}
            </Text>
          </View>
          <Pill label="Llamado" tone="brand" />
        </View>

        {ticket.calledDeadlineAt ? (
          <View style={styles.countdown}>
            <Text style={styles.deadlineText}>Vence a las {formatDeadline(ticket.calledDeadlineAt)}</Text>
            <View style={styles.timerRow}>
              <Icon color={isUrgent ? Palette.danger : Palette.brand} name="clock" size={26} />
              <Text
                accessibilityLabel={`${formatRemaining(seconds)} de tolerancia restante`}
                style={[styles.countdownValue, isUrgent ? { color: Palette.danger } : null]}
              >
                {formatRemaining(seconds)}
              </Text>
              <Text style={[TypeScale.label, { color: Palette.inkMuted }]}>restantes</Text>
            </View>
            <ProgressBar tone={isUrgent ? 'danger' : 'brand'} value={decay} />
          </View>
        ) : (
          <Text style={styles.missingDeadline}>El personal actualizará el estado de tu turno.</Text>
        )}
      </Card>

      {ticket.serviceName || barberName ? (
        <Card padding="lg">
          <Text style={styles.label}>DETALLES DE ASIGNACIÓN</Text>

          {barberName ? (
            <View style={styles.assignmentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(barberName)}</Text>
                <View style={styles.avatarDot} />
              </View>
              <View style={styles.assignmentCopy}>
                <Text style={styles.assignmentValue}>{barberName}</Text>
                <Text style={styles.label}>
                  {ticket.assignedBarberName ? 'BARBERO ASIGNADO' : 'BARBERO SOLICITADO'}
                </Text>
              </View>
            </View>
          ) : null}

          {ticket.serviceName ? (
            <View style={[styles.serviceRow, barberName ? styles.assignmentDivider : null]}>
              <View style={styles.serviceIcon}>
                <Icon color={Palette.brand} name="ticket" size={19} />
              </View>
              <View style={styles.assignmentCopy}>
                <Text style={styles.label}>SERVICIO</Text>
                <Text style={[TypeScale.body, { color: Palette.ink }]}>{ticket.serviceName}</Text>
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card padding="lg" tone="gold">
        <View style={styles.warningTitle}>
          <Icon color={Palette.goldDeep} name="alert" size={20} />
          <Text style={[styles.warningHeading, { color: Palette.ink }]}>Tienes 5 minutos de tolerancia</Text>
        </View>
        <Text style={styles.warningDetail}>
          Si no te presentas dentro del plazo, tu turno puede marcarse como ausente. "Llego en 2 minutos" agrega
          2 minutos una sola vez; la primera respuesta queda registrada.
        </Text>
      </Card>

      {responseLabel ? (
        <Card accessibilityRole="alert" padding="lg" tone="brand">
          <Text style={[TypeScale.bodyStrong, { color: Palette.brandDeep }]}>{responseLabel}</Text>
          <Text style={styles.warningDetail}>El personal decide cuándo iniciar la atención.</Text>
        </Card>
      ) : canRespond ? (
        <View style={styles.actions}>
          <Button
            disabled={isResponding}
            fullWidth
            icon="check"
            label="Ya estoy aquí"
            loading={isResponding}
            onPress={() => onRespond('presente')}
            size="lg"
          />
          <Button
            disabled={isResponding}
            fullWidth
            icon="clock"
            label="Llego en 2 minutos"
            onPress={() => onRespond('llega_en_2_min')}
            size="lg"
            variant="secondary"
          />
        </View>
      ) : (
        <Card accessibilityRole="alert" padding="lg" tone="danger">
          <Text style={[TypeScale.bodyStrong, { color: Palette.danger }]}>
            La tolerancia terminó. Espera la actualización del turno.
          </Text>
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  alert: { backgroundColor: Palette.brand, borderRadius: Radius.xlarge, gap: space(3), padding: space(5) },
  alertTop: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  alertTitles: { flex: 1, gap: 2 },
  alertEyebrow: { color: 'rgba(255,255,255,0.88)', ...TypeScale.eyebrow },
  alertTitle: { color: '#FFFFFF', ...TypeScale.display },
  alertDetail: { color: 'rgba(255,255,255,0.9)', ...TypeScale.bodySmall },
  livePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: space(1.5),
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
  },
  liveDot: { backgroundColor: Palette.gold, borderRadius: 4, height: 7, width: 7 },
  livePillText: { color: '#FFFFFF', ...TypeScale.eyebrow },
  identityTop: { alignItems: 'flex-start', flexDirection: 'row', gap: space(3), justifyContent: 'space-between' },
  identityCopy: { flex: 1, gap: space(0.5) },
  label: { color: Palette.inkFaint, ...TypeScale.eyebrow },
  code: { color: Palette.ink, ...TypeScale.metric },
  countdown: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoftest,
    borderRadius: Radius.medium,
    gap: space(2),
    padding: space(4),
  },
  timerRow: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  deadlineText: { color: Palette.inkMuted, ...TypeScale.caption },
  countdownValue: { color: Palette.brandDeep, fontSize: 34, fontWeight: '800', lineHeight: 38 },
  missingDeadline: { color: Palette.inkMuted, ...TypeScale.bodySmall },
  assignmentRow: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  assignmentDivider: { borderTopColor: Palette.border, borderTopWidth: 1, paddingTop: space(3.5) },
  avatar: {
    alignItems: 'center',
    backgroundColor: Palette.brand,
    borderRadius: Radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: '#FFFFFF', ...TypeScale.label },
  avatarDot: {
    backgroundColor: Palette.success,
    borderColor: Palette.surface,
    borderRadius: 7,
    borderWidth: 2,
    bottom: 0,
    height: 14,
    position: 'absolute',
    right: 0,
    width: 14,
  },
  assignmentCopy: { flex: 1, gap: space(0.5) },
  assignmentValue: { color: Palette.ink, ...TypeScale.headline },
  serviceRow: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  serviceIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  warningTitle: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  warningHeading: { flex: 1, ...TypeScale.bodyStrong },
  warningDetail: { color: Palette.inkMuted, ...TypeScale.bodySmall },
  actions: { gap: space(3) },
});
