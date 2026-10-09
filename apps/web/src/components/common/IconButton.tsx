import { Icon, type IconName } from '@/components/Icon';

export function IconButton({
  icon,
  label,
  tone = 'ghost',
  onClick,
}: {
  icon: IconName;
  label: string;
  tone?: 'ghost' | 'danger';
  onClick: () => void;
}) {
  return (
    <button aria-label={label} className={`btn btn--${tone} btn--sm`} onClick={onClick} title={label} type="button">
      <Icon name={icon} size={15} />
    </button>
  );
}