import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { currentUser } = useAuth();

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>Account</h2>
      <p style={{ color: "var(--color-text-secondary)" }}>
        Your account details.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid var(--color-bg-secondary)",
          borderRadius: 14,
          background: "var(--color-bg-main)",
        }}
      >
        <div><b>Email:</b> {currentUser?.email || "—"}</div>
        <div><b>Name:</b> {currentUser?.displayName || "—"}</div>
        <div><b>UID:</b> {currentUser?.uid || "—"}</div>
      </div>
    </div>
  );
}
