import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChevronLeft, Users } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import "../../styles/MenuLayout.css";
import "../account/AccountMenu.css";

export default function MyBraceletObservers() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [observers, setObservers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchObservers = async () => {
      if (!currentUser) return;
      try {
        // 1. Fetch current user's bracelet
        const bq = query(
          collection(db, "braceletUsers"),
          where("ownerAppUserId", "==", currentUser.uid)
        );
        const braceletSnap = await getDocs(bq);

        if (braceletSnap.empty) {
          setIsLoading(false);
          return;
        }

        const braceletId = braceletSnap.docs[0].id;

        // 2. Query appUsers where linkedBraceletsID contains this braceletId
        const usersQuery = query(
          collection(db, "appUsers"),
          where("linkedBraceletsID", "array-contains", braceletId)
        );
        
        const usersSnap = await getDocs(usersQuery);
        const fetchedObservers = [];
        usersSnap.forEach((doc) => {
          // Exclude the owner themselves, usually they aren't in linkedBraceletsID but just in case
          if (doc.id !== currentUser.uid) {
             const data = doc.data();
             const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "User")}&background=random`;
             fetchedObservers.push({
               id: doc.id,
               name: data.name || "Unknown User",
               avatar: data.avatar || data.photoURL || defaultAvatar
             });
          }
        });
        
        setObservers(fetchedObservers);
      } catch (err) {
        console.error("Error fetching observers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchObservers();
  }, [currentUser]);

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button
          className="br-nav-back"
          onClick={() => navigate("/app/my-bracelet")}
        >
          <ChevronLeft size={24} color="var(--pm-primary, #a4262c)" />
        </button>
        <h1 className="br-nav-title">Authorized Observers</h1>
        <div className="br-nav-spacer" />
      </header>

      <main className="br-main acm-main">
        <p className="acm-section-label" style={{ marginTop: "24px", marginBottom: "24px" }}>
          PEOPLE TRACKING YOUR BRACELET
        </p>

        {isLoading ? (
          <p style={{ textAlign: "center", color: "var(--pm-text-muted)", marginTop: "20px" }}>Loading observers...</p>
        ) : observers.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "40px", color: "var(--pm-text-muted)" }}>
            <Users size={48} style={{ opacity: 0.5, marginBottom: "16px" }} />
            <p>No authorized observers found.</p>
            <p style={{ fontSize: "14px", marginTop: "8px" }}>Users who link to your bracelet will appear here.</p>
          </div>
        ) : (
          <div style={{
            background: "var(--pm-surface, #fff)",
            borderRadius: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            overflow: "hidden"
          }}>
            {observers.map((obs, index) => (
              <div 
                key={obs.id} 
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "20px 24px",
                  borderBottom: index !== observers.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none"
                }}
              >
                <img 
                  src={obs.avatar} 
                  alt={obs.name} 
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginRight: "16px",
                    border: "2px solid #f0f0f0"
                  }}
                />
                <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--pm-text, #333)" }}>
                  {obs.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
