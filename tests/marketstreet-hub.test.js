import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { marketStreetDateTimeToIso, marketStreetIsoToDateTime } from "../src/lib/marketstreetTime.js";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("MarketStreet exposes the full marketing operating hub", async () => {
  const page = await source("src/pages/MarketStreet.jsx");
  assert.match(page, />Marketing Hub</);
  assert.match(page, /Plan and manage Main Street&apos;s marketing in one place\./);
  assert.doesNotMatch(page, /Operating rhythm|Marketing, from request to published/);
  for (const label of ["Overview", "Calendar", "Campaigns", "Content", "Requests", "Channels"]) {
    assert.match(page, new RegExp(`>${label}`));
  }
  assert.match(page, /\/marketstreet\/overview/);
  assert.match(page, /\/marketstreet\/calendar/);
  assert.match(page, /\/marketstreet\/campaigns/);
  assert.match(page, /\/marketstreet\/content/);
  assert.match(page, /Confirm scheduled/);
  assert.match(page, /Mark published/);
});

test("content can link Canva, Drive, and Document Center sources", async () => {
  const page = await source("src/pages/MarketStreet.jsx");
  const wizard = await source("src/components/marketstreet/CampaignWizard.jsx");
  assert.match(page, /value="canva">Canva/);
  assert.match(page, /value="google_drive">Google Drive/);
  assert.match(page, /value="document_center">Document Center/);
  assert.match(page, /\/marketstreet\/resources/);
  assert.match(page, /Attach source/);
  assert.match(wizard, /Create campaign & schedule/);
  assert.match(wizard, /PublicationPlanner/);
  assert.match(wizard, /Source provider/);
});

test("content scheduling supports editable, repeatable channel publications", async () => {
  const page = await source("src/pages/MarketStreet.jsx");
  const planner = await source("src/components/marketstreet/PublicationPlanner.jsx");
  assert.match(page, /\/marketstreet\/campaign-builder/);
  assert.match(page, /\/marketstreet\/content-plan/);
  assert.match(page, /\/marketstreet\/publications\/bulk/);
  assert.match(page, /\/marketstreet\/content\/\$\{editTarget\.id\}\/plan/);
  assert.match(page, /Add content for this day/);
  assert.match(page, /Create & schedule/);
  assert.match(page, /Add publication/);
  assert.match(planner, /Add the same channel again for a follow-up post/);
  assert.match(planner, /T10:00/);
  assert.match(planner, /length: 96/);
});

test("publication wall-clock times serialize in MarketStreet's Central timezone", () => {
  assert.equal(marketStreetDateTimeToIso("2026-08-14T10:00"), "2026-08-14T15:00:00.000Z");
  assert.equal(marketStreetDateTimeToIso("2026-01-14T10:15"), "2026-01-14T16:15:00.000Z");
  assert.equal(marketStreetIsoToDateTime("2026-08-14T15:00:00.000Z"), "2026-08-14T10:00");
  assert.equal(marketStreetIsoToDateTime("2026-01-14T16:15:00.000Z"), "2026-01-14T10:15");
});

test("legacy requests have bulk archive, restore, trash, and campaign conversion", async () => {
  const page = await source("src/pages/MarketStreet.jsx");
  assert.match(page, /\/marketstreet\/legacy-reconciliation/);
  assert.match(page, /\/marketstreet\/requests\/\$\{action\}/);
  assert.match(page, /\/marketstreet\/requests\/\$\{id\}\/convert/);
  assert.match(page, /Request moved to trash/);
  assert.match(page, /recoverable action/);
});

test("new requests promote the earliest material deadline into the shared calendar", async () => {
  const page = await source("src/pages/CreateRequest.jsx");
  assert.match(page, /materialDueDates/);
  assert.match(page, /due_date: materialDueDates\[0\]/);
});

test("campaigns open an editable operational workspace", async () => {
  const app = await source("src/App.jsx");
  const hub = await source("src/pages/MarketStreet.jsx");
  const workspace = await source("src/pages/CampaignWorkspace.jsx");
  assert.match(app, /marketstreet\/campaign\/:id/);
  assert.match(hub, /marketstreet\/campaign\/\$\{campaign\.id\}/);
  assert.match(hub, /marketstreet\/campaign\/\$\{item\.campaign_id\}\?deliverable=\$\{item\.id\}/);
  assert.match(workspace, /Edit campaign/);
  assert.match(workspace, /Due date and time/);
  assert.match(workspace, /Actually completed/);
  assert.match(workspace, /Add proof or working link/);
  assert.match(workspace, /\/marketstreet\/deliverables\/\$\{deliverableTarget\.id\}/);
  assert.match(workspace, /marketStreetDateTimeToIso/);
});

test("Action Center completes MarketStreet work through its own endpoint", async () => {
  const page = await source("src/pages/ActionCenter.jsx");
  assert.match(page, /item\.entity_type === "marketing_deliverable"/);
  assert.match(page, /\/marketstreet\/deliverables\/\$\{item\.entity_id\}/);
  assert.match(page, /Campaign: \{item\.context\.campaign_title\}/);
});
