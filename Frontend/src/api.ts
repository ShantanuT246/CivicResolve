const BASE_URL =
  import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

export const api = {
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

  // Demo-only expiry trigger
  demoExpire: (id: string) =>
    fetch(`${BASE_URL}/issues/${id}/demo-trigger-expire`, {
      method: "POST",
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(await r.text());
      }
      return r.json();
    }),
};