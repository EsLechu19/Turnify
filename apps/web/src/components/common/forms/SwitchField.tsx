export function SwitchField({
  id,
  label,
  detail,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row" htmlFor={id}>
      <span>
        <strong style={{ display: 'block' }}>{label}</strong>
        {detail ? <span className="muted">{detail}</span> : null}
      </span>
      <input
        checked={checked}
        className="switch"
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
