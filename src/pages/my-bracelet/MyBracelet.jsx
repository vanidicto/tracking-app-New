import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import fallbackAvatar from '../../assets/red.webp';
import './MyBracelet.css';

const MyBracelet = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [braceletName, setBraceletName] = useState('ABCD E. FG');
    const [serialNumber, setSerialNumber] = useState('123456MNL');
    const [contactName, setContactName] = useState(currentUser?.displayName || 'Juan Dela Cruz');
    const [contactNumber, setContactNumber] = useState('0912345678');

    const displayAvatar = currentUser?.photoURL || fallbackAvatar;

    return (
        <div className="mobile-container">
            <div className="br-scrollable-content">
                {/* Header Section */}
                <div className="br-header-section">
                    <div className="br-header-top">
                        <button className="br-back-button" onClick={() => navigate('/app')}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <h1 className="br-header-title">Confirm User Details</h1>
                        <div className="br-header-right-placeholder"></div>
                    </div>

                    <div className="br-profile-image-container">
                        <div className="br-profile-circle">
                            <img
                                src={displayAvatar}
                                alt="User Avatar"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="br-form-content">
                    {/* Bracelet Info Section */}
                    <div className="br-section">
                        <div className="br-section-header">
                            <h2><span className="br-vertical-line"></span> BRACELET INFORMATION</h2>
                            <button className="br-edit-text-btn">Edit</button>
                        </div>

                        <div className="br-input-group">
                            <label>Name of Bracelet</label>
                            <div className="br-input-wrapper">
                                <span className="br-input-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </span>
                                <input
                                    type="text"
                                    value={braceletName}
                                    onChange={(e) => setBraceletName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="br-input-group">
                            <label>Bracelet Serial Number</label>
                            <div className="br-input-wrapper">
                                <span className="br-input-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                                </span>
                                <input
                                    type="text"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                />
                            </div>
                            <span className="br-help-text">You can find the serial number on the back of the bracelet</span>
                        </div>
                    </div>

                    {/* Emergency Contact Section */}
                    <div className="br-section">
                        <div className="br-section-header">
                            <h2><span className="br-vertical-line"></span> EMERGENCY CONTACT</h2>
                            <button className="br-edit-text-btn">Edit</button>
                        </div>

                        <div className="br-input-group">
                            <label>Name</label>
                            <div className="br-input-wrapper">
                                <span className="br-input-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </span>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="br-input-group">
                            <label>Contact Number</label>
                            <div className="br-input-wrapper">
                                <span className="br-input-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                                </span>
                                <input
                                    type="text"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                />
                            </div>
                            <span className="br-help-text br-help-text-center">Please make sure the information is correct before proceeding</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="br-bottom-actions">
                <button className="br-btn-cancel" onClick={() => navigate('/app')}>Cancel</button>
                <button className="br-btn-confirm">Confirm & Save</button>
            </div>
        </div>
    );
};

export default MyBracelet;
