import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, space, TypeScale } from '@/constants/theme';

export type SegmentedControlProps<T extends string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
};

/** Replaces the ad-hoc `filter() === x ? activeStyle : inactiveStyle` toggles. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, size === 'sm' ? styles.trackSm : null]}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              size === 'sm' ? styles.segmentSm : styles.segment,
              active ? styles.segmentActive : styles.segmentIdle,
              pressed ? styles.segmentPressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                size === 'sm' ? TypeScale.eyebrow : TypeScale.bodySmall,
                active ? styles.segmentTextActive : styles.segmentTextIdle,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({
  value,
  tone = 'brand',
  height = 8,
}: {
  value: number;
  tone?: 'brand' | 'gold' | 'success' | 'danger';
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const background = {
    brand: Palette.brand,
    gold: Palette.gold,
    success: Palette.success,
    danger: Palette.danger,
  }[tone];

  return (
    <View style={[styles.trackFill, { backgroundColor: Palette.brandSoftest, height, borderRadius: height / 2 }]}>
      <View
        style={{
          backgroundColor: background,
          borderRadius: height / 2,
          height: '100%',
          width: `${clamped * 100}%`,
        }}
      />
    </View>
  );
}

/** Numbered stepper for the public scan → service → barber flow. */
export function StepTracker({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
    <View style={styles.steps}>
      {steps.map((step, index) => {
        const done = index < activeStep;
        const active = index === activeStep;
        const color = done ? Palette.brand : active ? Palette.gold : Palette.border;

        return (
          <View key={step} style={styles.step}>
            <View style={styles.stepHead}>
              <View style={[styles.stepDot, { backgroundColor: color, borderColor: active ? Palette.gold : Palette.border }]}>
                <Text style={[styles.stepNumber, { color: done || active ? '#FFFFFF' : Palette.inkFaint }]}>
                  {done ? '✓' : index + 1}
                </Text>
              </View>
              {index < steps.length - 1 ? <View style={[styles.stepLine, { backgroundColor: done ? Palette.brand : Palette.border }]} /> : null}
            </View>
            <Text
              numberOfLines={2}
              style={[TypeScale.eyebrow, { color: active ? Palette.ink : Palette.inkFaint }]}
            >
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Palette.brandSoftest,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  trackSm: { padding: 2 },
  trackFill: { overflow: 'hidden', width: '100%' },
  segment: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
  },
  segmentSm: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
  },
  segmentActive: { backgroundColor: Palette.brand },
  segmentIdle: { backgroundColor: 'transparent' },
  segmentPressed: { opacity: 0.7 },
  segmentTextActive: { color: '#FFFFFF' },
  segmentTextIdle: { color: Palette.inkMuted },
  steps: { flexDirection: 'row', gap: space(2) },
  step: { flex: 1, gap: space(1.5) },
  stepHead: { alignItems: 'center', flexDirection: 'row' },
  stepDot: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stepNumber: { fontSize: 12, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
});