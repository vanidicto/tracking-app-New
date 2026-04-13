import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Watch, Settings, Phone, Wallet, ChevronRight, ChevronLeft, Users } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import "../../styles/MenuLayout.css";
// Importing the exact AccountMenu.css to maintain the PingMe exact design language
import "../account/AccountMenu.css";

export default function MyBraceletMenu() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [braceletName, setBraceletName] = useState("Unregistered Bracelet");
  const [serialNumber, setSerialNumber] = useState("Not Configured");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOwnedBracelet = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, "braceletUsers"),
          where("ownerAppUserId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setBraceletName(data.name || "My Bracelet");
          setSerialNumber(data.serialNumber || "No Serial Found");
        }
      } catch (err) {
        console.error("Error fetching owned bracelet:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnedBracelet();
  }, [currentUser]);

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button
          className="br-nav-back"
          onClick={() => navigate("/app", { state: { openProfile: true } })}
        >
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">My Bracelet</h1>
        <div className="br-nav-spacer" />
      </header>

      <main className="br-main acm-main">
        {/* ── Bracelet Hero ── */}
        <div className="acm-identity">
          <div className="acm-avatar-wrap">
            <div
              className="acm-avatar"
              style={{
                background:
                  "linear-gradient(135deg, rgba(164,38,44,0.15), rgba(164,38,44,0.05))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #fff",
              }}
            >
              <Watch size={36} color="#a4262c" strokeWidth={1.5} />
            </div>
          </div>

          <div className="acm-identity-text">
            {isLoading ? (
              <p className="acm-identity-name" style={{ opacity: 0.5 }}>Loading...</p>
            ) : (
              <>
                <p className="acm-identity-name">{braceletName}</p>
                <p className="acm-identity-email">{serialNumber}</p>
              </>
            )}
          </div>
        </div>

        {/* ── Section Label ── */}
        <p className="acm-section-label">Bracelet Settings</p>

        {/* ── Menu List ── */}
        <div className="acm-menu">
          {/* Bracelet Configuration */}
          <button
            className="acm-menu-item"
            onClick={() => navigate("/app/my-bracelet/config")}
            id="bracelet-config-btn"
          >
            <span className="acm-menu-icon-wrap acm-icon-info">
              <Settings size={18} strokeWidth={2} />
            </span>
            <span className="acm-menu-text">
              <span className="acm-menu-label">Bracelet Configuration</span>
              <span className="acm-menu-desc">
                Name and serial number settings
              </span>
            </span>
            <ChevronRight size={18} className="acm-menu-arrow" />
          </button>

          {/* Emergency Contact */}
          <button
            className="acm-menu-item"
            onClick={() => navigate("/app/my-bracelet/emergency")}
            id="bracelet-emergency-btn"
          >
            <span className="acm-menu-icon-wrap acm-icon-security">
              <Phone size={18} strokeWidth={2} />
            </span>
            <span className="acm-menu-text">
              <span className="acm-menu-label">Emergency Contact</span>
              <span className="acm-menu-desc">
                Primary contact name and phone number
              </span>
            </span>
            <ChevronRight size={18} className="acm-menu-arrow" />
          </button>

          {/* Load & Balance */}
          <button
            className="acm-menu-item"
            onClick={() => navigate("/app/my-bracelet/load")}
            id="bracelet-load-btn"
          >
            <span className="acm-menu-icon-wrap" style={{backgroundColor: "rgba(164,38,44,0.1)", color: "#a4262c"}}>
              <Wallet size={18} strokeWidth={2} />
            </span>
            <span className="acm-menu-text">
              <span className="acm-menu-label">Load & Balance</span>
              <span className="acm-menu-desc">
                Current balance and bracelet reload
              </span>
            </span>
            <ChevronRight size={18} className="acm-menu-arrow" />
          </button>

          {/* Authorized Observers */}
          <button
            className="acm-menu-item"
            onClick={() => navigate("/app/my-bracelet/observers")}
            id="bracelet-observers-btn"
          >
            <span className="acm-menu-icon-wrap" style={{backgroundColor: "rgba(164,38,44,0.1)", color: "#a4262c"}}>
              <Users size={18} strokeWidth={2} />
            </span>
            <span className="acm-menu-text">
              <span className="acm-menu-label">Authorized Observers</span>
              <span className="acm-menu-desc">
                People checking your location
              </span>
            </span>
            <ChevronRight size={18} className="acm-menu-arrow" />
          </button>
        </div>
      </main>
    </div>
  );
}
