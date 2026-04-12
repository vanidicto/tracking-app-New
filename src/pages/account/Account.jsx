import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  updateProfile,
  updateEmail,
} from "firebase/auth";
import { doc, collection, query, where, getDocs, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { useToast } from "../../context/ToastContext";
import avatar from "../../assets/red.webp";
import { Camera, ChevronLeft, User, Mail, Phone } from "lucide-react";
import "./Account.css";

export default function Account() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const fetchPhone = async () => {
        try {
          const docRef = doc(db, "appUsers", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().phone) {
            setPhoneNumber(docSnap.data().phone);
            setInitialPhone(docSnap.data().phone);
          }
        } catch (error) {
          console.error("Error fetching phone:", error);
        }
      };
      fetchPhone();
    }
  }, [currentUser]);

  const isGoogleUser = currentUser?.providerData.some(
    (p) => p.providerId === "google.com"
  );
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

    if (phoneNumber && phoneNumber.length !== 11) {
      setPhoneError("Please enter a valid 11-digit phone number.");
      return;
    }
    setPhoneError("");

    setSaving(true);
    try {
      let finalPhotoURL = currentUser.photoURL;

      if (photoFile) {
        // Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("upload_preset", "pingme_avatars");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/djaved28z/image/upload",
          { method: "POST", body: formData }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Cloudinary Error:", errorData);
          throw new Error(
            errorData.error?.message || "Failed to upload image to Cloudinary"
          );
        }

        const data = await response.json();
        finalPhotoURL = data.secure_url;
      }

      if (email !== currentUser.email) {
        await updateEmail(currentUser, email);
      }

      await updateProfile(currentUser, {
        displayName: displayName,
        photoURL: finalPhotoURL,
      });

      // Sync to Firestore
      try {
        const batch = writeBatch(db);
        const appUserRef = doc(db, "appUsers", currentUser.uid);
        batch.update(appUserRef, {
          name: displayName,
          email: email,
          avatar: finalPhotoURL,
          phone: phoneNumber,
        });

        const q = query(
          collection(db, "braceletUsers"),
          where("ownerAppUserId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          batch.update(docSnap.ref, { avatar: finalPhotoURL });
        });

        await batch.commit();
        setInitialPhone(phoneNumber);
      } catch (dbError) {
        console.error("Error cascading profile updates to Firestore:", dbError);
      }

      addToast("Profile updated successfully!", "success");
      setIsEditing(false);
      setPhotoFile(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.code === "auth/requires-recent-login") {
        addToast(
          "For security, please log out and log back in to change your email address.",
          "error"
        );
      } else if (error.code === "auth/email-already-in-use") {
        addToast(
          "That email address is already in use by another account.",
          "error"
        );
      } else {
        addToast("Failed to update profile.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/app/account");
  };

  const handleEditToggle = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDisplayName(currentUser?.displayName || "");
    setEmail(currentUser?.email || "");
    setPhotoURL(currentUser?.photoURL || "");
    setPhoneNumber(initialPhone);
    setPhotoFile(null);
    setIsEditing(false);
  };

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={handleBack}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Account Information</h1>
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
            className={`br-avatar-wrapper${
              isEditing ? "" : " br-avatar-wrapper--readonly"
            }`}
            onClick={isEditing ? handlePhotoClick : undefined}
          >
            <div className="br-avatar-circle">
              <img
                src={photoURL || avatar}
                alt="Avatar"
                className="br-avatar-img"
              />
              {isEditing && (
                <div className="br-avatar-edit">
                  <Camera size={12} color="#A4262C" />
                </div>
              )}
            </div>
            {isEditing && (
              <p className="br-avatar-label">Upload Profile Photo</p>
            )}
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
              {isGoogleUser && (
                <p className="br-hint">
                  Your email is managed securely by Google and cannot be changed
                  here.
                </p>
              )}
            </div>

            <div className="br-field">
              <label className="br-label">Phone Number</label>
              <div className="br-input-group">
                <Phone size={18} className="br-icon" />
                <input
                  type="tel"
                  inputMode="numeric"
                  className="br-input"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value.replace(/\D/g, ""));
                    setPhoneError("");
                  }}
                  placeholder="+63 9XX XXX XXXX"
                  readOnly={!isEditing}
                />
              </div>
              {phoneError && (
                <p style={{ color: "#A4262C", fontSize: "0.85rem", marginTop: "4px", marginBottom: "0" }}>
                  {phoneError}
                </p>
              )}
            </div>
          </div>
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
            disabled={
              saving ||
              (displayName === currentUser?.displayName &&
                photoURL === currentUser?.photoURL &&
                email === currentUser?.email &&
                phoneNumber === initialPhone)
            }
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </footer>
      )}
    </div>
  );
}
