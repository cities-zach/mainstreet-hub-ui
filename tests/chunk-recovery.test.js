import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  CHUNK_RELOAD_STORAGE_KEY,
  claimDynamicImportReload,
  isDynamicImportFailure,
} from "../src/lib/chunk-recovery.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("dynamic import recovery recognizes deployment chunk failures", () => {
  assert.equal(
    isDynamicImportFailure(
      new TypeError(
        "Failed to fetch dynamically imported module: https://portal.mainsuite.app/assets/PocketBook-old.js"
      )
    ),
    true
  );
  assert.equal(
    isDynamicImportFailure(new Error("Importing a module script failed.")),
    true
  );
  assert.equal(isDynamicImportFailure(new Error("Budget request failed")), false);
});

test("dynamic import recovery allows one refresh per tab within the cooldown", () => {
  const storage = createStorage();
  const error = new TypeError("Failed to fetch dynamically imported module");

  assert.equal(claimDynamicImportReload(error, { storage, now: 1_000 }), true);
  assert.equal(storage.getItem(CHUNK_RELOAD_STORAGE_KEY), "1000");
  assert.equal(claimDynamicImportReload(error, { storage, now: 30_000 }), false);
  assert.equal(claimDynamicImportReload(error, { storage, now: 62_000 }), true);
});

test("unrelated errors keep the normal reporting workflow", () => {
  const storage = createStorage();
  assert.equal(
    claimDynamicImportReload(new Error("Database request failed"), {
      storage,
      now: 1_000,
    }),
    false
  );
  assert.equal(storage.getItem(CHUNK_RELOAD_STORAGE_KEY), null);
});

test("the error boundary attempts chunk recovery before automatic reporting", () => {
  const source = fs.readFileSync(
    new URL("../src/components/system/ErrorBoundary.jsx", import.meta.url),
    "utf8"
  );
  const recoveryIndex = source.indexOf("claimDynamicImportReload(error)");
  const reportIndex = source.indexOf("this.submitReport({ silent: true })");

  assert.ok(recoveryIndex >= 0);
  assert.ok(reportIndex > recoveryIndex);
});
