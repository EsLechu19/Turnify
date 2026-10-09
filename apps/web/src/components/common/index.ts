/**
 * The only component surface features are allowed to import.
 *
 * Everything below is presentation-only: no feature data, no domain rules.
 * Sub-folders keep the source grouped; this barrel is what consumers use.
 */

export { Button, type ButtonVariant } from './Button';
export { IconButton } from './IconButton';

export { Badge, type BadgeTone } from './data-display/Badge';
export { CardNote } from './data-display/CardNote';
export { EmptyState } from './data-display/EmptyState';
export { InfoCell } from './data-display/InfoCell';
export { MiniStat } from './data-display/MiniStat';
export { StatCard } from './data-display/StatCard';

export { Card, CardHead } from './layout/Card';
export { CardGrid } from './layout/CardGrid';
export { PageHeader } from './layout/PageHeader';
export { SectionCard } from './layout/SectionCard';
export { StatsRow, type StatItem } from './layout/StatsRow';
export { TwoColumnGrid } from './layout/TwoColumnGrid';

export { CheckboxGroup } from './forms/CheckboxGroup';
export { RadioGroup } from './forms/RadioGroup';
export { SegmentedControl } from './forms/SegmentedControl';
export { SelectField } from './forms/SelectField';
export { SwitchField } from './forms/SwitchField';
export { TextareaField } from './forms/TextareaField';

export { ConfirmModal } from './modals/ConfirmModal';
export { DetailRow } from './modals/DetailRow';
export { FormModal } from './modals/FormModal';
export { Modal } from './modals/Modal';