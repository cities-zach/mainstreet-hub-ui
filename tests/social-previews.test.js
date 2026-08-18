import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return fs.readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Vercel serves automatic previews to social crawlers at every canonical public route", async () => {
  const config = JSON.parse(await source("vercel.json"));
  const expected = new Map([
    ["/feedback/public", "/social-preview/surveys/:surveyId"],
    ["/tours/:slug", "/social-preview/tours/:slug"],
    ["/maps/:slug", "/social-preview/maps/:slug"],
    ["/fundraising/:slug", "/social-preview/fundraising/:slug"],
    ["/contests/:slug", "/social-preview/contests/:slug"],
    ["/p/:slug", "/social-preview/passports/:slug"],
  ]);

  for (const [sourcePath, destinationPath] of expected) {
    const rewrite = config.rewrites.find((item) => item.source === sourcePath);
    assert.ok(rewrite, `missing crawler rewrite for ${sourcePath}`);
    assert.ok(rewrite.destination.endsWith(destinationPath));
    const userAgent = rewrite.has?.find((condition) => condition.type === "header" && condition.key === "user-agent");
    assert.match(userAgent?.value || "", /facebookexternalhit/);
    assert.match(userAgent?.value || "", /LinkedInBot/);
  }
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });
});

test("survey and walking-tour sharing use their trustworthy canonical portal URLs", async () => {
  const survey = await source("src/pages/SurveyBuilder.jsx");
  const tours = await source("src/pages/WalkingTours.jsx");

  assert.match(survey, /const surveyShareLink = surveyLink/);
  assert.doesNotMatch(survey, /mainsuite\.onrender\.com.*surveys.*share/);
  assert.match(tours, /navigator\.clipboard\?\.writeText\(url\)/);
  assert.doesNotMatch(tours, /\/api\/tours\/.*\/share/);
});
