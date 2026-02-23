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

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>User Management</h2>
        <p className="muted">Ban/Unban stored in LocalStorage</p>
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
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="u-cell">
                    <div className="u-main">{u.email}</div>
                    <div className="u-sub">{u.name}</div>
                  </div>
                </td>

                <td>
                  <span className={`pill ${u.role === "admin" ? "pill-primary" : "pill-muted"}`}>
                    {u.role}
                  </span>
                </td>

                <td>
                  <span className={`pill ${u.banned ? "pill-danger" : "pill-success"}`}>
                    {u.banned ? "banned" : "active"}
                  </span>
                </td>

                <td style={{ textAlign: "right" }}>
                  <button
                    className={`admin-action ${u.banned ? "ok" : "danger"}`}
                    onClick={() => onToggleBan(u.id)}
                    type="button"
                  >
                    {u.banned ? "Unban" : "Ban"}
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
