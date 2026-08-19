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

test("API errors retain response status and account codes for auth recovery", async () => {
  const api = await source("src/api.js");
  assert.match(api, /class ApiError extends Error/);
  assert.match(api, /status: res\.status/);
  assert.match(api, /code: data\?\.code/);
});

test("public pages bypass member bootstrap and rejected sessions recover locally", async () => {
  const app = await source("src/App.jsx");
  assert.match(app, /isPublicPath\(location\.pathname\)/);
  assert.match(app, /enabled: Boolean\(session\) && !publicPath/);
  assert.match(app, /error\?\.status !== 401/);
  assert.match(app, /signOut\(\{ scope: "local" \}\)/);
  assert.ok(
    app.indexOf("if (publicPath) return <PublicRoutes />") < app.indexOf("if (authLoading"),
    "public routes must render before authenticated session bootstrapping"
  );
});

test("route pages are lazy-loaded behind accessible suspense fallbacks", async () => {
  const app = await source("src/App.jsx");
  const shell = await source("src/components/layout/AppShell.jsx");
  const fallback = await source("src/components/system/PageLoadingFallback.jsx");
  assert.doesNotMatch(app, /^import .* from "@\/pages\//m);
  assert.match(app, /React\.lazy\(\(\) => import\("@\/pages\/Dashboard"\)\)/);
  assert.match(app, /React\.lazy\(\(\) => import\("@\/pages\/DistrictMapPublic"\)\)/);
  assert.match(app, /Suspense fallback=\{<PageLoadingFallback \/>\}/);
  assert.match(shell, /Suspense fallback=\{<PageLoadingFallback compact \/>\}/);
  assert.match(shell, /React\.lazy\(\(\) => import\("@\/components\/ai\/AIChatPanel"\)\)/);
  assert.match(shell, /React\.lazy\(\(\) => import\("@\/components\/notifications\/NotificationsBell"\)\)/);
  assert.match(fallback, /role="status"/);
  assert.match(fallback, /aria-live="polite"/);
});

test("the production build enforces a strict entry-bundle budget", async () => {
  const vite = await source("vite.config.js");
  assert.match(vite, /enforceEntryBundleBudget\(maxBytes = 500 \* 1024\)/);
  assert.match(vite, /output\.isEntry/);
  assert.match(vite, /chunkSizeWarningLimit: 1700/);
});

test("password recovery is public, neutral, and handled through Supabase Auth", async () => {
  const app = await source("src/App.jsx");
  const login = await source("src/pages/Login.jsx");
  const reset = await source("src/pages/ResetPassword.jsx");

  assert.match(app, /\^\\\/reset-password/);
  assert.match(app, /path="\/reset-password"/);
  assert.match(app, /event === "PASSWORD_RECOVERY"/);
  assert.match(login, /resetPasswordForEmail/);
  assert.match(login, /redirectTo: window\.location\.origin/);
  assert.match(login, /If an account exists for this email/);
  assert.match(reset, /updateUser\(\{ password \}\)/);
  assert.match(reset, /password\.length < 8/);
  assert.match(reset, /password !== confirmPassword/);
  assert.match(reset, /recoveryLinkHasError/);
});

test("invite acceptance reuses a matching session and returns to the invite after confirmation", async () => {
  const invite = await source("src/pages/InviteAccept.jsx");
  assert.match(invite, /let activeSession = existingSession\?\.session \|\| null/);
  assert.match(invite, /if \(!activeSession\) \{/);
  assert.match(invite, /emailRedirectTo: window\.location\.href/);
  assert.match(invite, /apiFetch\("\/invites\/accept"/);
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
