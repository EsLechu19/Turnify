import { Colors } from '@/constants/theme';

/**
 * Turnify ships a single light appearance, so the hook no longer branches on the
 * device color scheme. Every screen reads the brand palette from here.
 */
export function useTheme() {
  return Colors.light;
}