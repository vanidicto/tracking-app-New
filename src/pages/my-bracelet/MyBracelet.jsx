import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Plus, Pencil, User, CreditCard, Phone } from 'lucide-react';
import './MyBracelet.css';

const MyBracelet = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [step, setStep] = useState('add'); // 'add' or 'confirm'

    const [formData, setFormData] = useState({
        braceletName: 'ABCD E. FG',
        serialNumber: '123456MNL',
        emergencyName: 'Juan Dela Cruz',
        emergencyNumber: '0912345678'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => setStep('confirm');
    const handleBack = () => {
        if (step === 'confirm') setStep('add');
        else navigate('/app', { state: { openProfile: true } });
    };

    const isConfirm = step === 'confirm';

    return (
        <div className="br-page">
            <header className="br-navbar">
                <button className="br-nav-back" onClick={handleBack}>
                    <ChevronLeft size={24} color="#444" />
                </button>
                <h1 className="br-nav-title">
                    {isConfirm ? "Confirm User Details" : "Add Bracelet User"}
                </h1>
                <div className="br-nav-spacer"></div>
            </header>

            <main className="br-main">
                <div className="br-avatar-section">
                    <div className="br-avatar-wrapper">
                        <div className="br-avatar-circle">
                            <Plus size={48} color="#fff" strokeWidth={2.5} />
                            {isConfirm && (
                                <button className="br-avatar-edit" onClick={() => setStep('add')}>
                                    <Pencil size={12} color="#A4262C" />
                                </button>
                            )}
                        </div>
                        <p className="br-avatar-label">Upload Profile Photo</p>
                    </div>
                </div>

                <div className="br-form-container">
                    {/* Bracelet Information Section */}
                    <div className="br-section">
                        <div className="br-section-header">
                            <h2 className="br-section-title">
                                <span className="br-indicator"></span>
                                BRACELET INFORMATION
                            </h2>
                            {isConfirm && <button className="br-edit-link" onClick={() => setStep('add')}>Edit</button>}
                        </div>

                        <div className="br-field">
                            <label className="br-label">Name of Bracelet {!isConfirm && <span className="br-required">*</span>}</label>
                            <div className="br-input-group">
                                <User size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="braceletName"
                                    placeholder="Enter bracelet name"
                                    value={formData.braceletName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="br-field">
                            <label className="br-label">Bracelet Serial Number {!isConfirm && <span className="br-required">*</span>}</label>
                            <div className="br-input-group">
                                <CreditCard size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="serialNumber"
                                    placeholder="Enter serial number"
                                    value={formData.serialNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            <p className="br-hint">You can find the serial number on the back of the bracelet</p>
                        </div>
                    </div>

                    {/* Emergency Contact Section */}
                    <div className="br-section">
                        <div className="br-section-header">
                            <h2 className="br-section-title">
                                <span className="br-indicator"></span>
                                EMERGENCY CONTACT
                            </h2>
                            {isConfirm && <button className="br-edit-link" onClick={() => setStep('add')}>Edit</button>}
                        </div>

                        <div className="br-field">
                            <label className="br-label">Name {!isConfirm && <span className="br-required">*</span>}</label>
                            <div className="br-input-group">
                                <User size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="emergencyName"
                                    placeholder="Enter contact name"
                                    value={formData.emergencyName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="br-field">
                            <label className="br-label">Contact Number {!isConfirm && <span className="br-required">*</span>}</label>
                            <div className="br-input-group">
                                <CreditCard size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="emergencyNumber"
                                    placeholder="Enter contact number"
                                    value={formData.emergencyNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            {isConfirm && <p className="br-hint br-hint-center">Please make sure the information is correct before proceeding</p>}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="br-footer">
                <button className="br-btn-secondary" onClick={() => navigate('/app', { state: { openProfile: true } })}>Cancel</button>
                {isConfirm ? (
                    <button className="br-btn-primary" onClick={() => navigate('/app', { state: { openProfile: true } })}>Confirm & Save</button>
                ) : (
                    <button className="br-btn-primary" onClick={handleNext}>Next</button>
                )}
            </footer>
        </div>
    );
};

export default MyBracelet;
