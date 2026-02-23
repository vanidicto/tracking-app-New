import './Card.css';

export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`pm-card-ui ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
