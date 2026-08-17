import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("district map layer defaults allow a public name to be saved", async () => {
  const builder = await source("src/pages/DistrictMaps.jsx");

  assert.match(builder, /Public layer name/);
  assert.match(builder, /display_name: trimmedName/);
  assert.match(builder, /Used in the public map controls, legend, search results, and feature details/);
});

test("the public district map consistently renders the saved layer name", async () => {
  const publicMap = await source("src/pages/DistrictMapPublic.jsx");

  assert.match(publicMap, /layer_name: layer\.display_name/);
  assert.match(publicMap, /\{layer\.display_name\}/);
  assert.match(publicMap, /selectedLayer\.display_name/);
});
