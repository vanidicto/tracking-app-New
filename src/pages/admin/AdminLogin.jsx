import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./adminPages.css";

const KEY = "pm_admin_authed";
const ADMIN_USER = "admin";
const ADMIN_PASS = "pingme123";

export default function AdminLogin() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    setErr("");

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.setItem(KEY, "1");
      navigate("/admin", { replace: true });
      return;
    }
    setErr("Invalid credentials.");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f3f4f6"
    }}>
      <div className="admin-panel" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={logo} alt="PingMe Admin" style={{ height: 48, margin: "0 auto 12px", display: "block" }} />
          <h2 style={{ fontSize: 20, margin: 0 }}>Admin Portal</h2>
          <p className="muted" style={{ marginTop: 4 }}>Secure Access Only</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Username</label>
            <input
              className="admin-search"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Password</label>
            <input
              className="admin-search"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {err && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{err}</div>}

          <button className="admin-action primary" type="submit" style={{
            background: "var(--pm-primary)",
            color: "#fff",
            border: "none",
            padding: "12px",
            fontSize: 14,
            marginTop: 8
          }}>
            Sign In
          </button>

          {/* Hidden/Subtle Demo Credentials for Dev Convenience */}
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#9ca3af" }}>
            Dev: admin / pingme123
          </div>
        </form>
      </div>
    </div>
  );
}
