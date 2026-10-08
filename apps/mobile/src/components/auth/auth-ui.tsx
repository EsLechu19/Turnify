import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/ui/brand-mark';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';

export type AuthButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
};

const variants: Record<'primary' | 'secondary' | 'destructive', ButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'danger',
};

/** Compatibility wrapper: auth actions are the same `Button` as the rest of the app. */
export function AuthButton({ label, onPress, disabled, isLoading, variant = 'primary' }: AuthButtonProps) {
  return (
    <Button
      disabled={disabled}
      fullWidth
      label={label}
      loading={isLoading}
      onPress={onPress}
      variant={variants[variant]}
    />
  );
}

/**
 * Neutral shell for the sign-in and staff-access screens. It does not scroll on
 * its own: screens that need scrolling use `Screen` from the UI kit.
 */
export function AuthScreenContainer({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.content}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Brand lockup plus the screen title shared by every authentication screen. */
export function AuthIntro({
  eyebrow,
  title,
  detail,
  icon,
}: {
  eyebrow?: string;
  title: string;
  detail: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.intro}>
      <View accessibilityLabel="Turnify" style={styles.lockup}>
        <BrandMark size={34} tile />
        <Text style={[TypeScale.headline, { color: Palette.ink }]}>Turnify</Text>
      </View>
      {icon ? (
        <View style={styles.introIcon}>
          <Icon color={Palette.brand} name={icon} size={24} />
        </View>
      ) : null}
      {eyebrow ? <Text style={[TypeScale.eyebrow, { color: Palette.goldDeep }]}>{eyebrow}</Text> : null}
      <Text style={[TypeScale.h1, { color: Palette.ink }]}>{title}</Text>
      <Text style={[TypeScale.body, { color: Palette.inkMuted }]}>{detail}</Text>
    </View>
  );
}

/** Inline notice used when the Supabase environment variables are missing. */
export function AuthNotice({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <Icon color={Palette.goldDeep} name="info" size={18} />
      <Text style={[TypeScale.caption, { color: Palette.ink, flex: 1 }]}>{message}</Text>
    </View>
  );
}

/** Bottom navigation between the sign-in and sign-up screens. */
export function AuthSwitch({ question, action, href }: { question: string; action: string; href: string }) {
  return (
    <View style={styles.switchRow}>
      <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>{question}</Text>
      <Button href={href} label={action} variant="link" />
    </View>
  );
}

export function AuthErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
      <Icon color={Palette.danger} name="alert" size={18} />
      <Text style={styles.errorLabel}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Palette.canvas, flex: 1 },
  keyboard: { flex: 1 },
  content: {
    alignSelf: 'center',
    flex: 1,
    gap: space(4),
    justifyContent: 'center',
    maxWidth: 480,
    paddingHorizontal: space(5),
    paddingVertical: space(8),
    width: '100%',
  },
  intro: { gap: space(2) },
  lockup: { alignItems: 'center', flexDirection: 'row', gap: space(2), marginBottom: space(3) },
  introIcon: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: space(1),
    width: 48,
  },
  notice: {
    alignItems: 'center',
    backgroundColor: Palette.goldSoft,
    borderColor: Palette.goldBorder,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space(2),
    padding: space(3.5),
  },
  switchRow: { alignItems: 'center', backgroundColor: 'transparent', flexDirection: 'row', gap: space(1) },
  error: {
    alignItems: 'center',
    backgroundColor: Palette.dangerSoft,
    borderColor: Palette.dangerBorder,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space(2),
    padding: space(3.5),
  },
  errorLabel: { color: Palette.danger, flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});