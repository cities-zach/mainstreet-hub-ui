export const MARKETSTREET_TIME_ZONE = "America/Chicago";

function timeZoneOffset(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - timestamp.getTime();
}

export function marketStreetDateTimeToIso(value) {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    const timestamp = new Date(text);
    return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(wallClock - timeZoneOffset(new Date(wallClock), MARKETSTREET_TIME_ZONE));
  instant = new Date(wallClock - timeZoneOffset(instant, MARKETSTREET_TIME_ZONE));
  return instant.toISOString();
}

export function marketStreetIsoToDateTime(value) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKETSTREET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function publicationPayload(publication) {
  return {
    id: publication.id || undefined,
    channel_id: publication.channel_id,
    planned_at: marketStreetDateTimeToIso(publication.planned_at),
    status: publication.status,
  };
}
