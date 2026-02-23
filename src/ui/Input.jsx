import './Input.css';

export default function Input({
  label,
  helperText,
  error,
  rightSlot,
  className = '',
  ...props
}) {
  return (
    <div className={`pm-field ${className}`.trim()}>
      {label && <label className="pm-label">{label}</label>}

      <div className={`pm-inputWrap ${error ? 'pm-inputWrap--error' : ''}`.trim()}>
        <input className="pm-input" {...props} />
        {rightSlot ? <div className="pm-rightSlot">{rightSlot}</div> : null}
      </div>

      {error ? (
        <div className="pm-helper pm-helper--error">{error}</div>
      ) : helperText ? (
        <div className="pm-helper">{helperText}</div>
      ) : null}
    </div>
  );
}
