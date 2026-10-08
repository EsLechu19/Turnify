export interface CheckboxOption {
  value: string;
  label: string;
  checked: boolean;
}

export function CheckboxGroup({
  label,
  options,
  onToggle,
}: {
  label?: string;
  options: CheckboxOption[];
  onToggle: (value: string, checked: boolean) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {label ? <strong>{label}</strong> : null}
      {options.map((option) => (
        <label
          key={option.value}
          style={{ alignItems: 'center', display: 'flex', gap: 10 }}
        >
          <input
            checked={option.checked}
            onChange={(event) => onToggle(option.value, event.target.checked)}
            type="checkbox"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
