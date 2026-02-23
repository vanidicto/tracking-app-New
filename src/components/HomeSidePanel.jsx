import { Link } from "react-router-dom";
import "./HomeSidePanel.css";

function formatLastSeen(date) {
  if (!date) return "—";
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function StatusChip({ sos, online }) {
  if (sos) return <span className="hsp-chip hsp-chip--danger">SOS</span>;
  if (online) return <span className="hsp-chip hsp-chip--success">Online</span>;
  return <span className="hsp-chip hsp-chip--muted">Offline</span>;
}

export default function HomeSidePanel({
  users = [],
  query,
  setQuery,
  filter,
  setFilter,
  selectedId,
  onSelectUser,
  addressCache = {},
}) {
  return (
    <aside className="hsp">
      <div className="hsp-header">
        <div className="hsp-title">Monitoring</div>
        <div className="hsp-sub">Track linked bracelet users</div>
      </div>

      <div className="hsp-search">
        <input
          className="hsp-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name…"
        />
      </div>

      <div className="hsp-filters">
        <button
          className={`hsp-filter ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={`hsp-filter ${filter === "online" ? "active" : ""}`}
          onClick={() => setFilter("online")}
          type="button"
        >
          Online
        </button>
        <button
          className={`hsp-filter ${filter === "sos" ? "active" : ""}`}
          onClick={() => setFilter("sos")}
          type="button"
        >
          SOS
        </button>
      </div>

      <div className="hsp-list">
        {users.length === 0 ? (
          <div className="hsp-empty">
            <div className="hsp-empty-title">No users found</div>
            <div className="hsp-empty-sub">
              Try another search or change the filter.
            </div>
          </div>
        ) : (
          users.map((u) => {
            const isSelected = selectedId === u.id;
            const locationText =
              addressCache[u.id] ||
              (u.position ? "Fetching location…" : "No GPS data");

            return (
              <div
                key={u.id}
                className={`hsp-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectUser(u)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectUser(u);
                }}
              >
                <img className="hsp-avatar" src={u.avatar} alt={u.name} />

                <div className="hsp-info">
                  <div className="hsp-row">
                    <div className="hsp-name">{u.name}</div>
                    <StatusChip sos={u.sos} online={u.online} />
                  </div>

                  <div className="hsp-meta">
                    <span>Battery: {u.battery ?? "—"}%</span>
                    <span className="dot-sep">•</span>
                    <span>Last seen: {formatLastSeen(u.lastSeen)}</span>
                  </div>

                  <div className="hsp-loc" title={locationText}>
                    {locationText}
                  </div>

                  <div className="hsp-actions">
                    <Link
                      className="hsp-link"
                      to={`/app/userProfile/${u.id}`}
                      state={{ personData: u }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View profile →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
