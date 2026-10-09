/**
 * Minimal `react-native` stand-in for Vitest. Only modules under test load it,
 * and they touch `Platform.OS` / `StyleSheet.create` at import time. Anything
 * else is out of scope for unit tests: screens are covered by contracts, not
 * imports.
 */
export const Platform = {
  OS: 'ios',
  select: <T,>(options: { ios?: T; default?: T } & Record<string, T | undefined>): T | undefined =>
    options.ios ?? options.default,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: <T,>(style: T): T => style,
};
