export function SelectField({
  label,
  value,
  onChange,
  options,
  help,
  ariaLabel,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { label: string; value: string | number }[];
  help?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? <small>{help}</small> : null}
    </label>
  );
}
