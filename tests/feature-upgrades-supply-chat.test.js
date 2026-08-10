import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Supply Stop exposes guided catalog setup, controlled vocabulary, imports, and versioned checklists", async () => {
  const form = await source("src/components/supplystop/InventoryForm.jsx");
  const tools = await source("src/components/supplystop/AdminTools.jsx");
  assert.match(form, /Quantity item[\s\S]*Serialized asset[\s\S]*Kit[\s\S]*Consumable/);
  assert.match(form, /supply-item-photo/);
  assert.match(form, /instruction_version_id/);
  assert.match(form, /return_checklist_version_id/);
  assert.match(tools, /Parent location/);
  assert.match(tools, /dry_run/);
  assert.match(tools, /Publish new version/);
});

test("Supply Stop supports scanning, real QR labels, serialized assets, kits, and item-level returns", async () => {
  const page = await source("src/pages/SupplyStop.jsx");
  const returns = await source("src/components/supplystop/ReturnsList.jsx");
  assert.match(page, /PassportQrScanner/);
  assert.match(page, /QRCodeSVG/);
  assert.match(page, /Reserve \/ requisition/);
  assert.match(page, /Move \/ update condition/);
  assert.match(page, /\/supply\/items\/\$\{kitItem\.id\}\/components/);
  assert.match(returns, /requisition-items\/\$\{item\.id\}\/return/);
  assert.match(returns, /supply-return-evidence/);
  assert.match(returns, /checklist_results/);
});

test("Chat separates conversations and provides search, unread state, notification controls, and pagination", async () => {
  const chat = await source("src/pages/Chat.jsx");
  assert.match(chat, /Channels[\s\S]*DMs/);
  assert.match(chat, /Search all messages/);
  assert.match(chat, /notification_level/);
  assert.match(chat, /unread_count/);
  assert.match(chat, /useInfiniteQuery/);
  assert.match(chat, /fetchNextPage/);
});

test("Chat supports threads, mentions, message lifecycle, pins, bookmarks, previews, Library files, and tasks", async () => {
  const chat = await source("src/pages/Chat.jsx");
  const uploads = await source("src/lib/uploads.js");
  for (const pattern of [
    /getChatThread/, /mentionIds/, /updateChatMessage/, /deleteChatMessage/,
    /toggleChatPin/, /toggleChatBookmark/, /createTaskFromChat/, /ChatAttachment/,
    /library_document_id/,
  ]) assert.match(chat, pattern);
  assert.match(chat, /selectedChannel\?\.can_manage/);
  assert.match(uploads, /uploadPrivateFile/);
});

test("the patched spreadsheet distribution and QR label dependency are pinned in the manifest", async () => {
  const manifest = JSON.parse(await source("package.json"));
  assert.equal(manifest.dependencies.xlsx, "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz");
  assert.match(manifest.dependencies["qrcode.react"], /^\^4\./);
});
