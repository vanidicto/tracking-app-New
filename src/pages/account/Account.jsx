import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, deleteUser } from "firebase/auth";
import { doc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { useToast } from "../../context/ToastContext";
import { Camera, Save, ChevronLeft, User, Mail, ShieldAlert, Plus } from "lucide-react";
import "./Account.css";

export default function Account() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
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

      await updateProfile(currentUser, {
        displayName: displayName,
        photoURL: finalPhotoURL
      });

      // Synchronize the new avatar/name directly to Firestore collections
      try {
        const batch = writeBatch(db);

        // 1. Update the appUser document
        const appUserRef = doc(db, 'appUsers', currentUser.uid);
        batch.update(appUserRef, {
          name: displayName,
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
      addToast("Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    try {
      if (currentUser) {
        await deleteUser(currentUser);
        addToast("Account deleted.", "success");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      addToast("Failed to delete. You may need to log in again first.", "error");
    }
  };

  const handleBack = () => {
    navigate('/app', { state: { openProfile: true } });
  };

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={handleBack}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Account</h1>
        <div className="br-nav-spacer"></div>
      </header>

      <main className="br-main">
        <div className="br-avatar-section">
          <div className="br-avatar-wrapper" onClick={handlePhotoClick}>
            <div className="br-avatar-circle">
              {photoURL ? (
                <img src={photoURL} alt="Avatar" className="br-avatar-img" />
              ) : (
                <Plus size={48} color="#fff" strokeWidth={2.5} />
              )}
              <div className="br-avatar-edit">
                <Camera size={12} color="#A4262C" />
              </div>
            </div>
            <p className="br-avatar-label">Upload Profile Photo</p>
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
                  value={currentUser?.email || ""}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Danger Zone Section */}
          <div className="br-section account-danger-section">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                DANGER ZONE
              </h2>
            </div>
            <div className="br-danger-card">
              <ShieldAlert size={24} className="br-danger-icon" />
              <div className="br-danger-content">
                <p className="br-danger-text">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="br-btn-delete" onClick={handleDelete}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="br-footer">
        <button className="br-btn-secondary" onClick={handleBack}>
          Cancel
        </button>
        <button
          className="br-btn-primary"
          onClick={handleSave}
          disabled={saving || (displayName === currentUser?.displayName && photoURL === currentUser?.photoURL)}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </footer>
    </div>
  );
}
