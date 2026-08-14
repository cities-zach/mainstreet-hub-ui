import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

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
