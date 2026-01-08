// src/components/ProfileModal.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProfileModal.css';
import logo from '../assets/logo.png'; // Our app logo
import avatar from '../assets/red.webp'; // Your mock avatar
import { 
  X, User, Shield, Phone, Lock, HelpCircle, Info, Moon 
} from 'lucide-react';

// Mock data for the links based on Figma
const menuItems = [
  { icon: User, label: 'Account' },
  { icon: Shield, label: 'My Room' }, // This replaces "Connect Bracelet"
  { icon: Lock, label: 'Privacy & Security' },
  { icon: HelpCircle, label: 'Help Articles' },
  { icon: Phone, label: 'Chat with Support' },
  { icon: Info, label: 'About' },
  { icon: Moon, label: 'Dark mode', toggle: true }, // Add toggle prop
];

const ProfileModal = ({ isOpen, onClose }) => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
    onClose(); // Close the modal
  };

  // Stop click from closing modal
  const handleContentClick = (e) => e.stopPropagation();

  // We add a class to the body to prevent scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    // Cleanup function
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);


  return (
    <div 
      className={`profile-modal-backdrop ${isOpen ? 'open' : ''}`} 
      onClick={onClose}
    >
      <div 
        className={`profile-modal-content ${isOpen ? 'open' : ''}`} 
        onClick={handleContentClick}
      >
        <div className="profile-modal-header">
          {/* This is the logo from the FIGMA, not the top-bar */}
          <img src={logo} alt="PingMe Logo" className="modal-header-logo" />
          <button className="modal-close-btn" onClick={onClose}>
            <X size={26} />
          </button>
        </div>

        {/* User Info */}
        <div className="profile-modal-user">
          <img src={avatar} alt="User Avatar" className="profile-modal-avatar" />
          <h2 className="profile-modal-name">{currentUser.displayName}</h2>
          <p className="profile-modal-email">{currentUser.email}</p>
        </div>

        {/* Menu List */}
        <nav className="profile-modal-nav">
          {menuItems.map((item, index) => (
            <Link to="#" className="profile-nav-item" key={index}>
              <item.icon size={22} className="nav-item-icon" />
              <span className="nav-item-label">{item.label}</span>
              {item.toggle && (
                <div className="toggle-switch">
                  <div className="toggle-knob"></div>
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer with Logout */}
        <div className="profile-modal-footer">
          <button className="footer-logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;