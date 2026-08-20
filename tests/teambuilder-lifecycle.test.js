import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("TeamBuilder separates upcoming, past, and archived opportunities", async () => {
  const page = await source("src/pages/TeamBuilder.jsx");
  assert.match(page, /\/volunteer\/jobs\?scope=all/);
  assert.match(page, /TabsTrigger value="upcoming"/);
  assert.match(page, /TabsTrigger value="past"/);
  assert.match(page, /TabsTrigger value="archived"/);
  assert.match(page, /job\.lifecycle_group === activeTab/);
  assert.match(page, /job\.can_accept_assignments === true/);
  assert.match(page, /Past opportunities are kept under Past/i);
  assert.match(page, /attendance pending/i);
});

test("TeamBuilder exposes accessible opportunity and volunteer management controls", async () => {
  const page = await source("src/pages/TeamBuilder.jsx");
  assert.match(page, /aria-label={`Manage volunteers for \$\{job\.title\}`}/);
  assert.match(page, /aria-label={`Manage opportunity \$\{job\.title\}`}/);
  assert.match(page, /CreateOpportunityDialog[\s\S]*job={managedJob}/);
  assert.match(page, /VolunteerManagerDialog[\s\S]*job={volunteerJob}/);
});

test("opportunity management supports source-aware editing and safe lifecycle actions", async () => {
  const dialog = await source("src/components/teambuilder/CreateOpportunityDialog.jsx");
  assert.match(dialog, /Manage Volunteer Opportunity/);
  assert.match(dialog, /Edit in MasterPlanner/);
  assert.match(dialog, /\/volunteer\/jobs\/\$\{job\.id\}\/\$\{action\}/);
  assert.match(dialog, /Close signups/);
  assert.match(dialog, /Reopen signups/);
  assert.match(dialog, /Archive/);
  assert.match(dialog, /Restore/);
  assert.match(dialog, /Confirm delete/);
  assert.match(dialog, /has volunteer history, so it can be archived but not permanently deleted/i);
});

test("volunteer management blocks stale recruiting while preserving attendance workflow", async () => {
  const dialog = await source("src/components/teambuilder/VolunteerManagerDialog.jsx");
  assert.match(dialog, /\/users\/roster/);
  assert.match(dialog, /Signups are closed for this opportunity/i);
  assert.match(dialog, /attendance_status/);
  assert.match(dialog, /hours_completed/);
  assert.match(dialog, /Save attendance/i);
  assert.match(dialog, /preservePastRecord/);
  assert.match(dialog, /aria-label={`Remove \$\{assignment\.name\}/);
});

test("MasterPlanner sync communicates that tasks and volunteer opportunities are reconciled", async () => {
  const form = await source("src/pages/EventPlanForm.jsx");
  assert.match(form, /result\.summary\.volunteer_jobs/);
  assert.match(form, /Tasks & volunteers synced/);
  assert.match(form, /volunteer opportunities/);
});
