import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AuthFieldProps = TextInputProps & {
  label: string;
  passwordVisibility?: { isVisible: boolean; onToggle(): void };
};

/**
 * Shared labelled input for the login and register screens.
 */
export function AuthField({ label, style, passwordVisibility, ...inputProps }: AuthFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View>
        <TextInput
          style={[
            styles.input,
            passwordVisibility && styles.passwordInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={passwordVisibility ? !passwordVisibility.isVisible : inputProps.secureTextEntry}
          {...inputProps}
        />
        {passwordVisibility && <Pressable accessibilityRole="button" accessibilityLabel={passwordVisibility.isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={passwordVisibility.onToggle} style={styles.passwordToggle}><Text style={{ color: theme.primary }}> {passwordVisibility.isVisible ? 'Ocultar' : 'Mostrar'} </Text></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  passwordInput: { paddingRight: 84 },
  passwordToggle: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 10, position: 'absolute', right: 0, top: 4 },
});
