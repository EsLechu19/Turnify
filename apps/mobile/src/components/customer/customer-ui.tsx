import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CustomerPage({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <ScrollView contentContainerStyle={[styles.page, { backgroundColor: theme.background }]}>{children}</ScrollView>;
}

export function CustomerCard({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return <View {...props} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]} />;
}

export function CustomerHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.heading}>
      {eyebrow && <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text>}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {detail && <Text style={[styles.detail, { color: theme.textSecondary }]}>{detail}</Text>}
    </View>
  );
}

export function CustomerState({ label, detail, action, isLoading }: { label: string; detail?: string; action?: () => void; isLoading?: boolean }) {
  const theme = useTheme();
  return <CustomerCard style={styles.state}><Text style={[styles.stateIcon, { color: theme.primary }]}>{isLoading ? '◌' : '○'}</Text><Text style={[styles.stateLabel, { color: theme.text }]}>{label}</Text>{detail && <Text style={[styles.stateDetail, { color: theme.textSecondary }]}>{detail}</Text>}{action && <Pressable accessibilityRole="button" onPress={action} style={[styles.retry, { borderColor: theme.border }]}><Text style={{ color: theme.primary }}>Reintentar</Text></Pressable>}</CustomerCard>;
}

export function ChoiceCard({ title, detail, selected, disabled, onPress, badge }: { title: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void; badge?: string }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.choice, { backgroundColor: selected ? theme.primaryMuted : theme.backgroundElement, borderColor: selected ? theme.primary : theme.border, opacity: disabled ? .55 : pressed ? .82 : 1 }]}><View style={styles.choiceTop}><View style={styles.choiceCopy}>{badge && <Text style={[styles.badge, { color: theme.primary, backgroundColor: theme.primaryMuted }]}>{badge}</Text>}<Text style={[styles.choiceTitle, { color: theme.text }]}>{title}</Text>{detail && <Text style={[styles.choiceDetail, { color: theme.textSecondary }]}>{detail}</Text>}</View><View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' }]}>{selected && <Text style={styles.check}>✓</Text>}</View></View></Pressable>;
}

export function CustomerButton({ label, onPress, variant = 'primary', disabled, loading }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive'; disabled?: boolean; loading?: boolean }) {
  const theme = useTheme();
  const color = variant === 'destructive' ? theme.destructive : theme.primary;
  const fill = variant === 'primary';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled || loading) }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: fill ? color : theme.backgroundElement, borderColor: fill ? color : variant === 'destructive' ? color : theme.border, opacity: disabled || loading ? .5 : pressed ? .84 : 1 }]}>{loading ? <ActivityIndicator color={fill ? theme.background : color} /> : <Text style={[styles.buttonLabel, { color: fill ? theme.background : color }]}>{label}</Text>}</Pressable>;
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 28, paddingHorizontal: 20, paddingTop: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, shadowColor: '#15202B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: .04, shadowRadius: 8 },
  heading: { gap: 4, paddingTop: 4 }, eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }, title: { fontSize: 26, fontWeight: '700', letterSpacing: -.4, lineHeight: 32 }, detail: { fontSize: 15, lineHeight: 22 },
  state: { alignItems: 'center', gap: 8, paddingVertical: 28 }, stateIcon: { fontSize: 36 }, stateLabel: { fontSize: 18, fontWeight: '700' }, stateDetail: { fontSize: 14, lineHeight: 20, textAlign: 'center' }, retry: { borderRadius: Radius.medium, borderWidth: 1, marginTop: 8, paddingHorizontal: 16, paddingVertical: 12 },
  choice: { borderRadius: 16, borderWidth: 1, minHeight: 96, padding: 16 }, choiceTop: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, choiceCopy: { flex: 1, gap: 4 }, choiceTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 }, choiceDetail: { fontSize: 14, lineHeight: 20 }, badge: { alignSelf: 'flex-start', borderRadius: 999, fontSize: 11, fontWeight: '700', letterSpacing: .6, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, textTransform: 'uppercase' }, radio: { alignItems: 'center', borderRadius: 14, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 }, check: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  button: { alignItems: 'center', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, buttonLabel: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
});
