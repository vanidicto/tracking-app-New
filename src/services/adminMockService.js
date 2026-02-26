const LS_USERS = "pm_admin_users";
const LS_DEVICES = "pm_admin_devices";
const LS_TICKETS = "pm_admin_tickets";
const LS_STATS = "pm_admin_stats_meta"; // Mock metadata for stats

function seedUsers() {
  return [
    { id: "u_001", email: "admin@pingme.com", name: "Admin User", role: "admin", banned: false, regDate: "2023-11-01", paired: true },
    { id: "u_002", email: "user1@pingme.com", name: "Juan Dela Cruz", role: "user", banned: false, regDate: "2024-01-15", paired: true },
    { id: "u_003", email: "user2@pingme.com", name: "Maria Santos", role: "user", banned: true, regDate: "2024-02-10", paired: false },
    { id: "u_004", email: "user3@pingme.com", name: "Alex Reyes", role: "user", banned: false, regDate: "2024-02-20", paired: true },
  ];
}

function seedDevices() {
  return [
    { id: "b_1001", status: "online", battery: 82, firmware: "v1.2.4", assignedTo: "u_002" },
    { id: "b_1002", status: "offline", battery: 54, firmware: "v1.2.3", assignedTo: "u_003" },
    { id: "b_1003", status: "online", battery: 95, firmware: "v1.2.4", assignedTo: "u_004" },
    { id: "b_1004", status: "offline", battery: 100, firmware: "v1.2.4", assignedTo: null },
  ];
}

function seedTickets() {
  return [
    {
      id: "t_001",
      userId: "u_002",
      userName: "Juan Dela Cruz",
      subject: "Bracelet won't pair",
      status: "Open",
      messages: [{ sender: "user", text: "Hi, I can't connect my bracelet via Bluetooth.", timestamp: new Date(Date.now() - 3600000).toISOString() }]
    },
    {
      id: "t_002",
      userId: "u_004",
      userName: "Alex Reyes",
      subject: "Battery draining fast",
      status: "Resolved",
      messages: [{ sender: "user", text: "My battery dies in 2 hours.", timestamp: new Date(Date.now() - 86400000).toISOString() }, { sender: "admin", text: "We pushed an update, please check now.", timestamp: new Date(Date.now() - 80000000).toISOString() }]
    }
  ];
}

function load(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const adminMockService = {
  getUsers() {
    return load(LS_USERS, seedUsers());
  },
  setUsers(users) {
    save(LS_USERS, users);
  },
  toggleBan(userId) {
    const users = this.getUsers();
    const updated = users.map((u) => (u.id === userId ? { ...u, banned: !u.banned } : u));
    this.setUsers(updated);
    return updated;
  },

  getDevices() {
    return load(LS_DEVICES, seedDevices());
  },
  setDevices(devices) {
    save(LS_DEVICES, devices);
  },

  getTickets() {
    return load(LS_TICKETS, seedTickets());
  },
  setTickets(tickets) {
    save(LS_TICKETS, tickets);
  },
  addTicketMessage(ticketId, message) {
    const tickets = this.getTickets();
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, messages: [...t.messages, message], status: t.status === "Resolved" ? "Open" : t.status };
      }
      return t;
    });
    this.setTickets(updated);
    return updated;
  },
  updateTicketStatus(ticketId, newStatus) {
    const tickets = this.getTickets();
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t));
    this.setTickets(updated);
    return updated;
  },

  getStats() {
    const users = this.getUsers();
    const devices = this.getDevices();

    // Simulate some packet routing metrics that changes a bit based on time or active users
    let packetMetrics = load(LS_STATS, { count: 145, lastUpdated: Date.now() });
    if (Date.now() - packetMetrics.lastUpdated > 86400000) {
      packetMetrics = { count: packetMetrics.count + Math.floor(Math.random() * 50), lastUpdated: Date.now() };
      save(LS_STATS, packetMetrics);
    }

    return {
      serverUptime: "99.9% (Online)",
      totalUsers: users.length,
      connectedBracelets: devices.filter((d) => d.status === "online").length,
      packetMetrics: packetMetrics.count,
    };
  },
};
