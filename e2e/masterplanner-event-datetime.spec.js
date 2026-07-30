import { test, expect } from "@playwright/test";

const hasAuth = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

const TEMPORAL_FIELDS = {
  start_date: "2025-03-15",
  end_date: "2025-03-16",
  start_time: "09:00",
  end_time: "17:30",
  setup_start_time: "2025-03-15T07:00",
  teardown_end_time: "2025-03-16T20:00",
  event_start_time: "10:00",
  event_end_time: "18:00",
  run_of_show_time: "10:30",
};

async function signIn(page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(process.env.E2E_EMAIL);
  await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/", { timeout: 30_000 });
}

test.describe("MasterPlanner event date/time persistence", () => {
  test.skip(!hasAuth, "Set E2E_EMAIL and E2E_PASSWORD to run this test");

  test("persists overview and schedule temporal fields after save and reload", async ({
    page,
  }) => {
    const eventName = `E2E DateTime ${Date.now()}`;

    await signIn(page);
    await page.goto("/event-plan");
    await expect(page.getByRole("heading", { name: "New Event Plan" })).toBeVisible();

    await page.getByLabel("Event Name *").fill(eventName);
    await page.getByLabel("Start Date *").fill(TEMPORAL_FIELDS.start_date);
    await page.getByLabel("End Date").fill(TEMPORAL_FIELDS.end_date);
    await page.getByLabel("Start Time").fill(TEMPORAL_FIELDS.start_time);
    await page.getByLabel("End Time").fill(TEMPORAL_FIELDS.end_time);

    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.getByLabel("Setup Start Time").fill(TEMPORAL_FIELDS.setup_start_time);
    await page.getByLabel("Teardown End Time").fill(TEMPORAL_FIELDS.teardown_end_time);
    await page.getByLabel("Event Start Time").fill(TEMPORAL_FIELDS.event_start_time);
    await page.getByLabel("Event End Time").fill(TEMPORAL_FIELDS.event_end_time);

    await page.getByRole("button", { name: "Add Item" }).first().click();
    await page
      .getByLabel("Run of show item 1 time")
      .fill(TEMPORAL_FIELDS.run_of_show_time);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/event-plan\?id=/, { timeout: 30_000 });

    await page.reload();
    await expect(page.getByLabel("Event Name *")).toHaveValue(eventName);
    await expect(page.getByLabel("Start Date *")).toHaveValue(TEMPORAL_FIELDS.start_date);
    await expect(page.getByLabel("End Date")).toHaveValue(TEMPORAL_FIELDS.end_date);
    await expect(page.getByLabel("Start Time")).toHaveValue(TEMPORAL_FIELDS.start_time);
    await expect(page.getByLabel("End Time")).toHaveValue(TEMPORAL_FIELDS.end_time);

    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await expect(page.getByLabel("Setup Start Time")).toHaveValue(
      TEMPORAL_FIELDS.setup_start_time
    );
    await expect(page.getByLabel("Teardown End Time")).toHaveValue(
      TEMPORAL_FIELDS.teardown_end_time
    );
    await expect(page.getByLabel("Event Start Time")).toHaveValue(
      TEMPORAL_FIELDS.event_start_time
    );
    await expect(page.getByLabel("Event End Time")).toHaveValue(
      TEMPORAL_FIELDS.event_end_time
    );
    await expect(page.getByLabel("Run of show item 1 time")).toHaveValue(
      TEMPORAL_FIELDS.run_of_show_time
    );
  });
});
