import { useEffect, useMemo, useState } from "react";
import { adminMockService } from "../../services/adminMockService";
import { Wifi, WifiOff, Battery, BatteryWarning } from "lucide-react";
import "./adminPages.css";

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setDevices(adminMockService.getDevices());
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return devices;
    return devices.filter((d) =>
      (d.id || "").toLowerCase().includes(s) ||
      (d.assignedTo || "").toLowerCase().includes(s)
    );
  }, [devices, q]);

  const getBatteryColor = (level) => {
    if (level > 50) return "#4caf50";
    if (level > 20) return "#ff9800";
    return "#f44336";
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>IoT Device Registry</h2>
        <p className="muted">Manage hardware telemetry, firmware versions, and assignment status.</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search by Device ID or User ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Status</th>
              <th>Battery Telemetry</th>
              <th>Firmware</th>
              <th>Assignment</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <div className="u-main" style={{ fontFamily: "monospace" }}>{d.id}</div>
                </td>

                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {d.status === "online" ? (
                      <Wifi size={16} color="#4caf50" />
                    ) : (
                      <WifiOff size={16} color="#f44336" />
                    )}
                    <span style={{ textTransform: "capitalize", fontSize: "0.85rem", fontWeight: 500 }}>
                      {d.status}
                    </span>
                  </div>
                </td>

                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Battery size={16} color={getBatteryColor(d.battery)} />
                    <span style={{ fontWeight: 600 }}>{d.battery}%</span>
                  </div>
                </td>

                <td>
                  <span className="u-role-text" style={{ background: "#eef2f6", color: "#333" }}>{d.firmware}</span>
                </td>

                <td>
                  {d.assignedTo ? (
                    <span className="u-status-text active">Assigned ({d.assignedTo})</span>
                  ) : (
                    <span className="u-status-text neutral">Unassigned</span>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">No devices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
