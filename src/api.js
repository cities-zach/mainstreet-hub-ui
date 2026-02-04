// Central API fetch wrapper (uses Vite proxy: /api -> http://localhost:3001)

import { supabase } from "@/lib/supabaseClient";

export const API_BASE =
  (import.meta.env?.VITE_API_URL || "").replace(/\/$/, "") || "/api";

export async function buildAuthHeaders(extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData?.session?.user?.id;
  const sessionUserEmail = sessionData?.session?.user?.email;
  if (sessionUserId) {
    headers.set("x-user-id", sessionUserId);
  }
  if (sessionUserEmail) {
    headers.set("x-user-email", sessionUserEmail);
  }
  headers.set("x-org-slug", "ottumwa");
  return headers;
}

export async function apiFetch(path, options = {}) {
  const headers = await buildAuthHeaders(options.headers || {});

  // Only set Content-Type for JSON payloads
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const text = await res.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ----------------------
// Domain helpers
// ----------------------

export function getEvents() {
  return apiFetch("/events");
}

export function createEvent(data) {
  return apiFetch("/events", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateEvent(id, data) {
  return apiFetch(`/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function getUsers() {
  return apiFetch("/users");
}

export function getEventBudget(eventId) {
  return apiFetch(`/events/${eventId}/budget`);
}

export function addBudgetItem(eventId, data) {
  return apiFetch(`/events/${eventId}/budget`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function deleteBudgetItem(id) {
  return apiFetch(`/budget/${id}`, {
    method: "DELETE"
  });
}

export function getNotifications({ unreadOnly = false, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unreadOnly", "1");
  if (limit) params.set("limit", String(limit));
  const suffix = params.toString();
  return apiFetch(`/notifications${suffix ? `?${suffix}` : ""}`);
}

export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all", { method: "POST" });
}

// ----------------------
// Passport (admin)
// ----------------------

export function getPassports() {
  return apiFetch("/passports");
}

export function getPassport(id) {
  return apiFetch(`/passports/${id}`);
}

export function createPassport(data) {
  return apiFetch("/passports", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updatePassport(id, data) {
  return apiFetch(`/passports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function publishPassport(id) {
  return apiFetch(`/passports/${id}/publish`, { method: "POST" });
}

export function lockPassport(id) {
  return apiFetch(`/passports/${id}/lock`, { method: "POST" });
}

export function createPassportStop(id, data) {
  return apiFetch(`/passports/${id}/stops`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updatePassportStop(passportId, stopId, data) {
  return apiFetch(`/passports/${passportId}/stops/${stopId}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function reorderPassportStops(passportId, order) {
  return apiFetch(`/passports/${passportId}/stops/reorder`, {
    method: "POST",
    body: JSON.stringify({ order })
  });
}

export function exportPassportEntries(passportId) {
  return apiFetch(`/passports/${passportId}/entries/export`);
}

export function exportPassportEntriesToWheelspin(passportId, data) {
  return apiFetch(`/passports/${passportId}/entries/export-to-wheelspin`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

// ----------------------
// Passport (public)
// ----------------------

export function getPublicPassport(slug) {
  return apiFetch(`/p/${slug}`);
}

export function createPassportInstance(slug, data) {
  return apiFetch(`/p/${slug}/instance`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function getPassportInstance(token) {
  return apiFetch(`/p/instance/${token}`);
}

export function stampPassportInstance(token, data) {
  return apiFetch(`/p/instance/${token}/stamp`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function updatePassportInstance(token, data) {
  return apiFetch(`/p/instance/${token}`, {
    method: "PATCH",
    body: JSON.stringify(data || {})
  });
}

export function getEventBudgetTotals(eventId) {
  return apiFetch(`/events/${eventId}/budget/totals`);
}

export function getBudgetCategories() {
  return apiFetch("/budget-categories");
}
