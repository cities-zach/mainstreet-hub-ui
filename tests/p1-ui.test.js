import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Document Library uses classified API storage and secure signed downloads", async () => {
  const page = await source("src/pages/DocumentLibrary.jsx");
  assert.match(page, /apiFetch\("\/documents"/);
  assert.match(page, /files\/\$\{fileId\}\/url/);
  assert.doesNotMatch(page, /supabase\.storage|service_role|getPublicUrl/);
  assert.ok(page.indexOf('body.append("title"') < page.indexOf('body.append("file"'), "multipart metadata must precede the file part");
});

test("Action Center reads a unified queue and completes work through existing domains", async () => {
  const page = await source("src/pages/ActionCenter.jsx");
  assert.match(page, /apiFetch\("\/action-center"\)/);
  assert.match(page, /tasks\/\$\{item\.entity_id\}\/status/);
  assert.match(page, /notifications\/\$\{item\.context\.notification_id\}\/read/);
  assert.doesNotMatch(page, /\/action-center\/complete|\/action-items/);
});

test("P1 pages are authenticated routes in the shared app shell", async () => {
  const app = await source("src/App.jsx");
  const shell = await source("src/components/layout/AppShell.jsx");
  assert.match(app, /path="\/documents"/);
  assert.match(app, /path="\/action-center"/);
  assert.match(shell, /Document Library/);
  assert.match(shell, /Action Center/);
});
