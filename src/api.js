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

export function getUserRoster() {
  return apiFetch("/users/roster");
}

export function deleteUser(userId) {
  return apiFetch(`/users/${userId}`, { method: "DELETE" });
}

export function sendUserAnnouncement(payload) {
  return apiFetch("/users/announce", {
    method: "POST",
    body: JSON.stringify(payload)
  });
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

export function getPublicSystemSettings() {
  return apiFetch("/system/settings/public");
}

export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all", { method: "POST" });
}

// ----------------------
// Chat
// ----------------------
export function getChatChannels() {
  return apiFetch("/chat/channels");
}

export function markChatChannelRead(channelId) {
  return apiFetch(`/chat/channels/${channelId}/read`, { method: "POST" });
}

export function deleteChatChannel(channelId) {
  return apiFetch(`/chat/channels/${channelId}`, { method: "DELETE" });
}

export function createChatChannel(data) {
  return apiFetch("/chat/channels", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getChatChannelMembers(channelId) {
  return apiFetch(`/chat/channels/${channelId}/members`);
}

export function addChatChannelMembers(channelId, memberIds) {
  return apiFetch(`/chat/channels/${channelId}/members`, {
    method: "POST",
    body: JSON.stringify({ member_ids: memberIds })
  });
}

export function removeChatChannelMember(channelId, userId) {
  return apiFetch(`/chat/channels/${channelId}/members/${userId}`, {
    method: "DELETE"
  });
}

export function getChatMessages(channelId, params = {}) {
  const qs = new URLSearchParams();
  if (params.before) qs.set("before", params.before);
  if (params.limit) qs.set("limit", params.limit);
  const suffix = qs.toString();
  return apiFetch(`/chat/channels/${channelId}/messages${suffix ? `?${suffix}` : ""}`);
}

export function createChatMessage(channelId, data) {
  return apiFetch(`/chat/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function toggleChatReaction(messageId, emoji) {
  return apiFetch(`/chat/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji })
  });
}

// ----------------------
// Passport (admin)
// ----------------------

export function getPassports() {
  return apiFetch("/passports");
}

// ----------------------
// PhotoBooth
// ----------------------

export function getPhotoBoothEvents() {
  return apiFetch("/photobooth/events");
}

export function createPhotoBoothEvent(data) {
  return apiFetch("/photobooth/events", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updatePhotoBoothEvent(id, data) {
  return apiFetch(`/photobooth/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function getPhotoBoothPhotos(eventId) {
  return apiFetch(`/photobooth/events/${eventId}/photos`);
}

export function createPhotoBoothSession(eventId, data) {
  return apiFetch(`/photobooth/events/${eventId}/session`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function uploadPhotoBoothPhoto(eventId, formData) {
  return apiFetch(`/photobooth/events/${eventId}/photos`, {
    method: "POST",
    body: formData
  });
}

export function approvePhotoBoothPhoto(photoId) {
  return apiFetch(`/photobooth/photos/${photoId}/approve`, {
    method: "POST"
  });
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

export function deletePassport(id) {
  return apiFetch(`/passports/${id}`, { method: "DELETE" });
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

export function getPassportStopSuggestions(query) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  return apiFetch(`/passports/stops/suggestions?${params.toString()}`);
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

export function getPassportReport(passportId) {
  return apiFetch(`/passports/${passportId}/report`);
}

export function createPassportCheckout(passportId, data) {
  return apiFetch(`/passports/${passportId}/payments/checkout`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function geocodeAddress(address) {
  return apiFetch("/map/geocode", {
    method: "POST",
    body: JSON.stringify({ address })
  });
}

export function submitPassport(token, data) {
  return apiFetch(`/p/instance/${token}/submit`, {
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

export function logPassportMulligan(token, data) {
  return apiFetch(`/p/instance/${token}/mulligan`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function savePassportTeam(token, data) {
  return apiFetch(`/p/instance/${token}/team`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function submitPassportScores(token, data) {
  return apiFetch(`/p/instance/${token}/scores`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function getPassportLeaderboard(token) {
  return apiFetch(`/p/instance/${token}/leaderboard`);
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
