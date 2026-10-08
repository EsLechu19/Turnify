import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

/**
 * The only icon set in the product. Every screen names a glyph from here instead
 * of declaring its own inline `Svg` block.
 */
export type IconName =
  | 'alert'
  | 'arrow-left'
  | 'arrow-right'
  | 'bell'
  | 'briefcase'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'code'
  | 'edit'
  | 'eye'
  | 'eye-off'
  | 'grid'
  | 'history'
  | 'home'
  | 'info'
  | 'list'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'map-pin'
  | 'menu'
  | 'play'
  | 'plus'
  | 'qr'
  | 'refresh'
  | 'scissors'
  | 'search'
  | 'settings'
  | 'shield'
  | 'sparkle'
  | 'star'
  | 'storefront'
  | 'ticket'
  | 'trash'
  | 'user'
  | 'users'
  | 'zap';

type CircleSpec = [number, number, number];
type RectSpec = [number, number, number, number, number];
type IconShape = { paths: string[]; circles?: CircleSpec[]; rects?: RectSpec[] };

const shapes: Record<IconName, IconShape> = {
  alert: { paths: ['M12 4.5 20.5 19.5H3.5Z', 'M12 10.2v4', 'M12 17.2v.4'] },
  'arrow-left': { paths: ['M19.5 12h-15', 'M11 6l-6 6 6 6'] },
  'arrow-right': { paths: ['M4.5 12h15', 'M13 6l6 6-6 6'] },
  bell: { paths: ['M18 15.5V10a6 6 0 1 0-12 0v5.5L4.5 18h15L18 15.5Z', 'M10 20.5a2 2 0 0 0 4 0'] },
  briefcase: { paths: ['M4 8.5h16V20H4z', 'M9 8.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5', 'M4 13h16'] },
  calendar: { paths: ['M4.5 6.5h15V20h-15z', 'M4.5 10.5h15', 'M8.5 4v4', 'M15.5 4v4'] },
  chart: { paths: ['M4 19.5h16', 'M7.5 16.5V10', 'M12 16.5V5.5', 'M16.5 16.5v-4'] },
  check: { paths: ['M4.5 12.5l5 5 10-11'] },
  'check-circle': { paths: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M8 12.4l2.8 2.8 5.4-5.6'] },
  'chevron-down': { paths: ['M6 9.5l6 6 6-6'] },
  'chevron-right': { paths: ['M9.5 6l6 6-6 6'] },
  clock: { paths: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5.2l3.4 2'] },
  close: { paths: ['M6 6l12 12', 'M18 6 6 18'] },
  code: { paths: ['M9 7l-5 5 5 5', 'M15 7l5 5-5 5'] },
  edit: { paths: ['M4 20h4.5L20 8.5 15.5 4 4 15.5V20Z'] },
  eye: { paths: ['M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z', 'M14.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z'] },
  'eye-off': {
    paths: ['M3 3l18 18', 'M10.6 6.3A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.3 4', 'M6.3 8.2A17 17 0 0 0 2.5 12S6 18 12 18c1.2 0 2.3-.2 3.3-.6'],
  },
  grid: { paths: [], rects: [[3.5, 3.5, 7, 7, 2], [13.5, 3.5, 7, 7, 2], [3.5, 13.5, 7, 7, 2], [13.5, 13.5, 7, 7, 2]] },
  history: { paths: ['M3.5 12a8.5 8.5 0 1 0 8.5-8.5A8.4 8.4 0 0 0 5.6 6.6', 'M3.5 4v4.5H8', 'M12 8v4.4l3 1.8'] },
  home: { paths: ['M3.5 11 12 3.5 20.5 11v9.5h-17V11Z', 'M9.5 20.5V14h5v6.5'] },
  info: { paths: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 11.3v5.2', 'M12 7.9v.4'] },
  list: { paths: ['M8.5 6.5h11', 'M8.5 12h11', 'M8.5 17.5h11', 'M4.5 6.5v.01', 'M4.5 12v.01', 'M4.5 17.5v.01'] },
  lock: { paths: ['M5.5 11h13v9.5h-13z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'] },
  logout: { paths: ['M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5', 'M10 8.5 6 12l4 3.5', 'M6 12h9'] },
  'map-pin': { paths: ['M12 21.5s7-6.4 7-11.2a7 7 0 1 0-14 0c0 4.8 7 11.2 7 11.2Z', 'M14.3 10.2a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0Z'] },
  menu: { paths: ['M4 7h16', 'M4 12h16', 'M4 17h16'] },
  mail: {
    paths: ['M4 7.5h16v11H4z', 'm4.5 8.5 7.5 5.5 7.5-5.5'],
  },
  play: { paths: ['M8.5 5.8 18 12l-9.5 6.2V5.8Z'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  qr: {
    paths: ['M4 9.5V6a2 2 0 0 1 2-2h3.5', 'M14.5 4H18a2 2 0 0 1 2 2v3.5', 'M20 14.5V18a2 2 0 0 1-2 2h-3.5', 'M9.5 20H6a2 2 0 0 1-2-2v-3.5', 'M7.8 12h8.4v1.6H7.8z'],
  },
  refresh: { paths: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 3.5V9h-5.5'] },
  scissors: {
    paths: ['M8 8l11 11', 'M8 16 19 5'],
    circles: [[6, 8.5, 2.5], [6, 18, 2.5]],
  },
  search: { paths: ['M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'M16.5 16.5 21 21'] },
  settings: {
    paths: ['M4 8h8', 'M17.5 8H20', 'M4 16h3.5', 'M13 16h7'],
    circles: [[14.5, 8, 2.3], [9.5, 16, 2.3]],
  },
  shield: { paths: ['M12 3.2 19.2 6v5.6c0 4.6-3 7.8-7.2 9.2-4.2-1.4-7.2-4.6-7.2-9.2V6L12 3.2Z'] },
  sparkle: { paths: ['M12 3.5 13.7 8.3 18.5 10l-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5Z'] },
  star: { paths: ['M12 3.8l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.8Z'] },
  storefront: { paths: ['M4 10.5h16V20H4z', 'M3 10.5 4.6 5h14.8L21 10.5', 'M9 20v-5h6v5'] },
  ticket: { paths: ['M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4V8.5Z', 'M12 7.2v1.8', 'M12 11.1v1.8', 'M12 15v1.8'] },
  trash: { paths: ['M4.5 6.5h15', 'M9.5 6.5V4.5h5v2', 'M6.5 6.5l1 13.5h9l1-13.5', 'M10.5 10v6.5', 'M13.5 10v6.5'] },
  user: { paths: ['M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'] },
  users: {
    paths: ['M9.5 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M2.5 20.5a7 7 0 0 1 14 0', 'M17 11.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z', 'M18 20.5a6 6 0 0 0-4.2-5.7'],
  },
  zap: { paths: ['M13.5 3 6 13.5h5.5L10.5 21 18 10.5h-5.5L13.5 3Z'] },
};

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color = Palette.ink, strokeWidth = 1.8 }: IconProps) {
  const shape = shapes[name];

  /**
   * `accessibilityElementsHidden` and `importantForAccessibility` are iOS-only
   * hints. react-native-svg forwards them straight to the DOM on web, so they
   * are only sent on native and `aria-hidden` carries the intent on web.
   */
  const hidden = Platform.OS === 'web' ? { 'aria-hidden': true } : {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no' as const,
  };

  return (
    <Svg
      {...hidden}
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {shape.paths.map((d, index) => (
        <Path d={d} key={`p${index}`} />
      ))}
      {shape.circles?.map(([cx, cy, r], index) => (
        <Circle cx={cx} cy={cy} key={`c${index}`} r={r} />
      ))}
      {shape.rects?.map(([x, y, width, height, rx], index) => (
        <Rect height={height} key={`r${index}`} rx={rx} width={width} x={x} y={y} />
      ))}
    </Svg>
  );
}