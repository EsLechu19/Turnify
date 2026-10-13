import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { Mascot } from './mascot';

const BAR_WIDTH = 160;
const FILL_WIDTH = 64;

/**
 * Uiverse-style QR reading loader, translated to native: breathing sheep,
 * sparkle pulse, sliding indeterminate bar and cycling dots. Centered at a
 * middle size (180px mascot) for the post-scan transition.
 */
export function QrLoader({ label = 'Leyendo código QR' }: { label?: string }) {
  const slide = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState('');
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

  useEffect(() => {
    if (reduceMotion) return;
    const bar = Animated.loop(
      Animated.sequence([
        Animated.timing(slide, { duration: 800, easing: Easing.inOut(Easing.ease), toValue: 1, useNativeDriver: true }),
        Animated.timing(slide, { duration: 800, easing: Easing.inOut(Easing.ease), toValue: 0, useNativeDriver: true }),
      ]),
    );
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(spark, { duration: 850, easing: Easing.inOut(Easing.ease), toValue: 1, useNativeDriver: true }),
        Animated.timing(spark, { duration: 850, easing: Easing.inOut(Easing.ease), toValue: 0, useNativeDriver: true }),
      ]),
    );
    bar.start();
    twinkle.start();
    return () => {
      bar.stop();
      twinkle.stop();
    };
  }, [reduceMotion, slide, spark]);

  useEffect(() => {
    if (reduceMotion) return;
    const frames = ['', '.', '..', '...'];
    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      setDots(frames[frame] ?? '');
    }, 400);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.loader}>
      <View style={styles.mascotBox}>
        <Mascot size={180} />
        {reduceMotion ? null : (
          <Animated.View
            style={[
              styles.spark,
              {
                opacity: spark.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                transform: [{ scale: spark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              },
            ]}
          />
        )}
      </View>
      <View style={styles.bar}>
        <Animated.View
          style={[
            styles.fill,
            reduceMotion
              ? { transform: [{ translateX: 44 }] }
              : {
                  transform: [
                    {
                      translateX: slide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-(FILL_WIDTH - 6), BAR_WIDTH - FILL_WIDTH + 6],
                      }),
                    },
                  ],
                },
          ]}
        />
      </View>
      <Text style={[TypeScale.headline, styles.label]}>
        {label}
        {reduceMotion ? '' : dots}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { alignItems: 'center', alignSelf: 'center', gap: space(3), paddingVertical: space(6) },
  mascotBox: { height: 180, position: 'relative', width: 180 },
  spark: {
    backgroundColor: Palette.brandBright,
    borderRadius: 999,
    elevation: 6,
    height: 11,
    position: 'absolute',
    right: 14,
    shadowColor: Palette.brandBright,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    top: 54,
    width: 11,
  },
  bar: {
    backgroundColor: Palette.brandBorder,
    borderColor: Palette.brandBright,
    borderRadius: 999,
    borderWidth: 1,
    height: 9,
    overflow: 'hidden',
    width: BAR_WIDTH,
  },
  fill: { backgroundColor: Palette.brandBright, borderRadius: 999, height: '100%', width: FILL_WIDTH },
  label: { color: Palette.ink, textAlign: 'center' },
});
