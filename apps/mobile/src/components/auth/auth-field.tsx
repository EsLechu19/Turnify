import { StyleSheet, Text } from 'react-native';

import { TextField, type TextFieldProps } from '@/components/ui';
import { Palette, TypeScale } from '@/constants/theme';

/**
 * Shared labelled input for the login, register and staff-access screens. It is
 * the UI kit `TextField` with the password toggle behaviour the auth flows need.
 */
export type AuthFieldProps = Omit<TextFieldProps, 'label'> & {
  label: string;
  passwordVisibility?: { isVisible: boolean; onToggle(): void };
};

export function AuthField({ label, passwordVisibility, ...inputProps }: AuthFieldProps) {
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      label={label}
      passwordVisibility={passwordVisibility}
      secureTextEntry={passwordVisibility ? !passwordVisibility.isVisible : inputProps.secureTextEntry}
      {...inputProps}
    />
  );
}

export function AuthNote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

const styles = StyleSheet.create({
  note: { ...TypeScale.caption, color: Palette.inkMuted },
});
