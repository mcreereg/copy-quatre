type StepperProps = {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

export function Stepper({ label, value, onDecrement, onIncrement }: StepperProps) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button type="button" className="stepper-btn" onClick={onDecrement} aria-label={`Decrease ${label}`}>
          −
        </button>
        <span className="stepper-value">{value}</span>
        <button type="button" className="stepper-btn" onClick={onIncrement} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
