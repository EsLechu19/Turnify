import { Pressable, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Card, Icon, OptionCard, Pill, StateBlock, type ButtonProps } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Palette, space, TypeScale } from '@/constants/theme';
import type { TicketStatus } from '@/features/customer/customer-api';

/**
 * Compatibility layer for the customer surfaces that predate the UI kit. Each
 * export is now a thin wrapper over `components/ui`, so the customer flow keeps
 * one visual language without a second set of styles.
 */

export function CustomerPage({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: Palette.canvas }}
    >
      {children}
    </ScrollView>
  );
}

export function CustomerCard({ style, ...props }: ViewProps) {
  return <Card padding="md" style={style} {...props} />;
}

export function CustomerHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <View style={styles.heading}>
      {eyebrow ? <Text style={[TypeScale.eyebrow, { color: Palette.goldDeep }]}>{eyebrow}</Text> : null}
      <Text style={[TypeScale.h2, { color: Palette.ink }]}>{title}</Text>
      {detail ? <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>{detail}</Text> : null}
    </View>
  );
}

export function CustomerState({
  label,
  detail,
  action,
  isLoading,
}: {
  label: string;
  detail?: string;
  action?: () => void;
  isLoading?: boolean;
}) {
  return (
    <Card padding="none">
      <StateBlock
        detail={detail}
        icon="ticket"
        loading={isLoading}
        onAction={action}
        title={label}
      />
    </Card>
  );
}

export function ChoiceCard({
  title,
  detail,
  selected,
  disabled,
  onPress,
  badge,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <OptionCard
      badge={badge}
      detail={detail}
      disabled={disabled}
      onPress={onPress}
      selected={selected}
      title={title}
    />
  );
}

export function CustomerButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}) {
  const mapped: ButtonProps['variant'] =
    variant === 'destructive' ? 'danger' : variant === 'secondary' ? 'secondary' : 'primary';

  return <Button disabled={disabled} fullWidth label={label} loading={loading} onPress={onPress} variant={mapped} />;
}

export function CustomerTag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'brand' | 'gold' | 'success' | 'danger' }) {
  return <Pill label={label} tone={tone} />;
}

const statusLabels: Record<TicketStatus, string> = {
  en_espera: 'En espera',
  notificado: 'Notificado',
  llamado: 'Llamado',
  en_atencion: 'En atención',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
};

const statusTones: Record<TicketStatus, 'neutral' | 'brand' | 'gold' | 'success' | 'danger'> = {
  en_espera: 'brand',
  notificado: 'gold',
  llamado: 'gold',
  en_atencion: 'brand',
  finalizado: 'success',
  cancelado: 'danger',
  ausente: 'danger',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Pill label={statusLabels[status].toUpperCase()} tone={statusTones[status]} />;
}

export function TurnCard({
  code,
  serviceName,
  status,
  peopleAhead,
  waitLabel,
  detail,
  onPress,
}: {
  code: string;
  serviceName?: string | null;
  status: TicketStatus;
  peopleAhead?: number;
  waitLabel?: string | null;
  detail?: string;
  onPress?: () => void;
}) {
  const content = (
    <CustomerCard>
      <View style={styles.turnTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[TypeScale.eyebrow, { color: Palette.brand }]}>TU TURNO</Text>
          <Text style={[TypeScale.metric, { color: Palette.ink }]}>{code}</Text>
          {serviceName ? <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>{serviceName}</Text> : null}
        </View>
        <StatusBadge status={status} />
      </View>
      {peopleAhead != null || waitLabel ? (
        <View style={styles.turnMetrics}>
          {peopleAhead != null ? (
            <View style={styles.metricItem}>
              <Icon color={Palette.inkFaint} name="users" size={14} />
              <Text style={[TypeScale.label, { color: Palette.inkMuted }]}>Posición: {peopleAhead + 1}</Text>
            </View>
          ) : null}
          {waitLabel ? (
            <View style={styles.metricItem}>
              <Icon color={Palette.goldDeep} name="clock" size={14} />
              <Text style={[TypeScale.label, { color: Palette.goldDeep }]}>{waitLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {detail ? <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>{detail}</Text> : null}
    </CustomerCard>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function HistoryItem({
  code,
  serviceName,
  status,
  dateLabel,
  onPress,
}: {
  code: string;
  serviceName?: string | null;
  status: TicketStatus;
  dateLabel: string;
  onPress?: () => void;
}) {
  const content = (
    <CustomerCard>
      <View style={styles.turnTop}>
        <View style={styles.metricItem}>
          <Icon color={Palette.brand} name="ticket" size={16} />
          <Text style={[TypeScale.h3, { color: Palette.ink }]}>{code}</Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <Text style={[TypeScale.body, { color: Palette.ink }]}>{serviceName ?? 'Servicio'}</Text>
      <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>{dateLabel}</Text>
    </CustomerCard>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function ProfileHeader({ name, email }: { name?: string | null; email?: string | null }) {
  return (
    <CustomerCard>
      <Text style={[TypeScale.eyebrow, { color: Palette.brand }]}>PERFIL</Text>
      <Text style={[TypeScale.h2, { color: Palette.ink }]}>{name || 'Cliente'}</Text>
      <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>{email ?? 'Sin correo disponible'}</Text>
    </CustomerCard>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingBottom: space(7), paddingHorizontal: space(5), paddingTop: space(5), width: '100%' },
  heading: { gap: space(1) },
  turnTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  turnMetrics: { alignItems: 'center', flexDirection: 'row', gap: space(3), marginTop: space(1) },
  metricItem: { alignItems: 'center', flexDirection: 'row', gap: space(1) },
});
