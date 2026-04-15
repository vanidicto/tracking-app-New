import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChevronLeft, Users, Eye } from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import "../../styles/MenuLayout.css";
import "../account/AccountMenu.css";
import "./MyBraceletObservers.css";

// ── InitialAvatar ────────────────────────────────────────────────────────────
// Renders a colored circle with the observer's initials when no photo exists.

const AVATAR_PALETTE = [
  ["#f87171", "#7f1d1d"], // red
  ["#fb923c", "#7c2d12"], // orange
  ["#fbbf24", "#78350f"], // amber
  ["#34d399", "#064e3b"], // emerald
  ["#38bdf8", "#0c4a6e"], // sky
  ["#818cf8", "#312e81"], // indigo
  ["#c084fc", "#581c87"], // purple
  ["#f472b6", "#831843"], // pink
  ["#a4262c", "#fff0f0"], // PingMe red (brand)
];

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function pickColor(uid = "") {
  // Deterministic: sum char codes → stable color per user
  const seed = uid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[seed % AVATAR_PALETTE.length];
}

function InitialAvatar({ name, uid, size = 52 }) {
  const initials = getInitials(name);
  const [bg, text] = pickColor(uid);
  return (
    <div
      className="obs-initial-avatar"
      style={{
        width: size,
        height: size,
        background: bg,
        color: text,
        fontSize: size * 0.36,
      }}
      aria-label={`${name} avatar`}
    >
      {initials}
    </div>
  );
}

// ── ObserverAvatar ────────────────────────────────────────────────────────────
// Shows the real photo; falls back to InitialAvatar on error or missing URL.

function ObserverAvatar({ observer }) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = observer.avatar && !imgError;

  if (hasPhoto) {
    return (
      <img
        className="obs-photo-avatar"
        src={observer.avatar}
        alt={observer.name}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  return <InitialAvatar name={observer.name} uid={observer.id} />;
}

// ── ObserverRow ───────────────────────────────────────────────────────────────

function ObserverRow({ observer, isLast }) {
  return (
    <div className={`obs-row ${isLast ? "" : "obs-row--bordered"}`}>
      <div className="obs-avatar-wrap">
        <ObserverAvatar observer={observer} />
      </div>
      <div className="obs-info">
        <span className="obs-name">{observer.name}</span>
        <span className="obs-sub">Authorized Observer</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MyBraceletObservers() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [observers, setObservers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    let unsubObservers = null;

    // Step 1: get this user's bracelet ID (one-shot, rarely changes)
    const bq = query(
      collection(db, "braceletUsers"),
      where("ownerAppUserId", "==", currentUser.uid)
    );

    getDocs(bq)
      .then((braceletSnap) => {
        if (braceletSnap.empty) {
          setIsLoading(false);
          return;
        }

        const braceletId = braceletSnap.docs[0].id;

        // Step 2: REAL-TIME listener on appUsers that have linked this bracelet.
        // Whenever an observer updates their profile picture, Firestore
        // pushes the change here immediately.
        const observersQuery = query(
          collection(db, "appUsers"),
          where("linkedBraceletsID", "array-contains", braceletId)
        );

        unsubObservers = onSnapshot(
          observersQuery,
          (snap) => {
            const list = [];
            snap.forEach((doc) => {
              if (doc.id === currentUser.uid) return; // exclude owner
              const data = doc.data();
              list.push({
                id: doc.id,
                name: data.name || "Unknown User",
                avatar: data.avatar || data.photoURL || "",
              });
            });
            // Sort alphabetically by name for a stable list
            list.sort((a, b) => a.name.localeCompare(b.name));
            setObservers(list);
            setIsLoading(false);
          },
          (err) => {
            console.error("Observers real-time listener error:", err);
            setIsLoading(false);
          }
        );
      })
      .catch((err) => {
        console.error("Error fetching bracelet for observers:", err);
        setIsLoading(false);
      });

    return () => {
      if (unsubObservers) unsubObservers();
    };
  }, [currentUser]);

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button
          className="br-nav-back"
          onClick={() => navigate("/app/my-bracelet")}
          id="observers-back-btn"
        >
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Authorized Observers</h1>
        <div className="br-nav-spacer" />
      </header>

      <main className="br-main obs-main">

        {/* ── Section header ── */}
        <div className="obs-section-header">
          <span className="obs-section-label">People tracking your bracelet</span>
          {!isLoading && observers.length > 0 && (
            <span className="obs-count-badge">
              {observers.length} {observers.length === 1 ? "observer" : "observers"}
            </span>
          )}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="obs-loading">
            <div className="obs-spinner" />
            <span>Loading observers…</span>
          </div>
        ) : observers.length === 0 ? (
          <div className="obs-empty">
            <div className="obs-empty-icon">
              <Users size={32} color="#a4262c" strokeWidth={1.5} />
            </div>
            <p className="obs-empty-title">No observers yet</p>
            <p className="obs-empty-sub">
              Users who link to your bracelet will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="obs-list-card">
            {observers.map((obs, i) => (
              <ObserverRow
                key={obs.id}
                observer={obs}
                isLast={i === observers.length - 1}
              />
            ))}
          </div>
        )}

        {/* ── Real-time note ── */}
        {!isLoading && (
          <p className="obs-realtime-note">
            <Eye size={11} strokeWidth={2} />
            {/* Updates in real time when observers change their profile */}
          </p>
        )}
      </main>
    </div>
  );
}
