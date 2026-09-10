type SlideToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
};

export function SlideToggle({ checked, onChange, label, id }: SlideToggleProps) {
  const toggleId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <button
      type="button"
      role="switch"
      id={toggleId}
      className={`slide-toggle${checked ? " slide-toggle-on" : ""}`}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="slide-toggle-thumb" aria-hidden="true" />
    </button>
  );
}
