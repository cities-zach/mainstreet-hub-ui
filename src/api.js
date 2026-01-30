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

export function getEventBudgetTotals(eventId) {
  return apiFetch(`/events/${eventId}/budget/totals`);
}

export function getBudgetCategories() {
  return apiFetch("/budget-categories");
}
