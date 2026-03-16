import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, User, CreditCard, Phone, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import LoadingSpinner from '../../components/LoadingSpinner';
import './MyBracelet.css';

const MyBracelet = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [step, setStep] = useState('add'); // 'add' or 'confirm'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false);

    const [formData, setFormData] = useState({
        braceletName: '',
        serialNumber: '',
        emergencyName: '',
        emergencyNumber: ''
    });

    React.useEffect(() => {
        const fetchOwnedBracelet = async () => {
            if (!currentUser) return;
            try {
                const q = query(
                    collection(db, 'braceletUsers'), 
                    where('ownerAppUserId', '==', currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    const emergency = data.emergencyContacts?.[0] || {};
                    
                    setFormData({
                        braceletName: data.name || '',
                        serialNumber: data.serialNumber || '',
                        emergencyName: emergency.name || '',
                        emergencyNumber: emergency.contactNo || ''
                    });
                    setIsAlreadyConfigured(true);
                }
            } catch (err) {
                console.error("Error fetching owned bracelet:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOwnedBracelet();
    }, [currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => setStep('confirm');
    const handleBack = () => {
        if (step === 'confirm') setStep('add');
        else navigate(-1);
    };

    const handleRegister = async () => {
        if (!formData.braceletName || !formData.serialNumber || !formData.emergencyName || !formData.emergencyNumber) {
            alert("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const serial = formData.serialNumber.trim();

            // 1. Check if Serial Number already exists (document ID = serial number)
            const braceletRef = doc(db, 'braceletUsers', serial);
            const existingDoc = await getDoc(braceletRef);

            if (existingDoc.exists()) {
                alert("A bracelet with this Serial Number is already registered.");
                setIsSubmitting(false);
                return;
            }

            // 2. Avatar uses the wearer's Account profile photo (fallback handled by UI)
            const avatarURL = currentUser?.photoURL || null;

            // 3. Create braceletUsers document — Serial Number IS the Document ID
            await setDoc(braceletRef, {
                name: formData.braceletName,
                serialNumber: serial,
                ownerAppUserId: currentUser.uid,
                emergencyContacts: [{
                    name: formData.emergencyName,
                    contactNo: formData.emergencyNumber
                }],
                avatar: avatarURL,
            });

            // 4. Create deviceStatus document — Same Serial Number as Document ID
            const deviceRef = doc(db, 'deviceStatus', serial);
            await setDoc(deviceRef, {
                battery: 100,
                isBraceletOn: true,
                lastSeen: serverTimestamp(),
                location: [0, 0],

                sos: { active: false, timestamp: null },
            });

            alert("Bracelet Registered Successfully!");
            navigate('/app', { state: { openProfile: true } });

        } catch (error) {
            console.error("Error registering bracelet:", error);
            alert("Failed to register bracelet. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isConfirm = step === 'confirm';

    return (
        <div className="br-page">
            <header className="br-navbar">
                <button className="br-nav-back" onClick={handleBack}>
                    <ChevronLeft size={24} color="#444" />
                </button>
                <h1 className="br-nav-title">
                    {isConfirm ? "Confirm Details" : (isAlreadyConfigured ? "Edit Bracelet" : "Register My Bracelet")}
                </h1>
                <div className="br-nav-spacer"></div>
            </header>

            {isLoading ? (
                <div className="br-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LoadingSpinner />
                </div>
            ) : (
                <main className="br-main">
                    <div className="br-form-container">
                        {/* Bracelet Information Section */}
                        <div className="br-section">
                            <div className="br-section-header">
                                <h2 className="br-section-title">
                                    <span className="br-indicator"></span>
                                    {isAlreadyConfigured ? "CURRENT CONFIGURATION" : "BRACELET CONFIGURATION"}
                                </h2>
                                {isAlreadyConfigured && !isConfirm && (
                                    <div className="br-configured-badge">
                                        <CheckCircle2 size={14} /> Already Configured
                                    </div>
                                )}
                                {isConfirm && <button className="br-edit-link" onClick={() => setStep('add')}>Edit</button>}
                            </div>

                        <div className="br-field">
                            <label className="br-label">Name of Bracelet User {!isConfirm && <span className="br-required">*</span>}</label>
                            <div className="br-input-group">
                                <User size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="braceletName"
                                    placeholder="Enter your name"
                                    value={formData.braceletName}
                                    onChange={handleChange}
                                    disabled={isConfirm}
                                    required
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
                                    placeholder="PM-YYYYMMDD-XXX"
                                    value={formData.serialNumber}
                                    onChange={handleChange}
                                    disabled={isConfirm}
                                    required
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
                                    disabled={isConfirm}
                                    required
                                />
                            </div>
                        </div>

                        <div className="br-field">
                            <label className="br-label">Contact Number {!isConfirm && <span className="br-required">*</span>}</label>
                            <div className="br-input-group">
                                <Phone size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="emergencyNumber"
                                    placeholder="Enter contact number"
                                    value={formData.emergencyNumber}
                                    onChange={handleChange}
                                    disabled={isConfirm}
                                    required
                                />
                            </div>
                            {isConfirm && <p className="br-hint br-hint-center">Please make sure the information is correct before proceeding</p>}
                        </div>
                    </div>
                </div>
                </main>
            )}

            <footer className="br-footer">
                <button className="br-btn-secondary" onClick={() => navigate('/app')}>Cancel</button>
                {isConfirm ? (
                    <button className="br-btn-primary" onClick={handleRegister} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving Changes...' : (isAlreadyConfigured ? 'Save Changes' : 'Confirm & Save')}
                    </button>
                ) : (
                    <button className="br-btn-primary" onClick={handleNext} disabled={isLoading}>Next</button>
                )}
            </footer>
        </div>
    );
};

export default MyBracelet;
