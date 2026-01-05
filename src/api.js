const API_BASE = "http://localhost:3001";

export async function apiFetch(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  // ONLY set Content-Type if there is a body
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let error = "API error";
    try {
      const data = await response.json();
      error = data.error || error;
    } catch (_) {}
    throw new Error(error);
  }

  return response.json();
}

export function getEvents(headers) {
  return apiFetch("/events", { headers });
}

export function createEvent(data, headers) {
  return apiFetch("/events", {
    method: "POST",
    headers,
    body: JSON.stringify(data)
  });
}

export function updateEvent(id, data, headers) {
  return apiFetch(`/events/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data)
  });
}

export function getUsers(headers) {
  return apiFetch("/users", { headers });
}

export function getEventBudget(eventId, headers) {
  return apiFetch(`/events/${eventId}/budget`, { headers });
}

export function addBudgetItem(eventId, data, headers) {
  return apiFetch(`/events/${eventId}/budget`, {
    method: "POST",
    headers,
    body: JSON.stringify(data)
  });
}

export function deleteBudgetItem(id, headers) {
  return apiFetch(`/budget/${id}`, {
    method: "DELETE",
    headers
  });
}

export function getEventBudgetTotals(eventId, headers) {
  return apiFetch(`/events/${eventId}/budget/totals`, { headers });
}

export function getBudgetCategories(headers) {
  return apiFetch("/budget-categories", { headers });
}