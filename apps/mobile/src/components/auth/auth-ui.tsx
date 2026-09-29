import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type AuthButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export function AuthButton({ label, onPress, disabled, isLoading }: AuthButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.text, opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {isLoading ? (
        <ActivityIndicator color={theme.background} />
      ) : (
        <Text style={[styles.label, { color: theme.background }]}>{label}</Text>
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
    paddingHorizontal: 24,
    gap: 16,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 600,
  },
  error: {
    color: '#D93025',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
});
