import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, User, Phone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import LoadingSpinner from '../../components/LoadingSpinner';
import SuccessModal from '../../components/SuccessModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import './MyBracelet.css';

const MyBraceletEmergency = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [serialNumber, setSerialNumber] = useState(null);
    const [originalContacts, setOriginalContacts] = useState([{ name: '', contactNo: '' }]);
    const [contacts, setContacts] = useState([{ name: '', contactNo: '' }]);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', buttonText: '', hideButton: false, autoClose: false });
    const [contactToDeleteIndex, setContactToDeleteIndex] = useState(null);
    const [errors, setErrors] = useState([]);

    const PHONE_NUMBER_REGEX = /^(09\d{9}|\+639\d{9})$/;

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
                    const emergency = data.emergencyContacts || [];
                    
                    if (emergency.length > 0) {
                        setContacts(emergency);
                        setOriginalContacts(emergency);
                        setIsEditing(false);
                    } else {
                        setContacts([{ name: '', contactNo: '' }]);
                        setOriginalContacts([{ name: '', contactNo: '' }]);
                        setIsEditing(true);
                    }
                    setSerialNumber(data.serialNumber);
                    setIsConfigured(true);
                } else {
                    setIsConfigured(false);
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

    const handleChange = (index, field, value) => {
        if (!isEditing) return;
        const newContacts = [...contacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setContacts(newContacts);
        
        const newErrors = [...errors];
        if (newErrors[index] && newErrors[index][field]) {
            newErrors[index][field] = '';
            setErrors(newErrors);
        }
    };

    const handleAddContact = () => {
        setContacts([...contacts, { name: '', contactNo: '' }]);
    };

    const handleRemoveContact = (index) => {
        const newContacts = [...contacts];
        newContacts.splice(index, 1);
        setContacts(newContacts);
        
        const newErrors = [...errors];
        newErrors.splice(index, 1);
        setErrors(newErrors);
    };

    const handleConfirmDelete = async () => {
        if (contactToDeleteIndex === null) return;
        setIsSubmitting(true);
        try {
            const newContacts = [...contacts];
            newContacts.splice(contactToDeleteIndex, 1);
            
            const braceletRef = doc(db, 'braceletUsers', serialNumber);
            const contactsToSave = newContacts.map(c => ({
                name: c.name.trim(),
                contactNo: c.contactNo.trim()
            }));

            await setDoc(braceletRef, {
                emergencyContacts: contactsToSave
            }, { merge: true });

            setContacts(newContacts);
            setOriginalContacts(contactsToSave);
            
            const newErrors = [...errors];
            newErrors.splice(contactToDeleteIndex, 1);
            setErrors(newErrors);

            setIsEditing(false);

            setContactToDeleteIndex(null);
            setModalConfig({
                isOpen: true,
                title: "Successfully Removed",
                message: "The contact has been deleted from your emergency list.",
                hideButton: true,
                autoClose: true
            });
        } catch (error) {
            console.error("Error deleting contact:", error);
            alert("Failed to delete contact.");
            setContactToDeleteIndex(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setContacts(originalContacts);
        setErrors([]);
        setIsEditing(false);
    };

    const validate = () => {
        let isValid = true;
        const newErrors = [];
        contacts.forEach((contact, index) => {
            let errs = {};
            if (contact.contactNo && !PHONE_NUMBER_REGEX.test(contact.contactNo)) {
                errs.contactNo = 'Invalid format. Use 09 or +639 format (e.g., 09123456789)';
                isValid = false;
            }
            newErrors[index] = errs;
        });
        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async () => {
        if (!isConfigured || !serialNumber) {
            alert("Please complete the Bracelet Configuration first before adding an Emergency Contact.");
            return;
        }

        const emptyFields = contacts.some(c => !c.name.trim() || !c.contactNo.trim());
        if (emptyFields) {
            alert("Please fill in all required fields for every contact.");
            return;
        }

        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const braceletRef = doc(db, 'braceletUsers', serialNumber);

            const contactsToSave = contacts.map(c => ({
                name: c.name.trim(),
                contactNo: c.contactNo.trim()
            }));

            await setDoc(braceletRef, {
                emergencyContacts: contactsToSave
            }, { merge: true });

            setModalConfig({
                isOpen: true,
                title: "Success!",
                message: "Emergency contact has been successfully added to your list.",
                buttonText: "Great!",
                hideButton: false,
                autoClose: false
            });
            
            setOriginalContacts(contactsToSave);
            setIsEditing(false);

        } catch (error) {
            console.error("Error updating emergency contact:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="br-page">
                <header className="br-navbar">
                    <button className="br-nav-back" onClick={() => navigate('/app/my-bracelet')}>
                        <ChevronLeft size={24} color="#444" />
                    </button>
                    <h1 className="br-nav-title">Emergency Contact</h1>
                    <div className="br-nav-spacer"></div>
                </header>
                <div className="br-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className="br-page">
            <header className="br-navbar">
                <button className="br-nav-back" onClick={() => navigate('/app/my-bracelet')}>
                    <ChevronLeft size={24} color="#444" />
                </button>
                <h1 className="br-nav-title">Emergency Contact</h1>
                {isConfigured && !isEditing ? (
                    <button className="br-nav-edit-btn" onClick={() => setIsEditing(true)}>
                        Edit
                    </button>
                ) : (
                    <div className="br-nav-spacer"></div>
                )}
            </header>

            <main className="br-main" style={{ paddingBottom: '0px' }}>
                <div className="br-form-container">
                    {!isConfigured && (
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #ffeeba' }}>
                            <AlertTriangle size={24} />
                            <div>
                                <strong>Setup Required</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Please complete the <strong>Bracelet Configuration</strong> first to set your Bracelet Serial Number.</p>
                            </div>
                        </div>
                    )}

                    <div className="br-section">
                        <div className="br-section-header">
                            <h2 className="br-section-title">
                                <span className="br-indicator"></span>
                                EMERGENCY CONTACT
                            </h2>
                        </div>

                        {contacts.map((contact, index) => (
                            <div key={index} style={{ marginBottom: '24px', borderBottom: index < contacts.length - 1 ? '1px solid #eee' : 'none', paddingBottom: index < contacts.length - 1 ? '24px' : '0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '14px', margin: 0, color: 'var(--pm-text)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                                        Contact {index + 1}
                                    </h3>
                                    {isEditing && contacts.length > 1 && (
                                        <button 
                                          className="br-btn-secondary" 
                                          style={{ padding: '6px 12px', fontSize: '12px', minWidth: 'auto', background: 'transparent', border: 'none', color: '#dc3545' }}
                                          onClick={() => setContactToDeleteIndex(index)}
                                          type="button"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="br-field">
                                    <label className="br-label">Name <span className="br-required">*</span></label>
                                    <div className="br-input-group">
                                        <User size={18} className="br-icon" />
                                        <input
                                            className="br-input"
                                            type="text"
                                            placeholder="Enter contact name"
                                            value={contact.name}
                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                                            readOnly={!isEditing}
                                            disabled={!isConfigured}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="br-field">
                                    <label className="br-label">Contact Number <span className="br-required">*</span></label>
                                    <div className="br-input-group">
                                        <Phone size={18} className="br-icon" />
                                        <input
                                            className="br-input"
                                            type="text"
                                            placeholder="Enter contact number"
                                            value={contact.contactNo}
                                            onChange={(e) => handleChange(index, 'contactNo', e.target.value)}
                                            readOnly={!isEditing}
                                            disabled={!isConfigured}
                                            required
                                        />
                                    </div>
                                    {errors[index]?.contactNo && <p className="br-error" style={{ margin: '0px' }}>{errors[index].contactNo}</p>}
                                </div>
                            </div>
                        ))}

                        {isEditing && (
                            <button 
                              className="br-btn-secondary"
                              style={{ width: '100%', marginTop: '8px', padding: '12px', background: 'transparent', color: 'var(--pm-primary)', border: '1px dashed var(--pm-primary)' }}
                              onClick={handleAddContact}
                              type="button"
                            >
                                + Add Another Contact
                            </button>
                        )}
                    </div>
                </div>
            </main>
            {isEditing && (
                <footer className="br-footer" >
                    <button className="br-btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                    <button className="br-btn-primary" onClick={handleSave} disabled={isSubmitting || !isConfigured}>
                        {isSubmitting ? 'Saving Changes...' : 'Save Contact'}
                    </button>
                </footer>
            )}

            <SuccessModal 
                isOpen={modalConfig.isOpen} 
                title={modalConfig.title}
                message={modalConfig.message}
                buttonText={modalConfig.buttonText}
                hideButton={modalConfig.hideButton}
                autoClose={modalConfig.autoClose}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
            />

            <ConfirmationModal 
                isOpen={contactToDeleteIndex !== null}
                onClose={() => setContactToDeleteIndex(null)}
                onConfirm={handleConfirmDelete}
                title="Remove Contact?"
                message="Are you sure you want to remove this emergency contact? This action cannot be undone."
                confirmText={isSubmitting ? "Removing..." : "Remove"}
                cancelText="Cancel"
                isDanger={true}
            />
        </div>
    );
};

export default MyBraceletEmergency;
