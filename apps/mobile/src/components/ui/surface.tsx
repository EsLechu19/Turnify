import { View, type ViewProps } from 'react-native';

import { Card, Pill, type CardProps, type PillTone } from '@/components/ui';

/**
 * Compatibility layer: `AppCard`/`StatusBadge` are now the shared `Card` and
 * `Pill` so every surface uses the same radius, border and type scale.
 */
export function AppCard({ style, ...props }: ViewProps & Omit<CardProps, 'style'>) {
  return <Card padding="md" style={style} {...props} />;
}

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'destructive' | 'gold';
}) {
  const mapped: PillTone =
    tone === 'destructive'
      ? 'danger'
      : tone === 'success'
        ? 'success'
        : tone === 'primary'
          ? 'brand'
          : tone === 'gold'
            ? 'gold'
            : 'neutral';

  return (
    <View>
      <Pill label={label} tone={mapped} />
    </View>
  );
}
