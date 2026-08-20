export const CHUNK_RELOAD_STORAGE_KEY = "mainsuite:chunk-reload-at";
export const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

const DYNAMIC_IMPORT_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .* failed|chunkloaderror/i;

export function isDynamicImportFailure(error) {
  const message = error?.message || String(error || "");
  return error?.name === "ChunkLoadError" || DYNAMIC_IMPORT_ERROR_PATTERN.test(message);
}

export function claimDynamicImportReload(
  error,
  {
    storage,
    now = Date.now(),
    cooldownMs = CHUNK_RELOAD_COOLDOWN_MS,
  } = {}
) {
  if (!isDynamicImportFailure(error)) return false;

  try {
    const targetStorage =
      storage ?? (typeof window !== "undefined" ? window.sessionStorage : null);
    if (!targetStorage) return false;

    const lastReloadAt = Number(targetStorage.getItem(CHUNK_RELOAD_STORAGE_KEY));
    if (
      Number.isFinite(lastReloadAt) &&
      lastReloadAt > 0 &&
      now - lastReloadAt < cooldownMs
    ) {
      return false;
    }

    targetStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
    return true;
  } catch {
    // If session storage is blocked, keep the normal error screen instead of
    // risking an unbounded reload loop.
    return false;
  }
}
