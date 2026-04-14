import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, User, CreditCard, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import LoadingSpinner from '../../components/LoadingSpinner';
import SuccessModal from '../../components/SuccessModal';
import './MyBracelet.css';

const MyBraceletConfig = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
    const [originalData, setOriginalData] = useState({ braceletName: '', serialNumber: '' });

    const [formData, setFormData] = useState({
        braceletName: '',
        serialNumber: '',
    });

    const [originalSerial, setOriginalSerial] = useState('');
    const [existingEmergencyContacts, setExistingEmergencyContacts] = useState([]);

    const [errors, setErrors] = useState({
        serialNumber: '',
    });

    const SERIAL_NUMBER_REGEX = /^PM-\d{4}-\d{3,5}$/;

    useEffect(() => {
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
                    
                    setFormData({
                        braceletName: data.name || '',
                        serialNumber: data.serialNumber || '',
                    });
                    setOriginalData({
                        braceletName: data.name || '',
                        serialNumber: data.serialNumber || '',
                    });
                    setOriginalSerial(data.serialNumber || '');
                    setExistingEmergencyContacts(data.emergencyContacts || []);
                    setIsAlreadyConfigured(true);
                    setIsEditing(false);
                } else {
                    setIsEditing(true);
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
        if (!isEditing) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'serialNumber' && errors.serialNumber) {
            setErrors(prev => ({ ...prev, serialNumber: '' }));
        }
    };

    const handleCancelEdit = () => {
        if (!isAlreadyConfigured) {
            navigate('/app/my-bracelet');
        } else {
            setFormData(originalData);
            setErrors({ serialNumber: '' });
            setIsEditing(false);
        }
    };

    const validate = () => {
        let newErrors = { serialNumber: '' };
        let hasError = false;

        if (!SERIAL_NUMBER_REGEX.test(formData.serialNumber)) {
            newErrors.serialNumber = 'Invalid format. Use PM-YYYY-XXX (e.g., PM-2026-001)';
            hasError = true;
        }

        setErrors(newErrors);
        return !hasError;
    };

    const handleSave = async () => {
        if (!formData.braceletName || !formData.serialNumber) {
            alert("Please fill in all required fields.");
            return;
        }

        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const serial = formData.serialNumber.trim();
            const braceletRef = doc(db, 'braceletUsers', serial);
            
            const hasSerialChanged = isAlreadyConfigured && serial !== originalSerial;
            
            if (!isAlreadyConfigured || hasSerialChanged) {
                const existingDoc = await getDoc(braceletRef);
                if (existingDoc.exists()) {
                    alert("A bracelet with this Serial Number is already registered by another user.");
                    setIsSubmitting(false);
                    return;
                }
            }

            const avatarURL = currentUser?.photoURL || null;

            await setDoc(braceletRef, {
                name: formData.braceletName,
                serialNumber: serial,
                ownerAppUserId: currentUser.uid,
                avatar: avatarURL,
                // Preserve emergency contacts if moving to a new serial number
                emergencyContacts: existingEmergencyContacts
            }, { merge: true });

            if (!isAlreadyConfigured) {
                const deviceRef = doc(db, 'deviceStatus', serial);
                await setDoc(deviceRef, {
                    battery: 100,
                    isBraceletOn: true,
                    lastSeen: serverTimestamp(),
                    location: { latitude: 0, longitude: 0, updatedAt: serverTimestamp() },
                    sos: { active: false, timestamp: null },
                });
                setModalConfig({
                    isOpen: true,
                    title: "Registration Successful",
                    message: "Your bracelet configuration has been registered!"
                });
            } else {
                if (hasSerialChanged) {
                    await deleteDoc(doc(db, 'braceletUsers', originalSerial));
                    await deleteDoc(doc(db, 'deviceStatus', originalSerial));
                    setOriginalSerial(serial);
                    setModalConfig({
                        isOpen: true,
                        title: "Migration Successful",
                        message: "Serial Number updated and migrated successfully."
                    });
                } else {
                    setModalConfig({
                        isOpen: true,
                        title: "Update Successful",
                        message: "Bracelet configuration updated successfully."
                    });
                }
            }
            
            setOriginalData({ braceletName: formData.braceletName, serialNumber: serial });
            setOriginalSerial(serial);
            setIsAlreadyConfigured(true);
            setIsEditing(false);

        } catch (error) {
            console.error("Error registering/updating bracelet:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="br-page">
            <header className="br-navbar">
                <button className="br-nav-back" onClick={() => navigate('/app/my-bracelet')}>
                    <ChevronLeft size={24} color="#444" />
                </button>
                <h1 className="br-nav-title">
                    {isAlreadyConfigured ? "Bracelet Configuration" : "Register Bracelet"}
                </h1>
                {isAlreadyConfigured && !isEditing ? (
                    <button className="br-nav-edit-btn" onClick={() => setIsEditing(true)}>
                        Edit
                    </button>
                ) : (
                    <div className="br-nav-spacer"></div>
                )}
            </header>

            {isLoading ? (
                <div className="br-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LoadingSpinner />
                </div>
            ) : (
                <main className="br-main" style={{ paddingBottom: '0px' }}>
                    <div className="br-form-container">
                        <div className="br-section">
                            <div className="br-section-header">
                                <h2 className="br-section-title">
                                    <span className="br-indicator"></span>
                                    BRACELET ALIAS & SERIAL
                                </h2>
                                {isAlreadyConfigured && (
                                    <div className="br-configured-badge">
                                        <CheckCircle2 size={18} className='circle-icon'/> Active
                                    </div>
                                )}
                            </div>

                        <div className="br-field">
                            <label className="br-label">Name of Bracelet User <span className="br-required">*</span></label>
                            <div className="br-input-group">
                                <User size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="braceletName"
                                    placeholder="Enter your name"
                                    value={formData.braceletName}
                                    onChange={handleChange}
                                    readOnly={!isEditing}
                                    required
                                />
                            </div>
                        </div>

                        <div className="br-field">
                            <label className="br-label">Bracelet Serial Number <span className="br-required">*</span></label>
                            <div className="br-input-group">
                                <CreditCard size={18} className="br-icon" />
                                <input
                                    className="br-input"
                                    type="text"
                                    name="serialNumber"
                                    placeholder="PM-YYYY-XXX"
                                    value={formData.serialNumber}
                                    onChange={handleChange}
                                    readOnly={!isEditing}
                                    required
                                />
                            </div>
                            {errors.serialNumber && <p className="br-error" style={{ margin: '0px' }}>{errors.serialNumber}</p>}
                            <p className="br-hint" style={{ margin: '0px' }}>You can find the serial number on the back of the bracelet</p>
                        </div>
                    </div>
                </div>
                </main>
            )}
            {isEditing && (
                <footer className="br-footer" >
                    <button className="br-btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                    <button className="br-btn-primary" onClick={handleSave} disabled={isSubmitting || isLoading}>
                        {isSubmitting ? 'Saving Changes...' : 'Save Configuration'}
                    </button>
                </footer>
            )}

            <SuccessModal 
                isOpen={modalConfig.isOpen} 
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
            />
        </div>
    );
};

export default MyBraceletConfig;
