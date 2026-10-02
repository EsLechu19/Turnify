import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AuthButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
};

export function AuthButton({ label, onPress, disabled, isLoading, variant = 'primary' }: AuthButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || isLoading;
  const colors = variant === 'destructive'
    ? { background: theme.destructive, label: theme.background }
    : variant === 'secondary'
      ? { background: theme.primaryMuted, label: theme.primary }
      : { background: theme.primary, label: theme.background };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.background, opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1 },
      ]}>
      {isLoading ? (
        <ActivityIndicator color={colors.label} />
      ) : (
        <Text style={[styles.label, { color: colors.label }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AuthScreenContainer({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function AuthErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.medium,
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 600,
  },
  error: {
    color: '#C6533A',
    backgroundColor: '#F8E6E1',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
    padding: 12,
    borderRadius: Radius.small,
  },
});
