import { useEffect, useMemo, useState } from "react";
import { adminMockService } from "../../services/adminMockService";
import "./adminPages.css";

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setRows(adminMockService.getUsers());
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((u) =>
      (u.email || "").toLowerCase().includes(s) ||
      (u.name || "").toLowerCase().includes(s) ||
      (u.id || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const onToggleBan = (userId) => {
    const updated = adminMockService.toggleBan(userId);
    setRows(updated);
  };

  const onPasswordReset = (email) => {
    alert(`Password reset link sent to: ${email}`);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>User Management</h2>
        <p className="muted">Manage accounts while preserving physical location privacy.</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search by email, name, id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Registration Date</th>
              <th>Paired Status</th>
              <th>Status</th>
              <th style={{ textAlign: "right", minWidth: "180px" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="u-cell">
                    <div className="u-main">{u.name}</div>
                    <div className="u-sub">{u.email}</div>
                  </div>
                </td>

                <td>
                  <span className="u-role-text">{u.regDate || "N/A"}</span>
                </td>

                <td>
                  <span className={`u-status-text ${u.paired ? "active" : "neutral"}`}>
                    {u.paired ? "Yes" : "No"}
                  </span>
                </td>

                <td>
                  <span className={`u-status-text ${u.banned ? "banned" : "active"}`}>
                    {u.banned ? "Suspended" : "Active"}
                  </span>
                </td>

                <td style={{ textAlign: "right" }}>
                  <button
                    className="admin-btn admin-btn-ghost"
                    style={{ marginRight: "0.5rem", fontSize: "0.80rem", padding: "0.25rem 0.5rem" }}
                    onClick={() => onPasswordReset(u.email)}
                    type="button"
                  >
                    Reset PWD
                  </button>
                  <button
                    className={`admin-action ${u.banned ? "ok" : "danger"}`}
                    onClick={() => onToggleBan(u.id)}
                    type="button"
                  >
                    {u.banned ? "Unsuspend" : "Suspend"}
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
