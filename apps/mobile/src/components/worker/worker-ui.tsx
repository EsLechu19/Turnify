import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const workerColors = {
  background: '#F7F9FF', card: '#FFFFFF', low: '#EDF4FF', container: '#EDF4FF', high: '#EDF4FF', outline: '#C4D4E5',
  ink: '#111D27', primary: '#111D27', body: '#111D27', muted: '#516170', teal: '#00686C', tealContainer: '#D7F0F1', error: '#BA1A1A', errorContainer: '#FFDAD6',
} as const;

const bodyFont = 'Work Sans';
const displayFont = 'Manrope';

export function WorkerText({ children, variant = 'body', color = workerColors.body, style }: { children: ReactNode; variant?: 'eyebrow' | 'label' | 'body' | 'title' | 'headline' | 'metric'; color?: string; style?: StyleProp<any> }) {
  return <Text style={[textStyles[variant], { color }, style]}>{children}</Text>;
}

export function WorkerButton({ label, onPress, disabled, tone = 'primary', style }: { label: string; onPress(): void; disabled?: boolean; tone?: 'primary' | 'secondary' | 'danger'; style?: StyleProp<ViewStyle> }) {
  const colors = tone === 'primary' ? [workerColors.ink, '#FFFFFF'] : tone === 'danger' ? [workerColors.errorContainer, workerColors.error] : [workerColors.card, workerColors.ink];
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: colors[0], borderColor: tone === 'secondary' ? workerColors.outline : colors[0], opacity: disabled ? .45 : pressed ? .78 : 1 }, style]}><WorkerText variant="label" color={colors[1]}>{label}</WorkerText></Pressable>;
}

export function WorkerIcon({ name, color = workerColors.ink, size = 22 }: { name: 'live' | 'queue' | 'history' | 'profile' | 'back' | 'close' | 'add' | 'check'; color?: string; size?: number }) {
  const paths = {
    live: 'M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0Zm5-1.5h6v3H9v-3Z',
    queue: 'M5 6h14M5 12h14M5 18h10',
    history: 'M4 12a8 8 0 1 0 2.35-5.65M4 5v4h4',
    profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.7-3.1 3.3-5 7-5s6.3 1.9 7 5',
    back: 'm14 6-6 6 6 6M9 12h10', close: 'm6 6 12 12M18 6 6 18', add: 'M12 5v14M5 12h14', check: 'm5 12 4 4 10-10',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden><Path d={paths[name]} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function WorkerPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'teal' | 'error' }) {
  const palette = tone === 'teal' ? [workerColors.tealContainer, workerColors.teal] : tone === 'error' ? [workerColors.errorContainer, workerColors.error] : [workerColors.container, workerColors.muted];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><WorkerText variant="eyebrow" color={palette[1]}>{label}</WorkerText></View>;
}

export const workerUiStyles = StyleSheet.create({ page: { backgroundColor: workerColors.background, gap: 20, padding: 16, paddingBottom: 32 }, card: { backgroundColor: workerColors.card, borderColor: workerColors.outline, borderRadius: 12, borderWidth: 1, gap: 12, padding: 16, shadowColor: '#0E1E2E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .06, shadowRadius: 12, elevation: 2 }, row: { alignItems: 'center', flexDirection: 'row' }, split: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' } });

const textStyles = StyleSheet.create({ eyebrow: { fontFamily: bodyFont, fontSize: 11, fontWeight: '600', letterSpacing: 1, lineHeight: 14, textTransform: 'uppercase' }, label: { fontFamily: bodyFont, fontSize: 14, fontWeight: '600', lineHeight: 18 }, body: { fontFamily: bodyFont, fontSize: 14, fontWeight: '400', lineHeight: 20 }, title: { fontFamily: displayFont, fontSize: 26, fontWeight: '700', letterSpacing: -.5, lineHeight: 34 }, headline: { fontFamily: displayFont, fontSize: 20, fontWeight: '700', lineHeight: 28 }, metric: { fontFamily: displayFont, fontSize: 36, fontWeight: '700', letterSpacing: -.8, lineHeight: 42 } });
const styles = StyleSheet.create({ button: { alignItems: 'center', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 } });
