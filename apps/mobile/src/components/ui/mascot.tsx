import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandMark } from './brand-mark';

/**
 * The Turnify sheep, alive. Idle breathing on a slow ease-in-out loop
 * (2200ms, the uiverse-style calm timing); celebratory bounce on demand.
 * Static BrandMark stays for headers — motion lives only where it earns it.
 */
export function Mascot({
  size = 44,
  celebrate = false,
  style,
}: {
  size?: number;
  celebrate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const breath = useRef(new Animated.Value(0)).current;
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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          duration: celebrate ? 550 : 1100,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          duration: celebrate ? 550 : 1100,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, celebrate, reduceMotion]);

  if (reduceMotion) {
    return (
      <View accessibilityLabel="Turnify" accessibilityRole="image" style={style}>
        <BrandMark size={size} />
      </View>
    );
  }

  const amplitude = celebrate ? -8 : -4;
  const grow = celebrate ? 0.08 : 0.035;

  return (
    <Animated.View
      accessibilityLabel="Turnify"
      accessibilityRole="image"
      style={[
        {
          transform: [
            { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, amplitude] }) },
            { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + grow] }) },
          ],
        },
        style,
      ]}
    >
      <BrandMark size={size} />
    </Animated.View>
  );
}
