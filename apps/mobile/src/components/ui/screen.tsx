import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Palette, Shadows, space, TypeScale } from '@/constants/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Wraps content in a `ScrollView`. Turn it off for screens that own a `FlatList`. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Extra bottom padding so content clears the sticky action bar. */
  bottomInset?: number;
  topInset?: number;
  edges?: Edge[];
  backgroundColor?: string;
};

/**
 * Every screen in the product starts here: fixed light canvas, safe-area padding
 * and a capped content width so tablets and web do not stretch the layout.
 */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  bottomInset = space(6),
  topInset = 0,
  edges = ['top'],
  backgroundColor = Palette.canvas,
}: ScreenProps) {
  if (!scroll) {
    // `bottomInset` is deliberately not applied here: in this mode the screen owns
    // its scroll container and the sticky bar is a sibling, so padding the flex
    // container would push the bar up instead of padding the scrollable content.
    return (
      <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }]}>
        <View style={[styles.content, styles.flexContent, { paddingTop: topInset }, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset, paddingTop: topInset }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Bottom action bar that sits above the home indicator. */
export function StickyBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.stickyBar, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  detail,
  action,
  style,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionTitles}>
        <Text style={[TypeScale.h3, { color: Palette.ink }]}>{title}</Text>
        {detail ? <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    gap: space(4),
    paddingHorizontal: space(5),
    width: '100%',
  },
  /**
   * Screens that own their own scroll container need a bounded height, otherwise
   * the inner `ScrollView` collapses to its content and stops scrolling.
   */
  flexContent: { flex: 1 },
  stickyBar: {
    backgroundColor: Palette.surface,
    borderTopColor: Palette.border,
    borderTopWidth: 1,
    gap: space(2),
    paddingHorizontal: space(5),
    paddingTop: space(3),
    ...Shadows.nav,
  },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: space(3), justifyContent: 'space-between' },
  sectionTitles: { flex: 1, gap: space(0.5) },
});
