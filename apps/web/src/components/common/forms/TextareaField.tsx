export function TextareaField({
  label,
  value,
  onChange,
  help,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ resize: 'none' }}
        value={value}
      />
      {help ? <small>{help}</small> : null}
    </label>
  );
}
