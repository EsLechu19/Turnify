export interface RadioOption {
  value: string;
  label: string;
  detail?: string;
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {label ? <strong>{label}</strong> : null}
      {options.map((option) => (
        <label
          key={option.value}
          style={{ alignItems: 'center', display: 'flex', gap: 12 }}
        >
          <input
            checked={value === option.value}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
          />
          <span>
            <strong style={{ display: 'block' }}>{option.label}</strong>
            {option.detail ? <span className="muted">{option.detail}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
