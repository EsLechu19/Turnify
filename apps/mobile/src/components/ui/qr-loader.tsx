import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, TypeScale } from '@/constants/theme';

const LETTERS = ['c', 'a', 'r', 'g', 'a', 'n', 'd', 'o'] as const;
const DELAYS = [100, 250, 400, 550, 700, 850, 1000, 1000];

/**
 * Uiverse-style "cargando" letter tiles in brand colors: each tile bounces
 * with a staggered delay. rotateX and color keyframes from the web original
 * are dropped on purpose — they cannot run on the native driver.
 */
function LetterTile({ letter, delay, reduceMotion }: { letter: string; delay: number; reduceMotion: boolean }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounce, { duration: 650, easing: Easing.inOut(Easing.ease), toValue: 1, useNativeDriver: true }),
        Animated.timing(bounce, { duration: 650, easing: Easing.inOut(Easing.ease), toValue: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, delay, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          transform: [
            { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { scale: bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          ],
        },
      ]}
    >
      <Text style={[TypeScale.headline, styles.tileText]}>{letter}</Text>
    </Animated.View>
  );
}

export function QrLoader({ label = 'Leyendo código QR' }: { label?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.loader}>
      <View style={styles.row}>
        {LETTERS.map((letter, index) => (
          <LetterTile delay={DELAYS[index] ?? 0} key={`${letter}-${index}`} letter={letter} reduceMotion={reduceMotion} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', gap: 6 },
  tile: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 32,
    paddingHorizontal: 4,
  },
  tileText: { color: Palette.brand, textTransform: 'capitalize' },
});
