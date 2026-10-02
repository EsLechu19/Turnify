import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function AppCard({ style, ...props }: ViewProps) {
  const theme = useTheme();

  return <View {...props} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]} />;
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'destructive' }) {
  const theme = useTheme();
  const colors = tone === 'destructive'
    ? { backgroundColor: theme.destructiveMuted, color: theme.destructive }
    : tone === 'success'
      ? { backgroundColor: theme.primaryMuted, color: theme.success }
      : tone === 'primary'
        ? { backgroundColor: theme.primaryMuted, color: theme.primary }
        : { backgroundColor: theme.backgroundSelected, color: theme.textSecondary };

  return (
    <View style={[styles.badge, colors]}>
      <ThemedText type="eyebrow" style={{ color: colors.color }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    gap: 12,
    padding: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.small,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
