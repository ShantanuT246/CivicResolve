const BASE_URL =
  import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

export const api = {
  // Auth
  login: (email: string, password: string, role?: "citizen" | "department", name?: string) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, name }),
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({ error: "Login failed" }));
        throw new Error(body.error || "Login failed");
      }
      return r.json();
    }),

  register: (body: { email: string; password: string; name?: string; role: "citizen" | "department" }) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(err.error || "Registration failed");
      }
      return r.json();
    }),

  getAccounts: () =>
    fetch(`${BASE_URL}/auth/accounts`).then((r) => r.json()),

  // Issues
  getIssues: () =>
    fetch(`${BASE_URL}/issues`).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  resetReports: () =>
    fetch(`${BASE_URL}/issues/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Create a new civic issue
  submitIssue: (body: object) =>
    fetch(`${BASE_URL}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Get a single issue by ID
  getIssue: (id: string) =>
    fetch(`${BASE_URL}/issues/${id}`).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Get issues around a location
  getNearbyIssues: (
    lat: number,
    lng: number,
    radius = 500
  ) =>
    fetch(
      `${BASE_URL}/issues/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
    ).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Submit citizen verification
  verifyIssue: (
    id: string,
    body: object
  ) =>
    fetch(`${BASE_URL}/issues/${id}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Submit department repair claim
  claimRepair: (
    id: string,
    body: object
  ) =>
    fetch(`${BASE_URL}/issues/${id}/claim-repair`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Get complete issue history
  getHistory: (id: string) =>
    fetch(`${BASE_URL}/issues/${id}/history`).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Get durability analytics
  getDurability: () =>
    fetch(`${BASE_URL}/analytics/durability`).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),

  // Demo-only simulation & expiry trigger
  demoExpire: (id: string, outcome?: string) =>
    fetch(`${BASE_URL}/issues/${id}/demo-trigger-expire`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ outcome }),
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),
};