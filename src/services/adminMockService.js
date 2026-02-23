const LS_USERS = "pm_admin_users";
const LS_DEVICES = "pm_admin_devices";

function seedUsers() {
  return [
    { id: "u_001", email: "admin@pingme.com", name: "Admin User", role: "admin", banned: false },
    { id: "u_002", email: "user1@pingme.com", name: "Juan Dela Cruz", role: "user", banned: false },
    { id: "u_003", email: "user2@pingme.com", name: "Maria Santos", role: "user", banned: true },
  ];
}

function seedDevices() {
  return [
    { id: "b_1001", status: "online", battery: 82, sos: false, assignedTo: "u_002" },
    { id: "b_1002", status: "offline", battery: 54, sos: true, assignedTo: "u_003" },
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

  getStats() {
    const users = this.getUsers();
    const devices = this.getDevices();
    return {
      totalUsers: users.length,
      activeAlerts: devices.filter((d) => d.sos).length,
      onlineDevices: devices.filter((d) => d.status === "online").length,
    };
  },
};
