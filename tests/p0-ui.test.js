import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("API client sends verified bearer credentials, not identity headers", async () => {
  const api = await source("src/api.js");
  assert.match(api, /Authorization.*Bearer/);
  assert.doesNotMatch(api, /x-user-id|x-user-email/);
});

test("browser upload helper uses classified API storage routes", async () => {
  const uploads = await source("src/lib/uploads.js");
  assert.match(uploads, /files\/.*public.*private/);
  assert.match(uploads, /public\/surveys/);
  assert.doesNotMatch(uploads, /supabase\.storage|getPublicUrl|\.storage\.from/);
});

test("requisition UI submits header and item rows atomically", async () => {
  const form = await source("src/components/supplystop/RequisitionForm.jsx");
  assert.match(form, /items:\s*itemsArray\.map/);
  assert.doesNotMatch(form, /requisitions\/\$\{requisition\.id\}\/items/);
});

test("chat no longer puts identity in an EventSource query string", async () => {
  const chat = await source("src/pages/Chat.jsx");
  assert.doesNotMatch(chat, /searchParams\.set\(["']user_(?:id|email)|new EventSource/);
});
