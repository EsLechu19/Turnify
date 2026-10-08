import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  size?: 'md' | 'lg';
  /** Adds the show/hide control used by every password field in the product. */
  passwordVisibility?: { isVisible: boolean; onToggle: () => void };
  prefix?: string;
};

export function TextField({
  label,
  hint,
  error,
  size = 'lg',
  passwordVisibility,
  prefix,
  style,
  editable = true,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const height = size === 'lg' ? 54 : 44;
  const borderColor = error ? Palette.danger : focused ? Palette.brand : Palette.border;

  return (
    <View style={styles.field}>
      {label ? <Text style={[TypeScale.label, { color: Palette.inkMuted }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputShell,
          { borderColor, height, opacity: editable ? 1 : 0.6 },
          focused && !error ? styles.focused : null,
        ]}
      >
        {prefix ? <Text style={[TypeScale.body, { color: Palette.inkFaint }]}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          editable={editable}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          placeholderTextColor={Palette.inkFaint}
          selectionColor={Palette.brand}
          style={[TypeScale.body, styles.input, style]}
          {...rest}
        />
        {passwordVisibility ? (
          <Pressable
            accessibilityLabel={passwordVisibility.isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={passwordVisibility.onToggle}
          >
            <Text style={[TypeScale.label, { color: Palette.brand }]}>
              {passwordVisibility.isVisible ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.helper}>
          <Icon color={Palette.danger} name="alert" size={14} strokeWidth={2.2} />
          <Text style={[TypeScale.caption, { color: Palette.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[TypeScale.caption, { color: Palette.inkFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space(1.5) },
  inputShell: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(4),
  },
  focused: { backgroundColor: Palette.brandSoftest },
  input: { color: Palette.ink, flex: 1, height: '100%', paddingVertical: 0 },
  helper: { alignItems: 'center', flexDirection: 'row', gap: space(1) },
});