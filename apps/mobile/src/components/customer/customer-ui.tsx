import { ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Card, OptionCard, Pill, StateBlock, type ButtonProps } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Palette, space, TypeScale } from '@/constants/theme';

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

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingBottom: space(7), paddingHorizontal: space(5), paddingTop: space(5), width: '100%' },
  heading: { gap: space(1) },
});
