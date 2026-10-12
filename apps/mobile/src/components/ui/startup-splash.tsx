import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, TypeScale } from '@/constants/theme';

import { BrandMark } from './brand-mark';

type StartupSplashProps = {
  onFinished: () => void;
};

const SHINE_DURATION = 650;

/** Short runtime handoff between the native splash and the first app route. */
export function StartupSplash({ onFinished }: StartupSplashProps) {
  const shineProgress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      onFinished();
      return;
    }

    const animation = Animated.timing(shineProgress, {
      duration: SHINE_DURATION,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) onFinished();
    });

    return () => animation.stop();
  }, [onFinished, reduceMotion, shineProgress]);

  const shineTranslateX = shineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-42, 190],
  });

  return (
    <View accessibilityLabel="Turnify" accessibilityRole="progressbar" style={styles.container}>
      <BrandMark rounded={false} size={136} />
      <View style={styles.wordmarkViewport}>
        <Text style={styles.wordmark}>Turnify</Text>
        {reduceMotion === false && (
          <Animated.View
            pointerEvents="none"
            style={[styles.shine, { transform: [{ skewX: '-20deg' }, { translateX: shineTranslateX }] }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  shine: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    bottom: -8,
    height: 58,
    position: 'absolute',
    top: -8,
    width: 22,
  },
  wordmark: {
    color: Palette.ink,
    fontSize: TypeScale.display.fontSize,
    fontWeight: TypeScale.display.fontWeight,
    letterSpacing: TypeScale.display.letterSpacing,
    lineHeight: TypeScale.display.lineHeight,
    textAlign: 'center',
  },
  wordmarkViewport: {
    borderRadius: Radius.small,
    marginTop: 20,
    overflow: 'hidden',
  },
});
