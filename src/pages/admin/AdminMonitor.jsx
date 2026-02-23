import "./adminPages.css";

export default function AdminMonitor() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Global Monitoring</h2>
        <p className="muted">Next: God Mode map with all active alerts + device pins.</p>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-title">Planned features</div>
        <ul className="muted">
          <li>Map of all devices</li>
          <li>Highlight SOS devices in red</li>
          <li>Quick actions for responders</li>
        </ul>
      </div>
    </div>
  );
}
