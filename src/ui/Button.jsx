import './Button.css';

/**
 * Reusable button.
 *
 * Variants:
 * - primary: brand maroon
 * - secondary: neutral
 * - ghost: transparent
 * - danger: panic red
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      className={`pm-btn pm-btn--${variant} pm-btn--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
