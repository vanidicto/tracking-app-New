import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, updateEmail, sendEmailVerification, linkWithPopup, reauthenticateWithCredential, updatePassword, EmailAuthProvider } from "firebase/auth";
import { doc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db, googleProvider } from "../../config/firebaseConfig";
import { useToast } from "../../context/ToastContext";
import avatar from "../../assets/red.webp";
import { Camera, ChevronLeft, User, Mail, ShieldCheck, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { getPasswordStrengthScore, getStrengthMeta, isPasswordValid } from "../../utils/passwordValidation";
import "./Account.css";

export default function Account() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  // Change Password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const pwStrengthScore = getPasswordStrengthScore(newPw);
  const pwStrengthMeta  = getStrengthMeta(pwStrengthScore);

  const isGoogleUser = currentUser?.providerData.some(p => p.providerId === 'google.com');
  const fileInputRef = useRef(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result);
        addToast("Photo preview updated.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      let finalPhotoURL = currentUser.photoURL;

      if (photoFile) {
        // Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("upload_preset", "pingme_avatars");

        const response = await fetch("https://api.cloudinary.com/v1_1/djaved28z/image/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Cloudinary Error:", errorData);
          throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary");
        }

        const data = await response.json();
        finalPhotoURL = data.secure_url;
      }

      if (email !== currentUser.email) {
        await updateEmail(currentUser, email);
      }

      await updateProfile(currentUser, {
        displayName: displayName,
        photoURL: finalPhotoURL
      });

      // Synchronize the new avatar/name/email directly to Firestore collections
      try {
        const batch = writeBatch(db);

        // 1. Update the appUser document
        const appUserRef = doc(db, 'appUsers', currentUser.uid);
        batch.update(appUserRef, {
          name: displayName,
          email: email,
          avatar: finalPhotoURL
        });

        // 2. Query and update all bracelets owned by this wearer so the photo cascades
        const q = query(collection(db, 'braceletUsers'), where('ownerAppUserId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          batch.update(docSnap.ref, { avatar: finalPhotoURL });
        });

        await batch.commit();
      } catch (dbError) {
        console.error("Error cascading profile updates to Firestore:", dbError);
      }

      addToast("Profile updated successfully!", "success");
      // Navigate back to profile modal
      navigate('/app', { state: { openProfile: true } });
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.code === 'auth/requires-recent-login') {
        addToast("For security, please log out and log back in to change your email address.", "error");
      } else if (error.code === 'auth/email-already-in-use') {
        addToast("That email address is already in use by another account.", "error");
      } else {
        addToast("Failed to update profile.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      setLinkingGoogle(true);
      await linkWithPopup(currentUser, googleProvider);
      await currentUser.reload();
      addToast("Successfully linked Google Account!", "success");
    } catch (error) {
      console.error("Error linking Google:", error);
      if (error.code === 'auth/credential-already-in-use') {
        addToast("This Google account is already linked to another user.", "error");
      } else {
        addToast("Failed to link Google account.", "error");
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleSendVerification = async () => {
    try {
      setSendingVerification(true);
      await sendEmailVerification(currentUser);
      addToast("Verification email sent! Check your inbox.", "success");
    } catch (error) {
      console.error("Error sending verification:", error);
      addToast(error.message || "Failed to send verification.", "error");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!currentPw) { setPwError("Please enter your current password."); return; }
    if (!isPasswordValid(newPw)) { setPwError("New password doesn't meet the requirements."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }

    setChangingPw(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      addToast("Password changed successfully!", "success");
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPwError("Current password is incorrect.");
      } else if (error.code === 'auth/too-many-requests') {
        setPwError("Too many attempts. Please try again later.");
      } else {
        setPwError("Failed to change password. Please try again.");
      }
    } finally {
      setChangingPw(false);
    }
  };

  const handleBack = () => {
    navigate('/app', { state: { openProfile: true } });
  };

  const handleEditToggle = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Revert all unsaved changes
    setDisplayName(currentUser?.displayName || "");
    setEmail(currentUser?.email || "");
    setPhotoURL(currentUser?.photoURL || "");
    setPhotoFile(null);
    setIsEditing(false);
  };

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={handleBack}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Account</h1>
        {!isEditing ? (
          <button className="br-nav-edit-btn" onClick={handleEditToggle}>
            Edit
          </button>
        ) : (
          <div className="br-nav-spacer"></div>
        )}
      </header>

      <main className="br-main">
        <div className="br-avatar-section">
          <div
            className={`br-avatar-wrapper${isEditing ? '' : ' br-avatar-wrapper--readonly'}`}
            onClick={isEditing ? handlePhotoClick : undefined}
          >
            <div className="br-avatar-circle">
              <img src={photoURL || avatar} alt="Avatar" className="br-avatar-img" />
              {isEditing && (
                <div className="br-avatar-edit">
                  <Camera size={12} color="#A4262C" />
                </div>
              )}
            </div>
            {isEditing && <p className="br-avatar-label">Upload Profile Photo</p>}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
        </div>

        <div className="br-form-container">
          {/* Personal Information Section */}
          <div className="br-section">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                PERSONAL INFORMATION
              </h2>
            </div>

            <div className="br-field">
              <label className="br-label">Display Name</label>
              <div className="br-input-group">
                <User size={18} className="br-icon" />
                <input
                  type="text"
                  className="br-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  readOnly={!isEditing}
                />
              </div>
            </div>

            <div className="br-field">
              <label className="br-label">Email Address</label>
              <div className="br-input-group">
                <Mail size={18} className="br-icon" />
                <input
                  type="email"
                  className="br-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isGoogleUser}
                  readOnly={!isEditing}
                />
              </div>
              {isGoogleUser && <p className="br-hint">Your email is managed securely by Google and cannot be changed here.</p>}
            </div>
          </div>

          {/* Account Security Section */}
          <div className="br-section">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                ACCOUNT SECURITY
              </h2>
            </div>

            <div className="br-field" style={{ flexDirection: 'column', gap: '16px' }}>
              {!currentUser?.emailVerified && !currentUser?.providerData.some(p => p.providerId === 'google.com') && (
                <div style={{
                  background: 'rgba(164, 38, 44, 0.05)',
                  padding: '20px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid rgba(164, 38, 44, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--pm-primary)', fontWeight: '600', lineHeight: '1.5' }}>
                    Verify Your Email
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', opacity: 0.8, lineHeight: '1.4' }}>
                    Your email is not verified. If you forget your password, you will not be able to reset it and your account will be permanently lost.
                  </p>
                  <button
                    onClick={handleSendVerification}
                    className="br-btn-secondary"
                    style={{
                      height: '40px',
                      padding: '0 20px',
                      fontSize: '13px',
                      alignSelf: 'flex-start',
                      marginTop: '4px'
                    }}
                    disabled={sendingVerification || linkingGoogle || saving}
                  >
                    {sendingVerification ? "Sending..." : "Send Verification Email"}
                  </button>
                </div>
              )}

              {!isGoogleUser ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--surface)',
                  padding: '20px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Connect Google Account</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text)', opacity: 0.6, lineHeight: '1.4' }}>Sign in effortlessly with a single click.</p>
                  </div>
                  <button
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle || sendingVerification || saving}
                    className="br-btn-primary"
                    style={{
                      padding: '0 24px',
                      height: '44px',
                      background: 'var(--pm-primary)',
                      width: 'auto',
                      fontSize: '14px',
                      gap: '10px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path fill="#fff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#fff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#fff" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" />
                      <path fill="#fff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    {linkingGoogle ? "Connecting..." : "Connect"}
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(22, 163, 74, 0.05)',
                  padding: '20px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid rgba(22, 163, 74, 0.2)'
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#166534' }}>Google Account Linked</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#15803d', opacity: 0.8 }}>You can sign in safely using Google.</p>
                  </div>
                  <ShieldCheck size={28} color="#16a34a" />
                </div>
              )}
            </div>
          </div>

          {/* ── Change Password — hidden for Google-only accounts ── */}
          {!isGoogleUser && (
            <div className="br-section">
              <div className="br-section-header">
                <h2 className="br-section-title">
                  <span className="br-indicator"></span>
                  CHANGE PASSWORD
                </h2>
              </div>

              {/* Current Password */}
              <div className="br-field">
                <label className="br-label">Current Password</label>
                <div className="br-input-group">
                  <Lock size={18} className="br-icon" />
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    className="br-input"
                    value={currentPw}
                    onChange={(e) => { setCurrentPw(e.target.value); setPwError(""); }}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button type="button" className="br-pw-eye"
                    onClick={() => setShowCurrentPw(v => !v)}
                    aria-label={showCurrentPw ? "Hide" : "Show"}>
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password + strength bar */}
              <div className="br-field">
                <label className="br-label">New Password</label>
                <div className="br-input-group">
                  <Lock size={18} className="br-icon" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    className="br-input"
                    value={newPw}
                    onChange={(e) => { setNewPw(e.target.value); setPwError(""); }}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="br-pw-eye"
                    onClick={() => setShowNewPw(v => !v)}
                    aria-label={showNewPw ? "Hide" : "Show"}>
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {newPw.length > 0 && (
                  <div className="br-pw-strength">
                    <div className="br-pw-strength-bars">
                      {[1,2,3,4,5].map(i => (
                        <div key={i}
                          className={`br-pw-bar br-pw-bar--${pwStrengthMeta.level}${i <= pwStrengthScore ? ' br-pw-bar--filled' : ''}`}
                        />
                      ))}
                    </div>
                    {pwStrengthMeta.label && (
                      <span className={`br-pw-strength-label br-pw-strength-label--${pwStrengthMeta.level}`}>
                        {pwStrengthMeta.label}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="br-field">
                <label className="br-label">Confirm New Password</label>
                <div className={`br-input-group${confirmPw && newPw !== confirmPw ? ' br-input-group--error' : ''}`}>
                  <Lock size={18} className="br-icon" />
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    className="br-input"
                    value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); setPwError(""); }}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="br-pw-eye"
                    onClick={() => setShowConfirmPw(v => !v)}
                    aria-label={showConfirmPw ? "Hide" : "Show"}>
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPw && newPw !== confirmPw && (
                  <p className="br-field-error">Passwords do not match.</p>
                )}
              </div>

              {pwError && <div className="br-pw-error-banner">{pwError}</div>}

              <button
                id="change-password-btn"
                className="br-btn-change-pw"
                onClick={handleChangePassword}
                disabled={changingPw || !currentPw || !newPw || !confirmPw}
              >
                <KeyRound size={16} />
                {changingPw ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}
        </div>
      </main>

      {isEditing && (
        <footer className="br-footer">
          <button className="br-btn-secondary" onClick={handleCancelEdit}>
            Cancel
          </button>
          <button
            className="br-btn-primary"
            onClick={handleSave}
            disabled={saving || sendingVerification || linkingGoogle || (displayName === currentUser?.displayName && photoURL === currentUser?.photoURL && email === currentUser?.email)}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </footer>
      )}
    </div>
  );
}
