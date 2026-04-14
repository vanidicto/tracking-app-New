import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import './SuccessModal.css';

const SuccessModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="success-modal-backdrop">
      <div className="success-modal-content">
        <div className="success-modal-icon-wrapper">
          <CheckCircle2 size={48} color="var(--pm-primary, #a4262c)" strokeWidth={1.5} />
        </div>
        <h2 className="success-modal-title">
          {title || "Success"}
        </h2>
        <p className="success-modal-message">
          {message || "The operation was completed successfully."}
        </p>
        <button 
          className="success-modal-btn" 
          onClick={onClose}
        >
          Okay
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
