import "./adminPages.css";

export default function AdminDevices() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Device Management</h2>
        <p className="muted">Next: register bracelet IDs, assign to users, show status.</p>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-title">Planned features</div>
        <ul className="muted">
          <li>Add new bracelet ID</li>
          <li>Assign/unassign bracelet to a user</li>
          <li>View lastSeen, battery, braceletOn</li>
        </ul>
      </div>
    </div>
  );
}
