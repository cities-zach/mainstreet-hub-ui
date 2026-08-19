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

test("TaskMaster supports first-class person or team assignment", async () => {
  const [form, taskMaster, taskItem, actionCenter] = await Promise.all([
    fs.readFile(new URL("../src/components/taskmaster/TaskForm.jsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../src/pages/TaskMaster.jsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../src/components/taskmaster/TaskItem.jsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../src/pages/ActionCenter.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(form, /assigned_team_id/);
  assert.match(form, /apiFetch\("\/teams"\)/);
  assert.match(form, /CommandGroup heading="Teams"/);
  assert.match(form, /assigned person or team members/i);
  assert.match(taskMaster, /task\.assigned_team_member/);
  assert.match(taskMaster, /team:\$\{teamOption\.id\}/);
  assert.match(taskItem, /task\?\.assigned_team_name/);
  assert.match(actionCenter, /Assigned to your team/);
});

test("P1 pages are authenticated routes in the shared app shell", async () => {
  const app = await source("src/App.jsx");
  const shell = await source("src/components/layout/AppShell.jsx");
  assert.match(app, /path="\/documents"/);
  assert.match(app, /path="\/action-center"/);
  assert.match(shell, /Document Library/);
  assert.match(shell, /Action Center/);
});

test("Document Library owns FRED indexing status and retry", async () => {
  const page = await source("src/pages/DocumentLibrary.jsx");
  assert.match(page, /Available to FRED/);
  assert.match(page, /FRED indexing failed/);
  assert.match(page, /documents\/\$\{document\.id\}\/reindex/);
  assert.match(page, /automatically made searchable by FRED/);
});

test("RAGTime is removed from routes, navigation, and dashboard", async () => {
  const sources = await Promise.all([
    "src/App.jsx", "src/components/layout/AppShell.jsx", "src/pages/Dashboard.jsx",
  ].map(source));
  for (const content of sources) {
    assert.doesNotMatch(content, /RAGTime|\/ragtime/i);
  }
});

test("Document Library feature upgrade exposes folders, bulk upload, ACLs, and signing", async () => {
  const page = await source("src/pages/DocumentLibrary.jsx");
  const permissions = await source("src/components/documents/PermissionsDialog.jsx");
  const signatures = await source("src/components/documents/SignatureDialogs.jsx");
  assert.match(page, /apiFetch\("\/document-folders"/);
  assert.match(page, /type="file" multiple/);
  assert.match(page, /documents\/bulk\/move/);
  assert.match(page, /PermissionsDialog/);
  assert.match(page, /SignatureInboxDialog/);
  assert.match(permissions, /inherit_folder_permissions/);
  assert.match(permissions, /Allow FRED to use/);
  assert.match(signatures, /signature-requests/);
  assert.match(signatures, /Return signed copy/);
  assert.match(page, /signature_request/);
  assert.match(signatures, /initialRequestId/);
});

test("organization teams are managed centrally and selectable as document principals", async () => {
  const app = await source("src/App.jsx");
  const settings = await source("src/components/settings/UserManagementSection.jsx");
  const teams = await source("src/pages/TeamManagement.jsx");
  const permissions = await source("src/components/documents/PermissionsDialog.jsx");
  assert.match(app, /path="\/settings\/teams"/);
  assert.match(settings, /Manage Teams/);
  assert.match(teams, /apiFetch\("\/teams"\)/);
  assert.match(teams, /apiFetch\(`\/teams\/\$\{editor\.id\}`/);
  assert.match(teams, /color: editor\.color,\s+members,/);
  assert.match(permissions, /principal_type === "team"/);
  assert.match(permissions, /value: `team:\$\{team\.id\}`/);
});

test("folder sorting supports persisted custom order with accessible controls", async () => {
  const page = await source("src/pages/DocumentLibrary.jsx");
  assert.match(page, /sort: folderSortMode/);
  assert.match(page, /document-folders\/\$\{selectedFolder\.id\}\/order/);
  assert.match(page, /Move \$\{document\.title\} up/);
  assert.match(page, /Move \$\{document\.title\} down/);
  assert.match(page, /Custom order/);
});
