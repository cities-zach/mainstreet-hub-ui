/* global process */
import { test, expect } from "@playwright/test";

const hasAuth = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

async function signIn(page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(process.env.E2E_EMAIL);
  await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/", { timeout: 30_000 });
}

test.describe("MasterPlanner planning improvements", () => {
  test.skip(!hasAuth, "Set E2E_EMAIL and E2E_PASSWORD to run this test");

  test("autosaves committees, provenance, programs, bulk rows, and post-event notes", async ({
    page,
  }) => {
    const eventName = `E2E Autosave ${Date.now()}`;

    await signIn(page);
    await page.goto("/event-plan");
    await page.getByLabel("Event Name *").fill(eventName);
    await page.getByLabel("Start Date *").fill("2025-11-01");
    await page.getByLabel("Promotion").click();
    await page.getByLabel("Design").click();
    await page.getByLabel("Imported from").fill("2024 archived work plan");
    await page.getByLabel("Source year").fill("2024");
    await page
      .getByLabel("Import caveats")
      .fill("Volunteer counts were incomplete in the source.");

    await page
      .getByRole("button", { name: "Health & Safety", exact: true })
      .click();
    await page.getByLabel("Estimated Attendance").fill("TBD");
    await page
      .getByLabel("Anticipated Weather")
      .fill("Cold with possible rain.");

    await expect(page).toHaveURL(/\/event-plan\?id=/, { timeout: 30_000 });
    await expect(page.getByText(/^Saved(?: at)?/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.getByRole("button", { name: "Add Program" }).click();
    await page.getByLabel("Special program 1 name").fill("Opening Ceremony");
    await page
      .getByLabel("Special program 1 start")
      .fill("2025-11-01T18:00");
    await page
      .getByLabel("Special program 1 end")
      .fill("2025-11-01T19:00");

    await page.getByRole("button", { name: "Paste rows" }).first().click();
    await page
      .getByPlaceholder("Time\tActivity\tLocation")
      .fill("17:30\tDoors open\tMain entrance\n18:00\tWelcome\tMain stage");
    await page.getByRole("button", { name: "Add 2 rows" }).click();

    await page
      .getByRole("button", { name: "Post-Event Notes", exact: true })
      .click();
    await page.getByLabel("Actual attendance").fill("425");
    await page
      .getByLabel("Actual outcomes")
      .fill("Attendance exceeded the prior year and sponsorship goals were met.");
    await page
      .getByLabel("Lessons learned")
      .fill("Open volunteer check-in thirty minutes earlier.");
    await page
      .getByLabel("Additional post-event notes")
      .fill("Final vendor report is stored with the event files.");

    await expect(page.getByText(/^Saved(?: at)?/)).toBeVisible({
      timeout: 30_000,
    });
    await page.reload();

    await expect(page.getByLabel("Promotion")).toHaveAttribute(
      "data-state",
      "checked"
    );
    await expect(page.getByLabel("Design")).toHaveAttribute(
      "data-state",
      "checked"
    );
    await expect(page.getByLabel("Imported from")).toHaveValue(
      "2024 archived work plan"
    );

    await page
      .getByRole("button", { name: "Health & Safety", exact: true })
      .click();
    await expect(page.getByLabel("Estimated Attendance")).toHaveValue("TBD");
    await expect(page.getByLabel("Anticipated Weather")).toHaveValue(
      "Cold with possible rain."
    );

    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await expect(page.getByLabel("Special program 1 name")).toHaveValue(
      "Opening Ceremony"
    );
    await expect(page.getByDisplayValue("Doors open")).toBeVisible();
    await expect(page.getByDisplayValue("Welcome")).toBeVisible();

    await page
      .getByRole("button", { name: "Post-Event Notes", exact: true })
      .click();
    await expect(page.getByLabel("Actual attendance")).toHaveValue("425");
    await expect(page.getByLabel("Lessons learned")).toHaveValue(
      "Open volunteer check-in thirty minutes earlier."
    );
  });
});
