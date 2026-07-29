
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password } }),
  getInventory: () => request("/inventory"),
  getLedger: () => request("/ledger?limit=100"),
  getBatches: (productId) => request(`/batches/${productId}`),
  pushEvent: (event) => request("/events", { method: "POST", body: event }),
  simulate: () => request("/simulate", { method: "POST" }),
  streamUrl: () => `${BASE}/api/stream`,
};
