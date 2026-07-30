import { test, expect } from "@playwright/test";

const hasAuth = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

const SITE_NOTES =
  "Stage on north side; keep vendor tents 10ft from curb. Rain plan: move indoors.";

async function signIn(page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(process.env.E2E_EMAIL);
  await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/", { timeout: 30_000 });
}

test.describe("MasterPlanner site considerations persistence", () => {
  test.skip(!hasAuth, "Set E2E_EMAIL and E2E_PASSWORD to run this test");

  test("persists Additional Site Considerations after save and reload", async ({
    page,
  }) => {
    const eventName = `E2E Site Notes ${Date.now()}`;

    await signIn(page);
    await page.goto("/event-plan");
    await expect(page.getByRole("heading", { name: "New Event Plan" })).toBeVisible();

    await page.getByLabel("Event Name *").fill(eventName);
    await page.getByLabel("Start Date *").fill("2025-05-10");

    await page.getByRole("button", { name: "Site Considerations", exact: true }).click();
    await page.getByLabel("Additional Site Considerations").fill(SITE_NOTES);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/event-plan\?id=/, { timeout: 30_000 });

    await page.reload();
    await page.getByRole("button", { name: "Site Considerations", exact: true }).click();
    await expect(page.getByLabel("Additional Site Considerations")).toHaveValue(
      SITE_NOTES
    );
  });
});
