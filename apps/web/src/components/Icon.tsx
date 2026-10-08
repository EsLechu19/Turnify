import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRight,
  faBell,
  faChartLine,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faClock,
  faXmark,
  faCopy,
  faTh,
  faCircleInfo,
  faList,
  faRightFromBracket,
  faPause,
  faPlus,
  faRotate,
  faScissors,
  faMagnifyingGlass,
  faGear,
  faStore,
  faTicket,
  faUser,
  faUserPlus,
  faUserXmark,
  faUsers,
  faBolt,
  faStar,
  faArrowsAltH,
  faEllipsisV,
  faPen,
  faTrashCan,
  faEye,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';

export type IconName =
  | 'arrow-right'
  | 'bell'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'clock'
  | 'close'
  | 'copy'
  | 'download'
  | 'edit'
  | 'ellipsis-v'
  | 'eye'
  | 'grid'
  | 'info'
  | 'list'
  | 'logout'
  | 'pause'
  | 'plus'
  | 'refresh'
  | 'scissors'
  | 'search'
  | 'settings'
  | 'star'
  | 'store'
  | 'ticket'
  | 'trash'
  | 'user'
  | 'user-arrows'
  | 'user-plus'
  | 'user-xmark'
  | 'users'
  | 'zap';

const iconMap: Record<IconName, IconDefinition> = {
  'arrow-right': faArrowRight,
  bell: faBell,
  chart: faChartLine,
  check: faCheck,
  'check-circle': faCheckCircle,
  'chevron-down': faChevronDown,
  clock: faClock,
  close: faXmark,
  copy: faCopy,
  download: faDownload,
  edit: faPen,
  'ellipsis-v': faEllipsisV,
  eye: faEye,
  grid: faTh,
  info: faCircleInfo,
  list: faList,
  logout: faRightFromBracket,
  pause: faPause,
  plus: faPlus,
  refresh: faRotate,
  scissors: faScissors,
  search: faMagnifyingGlass,
  settings: faGear,
  star: faStar,
  store: faStore,
  ticket: faTicket,
  trash: faTrashCan,
  user: faUser,
  'user-arrows': faArrowsAltH,
  'user-plus': faUserPlus,
  'user-xmark': faUserXmark,
  users: faUsers,
  zap: faBolt,
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={iconMap[name]}
      style={{ fontSize: `${size}px` }}
      className={className}
    />
  );
}