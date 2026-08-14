// Central API fetch wrapper (uses Vite proxy: /api -> http://localhost:3001)

import { supabase } from "@/lib/supabaseClient";

export const API_BASE =
  (import.meta.env?.VITE_API_URL || "").replace(/\/$/, "") || "/api";

export class ApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? null;
    this.code = code ?? null;
    this.data = data ?? null;
  }
}

export async function buildAuthHeaders(extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
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
    throw new ApiError(msg, {
      status: res.status,
      code: data?.code,
      data,
    });
  }

  return data;
}

// ----------------------
// Domain helpers
// ----------------------

// Sends a front-end crash report to the backend (best-effort).
export function sendClientErrorReport(payload) {
  return apiFetch("/client-error-reports", {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}

// District maps
export function getDistrictMaps() {
  return apiFetch("/district-maps");
}

export function getDistrictMap(id) {
  return apiFetch(`/district-maps/${id}`);
}

export function getDistrictMapImport(id, importId) {
  return apiFetch(`/district-maps/${id}/imports/${importId}`);
}

export function getPublicDistrictMap(slug) {
  return apiFetch(`/public/maps/${slug}`);
}

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

export function searchChat(query, channelId = null) {
  const params = new URLSearchParams({ query });
  if (channelId) params.set("channel_id", channelId);
  return apiFetch(`/chat/search?${params}`);
}

export function updateChatChannel(channelId, data) {
  return apiFetch(`/chat/channels/${channelId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function updateChatPreferences(channelId, notificationLevel) {
  return apiFetch(`/chat/channels/${channelId}/preferences`, {
    method: "PATCH", body: JSON.stringify({ notification_level: notificationLevel })
  });
}

export function getChatThread(channelId, messageId) {
  return apiFetch(`/chat/channels/${channelId}/thread/${messageId}`);
}

export function updateChatMessage(messageId, body) {
  return apiFetch(`/chat/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ body }) });
}

export function deleteChatMessage(messageId) {
  return apiFetch(`/chat/messages/${messageId}`, { method: "DELETE" });
}

export function getChatPins(channelId) {
  return apiFetch(`/chat/channels/${channelId}/pins`);
}

export function toggleChatPin(messageId) {
  return apiFetch(`/chat/messages/${messageId}/pin`, { method: "POST" });
}

export function getChatBookmarks() {
  return apiFetch("/chat/bookmarks");
}

export function toggleChatBookmark(messageId) {
  return apiFetch(`/chat/messages/${messageId}/bookmark`, { method: "POST" });
}

export function createTaskFromChat(messageId, data = {}) {
  return apiFetch(`/chat/messages/${messageId}/task`, { method: "POST", body: JSON.stringify(data) });
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

// ----------------------
// Contests
// ----------------------

export function getContests() {
  return apiFetch("/contests");
}

export function getContest(id) {
  return apiFetch(`/contests/${id}`);
}

export function createContest(data) {
  return apiFetch("/contests", {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function updateContest(id, data) {
  return apiFetch(`/contests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data || {})
  });
}

export function launchContest(id) {
  return apiFetch(`/contests/${id}/launch`, { method: "POST" });
}

export function closeContest(id) {
  return apiFetch(`/contests/${id}/close`, { method: "POST" });
}

export function deleteContest(id) {
  return apiFetch(`/contests/${id}`, { method: "DELETE" });
}

export function getContestEntries(id) {
  return apiFetch(`/contests/${id}/entries`);
}

export function exportContestToWheelspin(id, data) {
  return apiFetch(`/contests/${id}/export-to-wheelspin`, {
    method: "POST",
    body: JSON.stringify(data || {})
  });
}

export function getPublicContest(slug) {
  return apiFetch(`/contests/public/${slug}`);
}

export function submitContestEntry(slug, data) {
  return apiFetch(`/contests/public/${slug}/entries`, {
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
