import { expect, test } from "@playwright/test";

test("glossary acronym search, keyboard clearing, and topic recovery", async ({ page }) => {
  await page.goto("/glossary");
  const search = page.getByRole("textbox", { name: "Find a term" });
  await search.fill("SLO");
  await expect(page.getByRole("heading", { name: "Service level objective", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("1 of 19 terms");
  await search.press("Tab");
  await expect(page.getByRole("button", { name: "Clear term search" })).toBeFocused();
  await page.getByRole("button", { name: "Clear term search" }).press("Enter");
  await expect(search).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("19 of 19 terms");
  await page.getByRole("combobox", { name: "Topic", exact: true }).click();
  await page.getByRole("option", { name: "Telemetry", exact: true }).click();
  await search.fill("SLO");
  await expect(page.getByText("No terms match your search and topic", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset search and topic" }).click();
  await expect(page.getByRole("status")).toHaveText("19 of 19 terms");
});

test("related concepts lead into a sourced catalog profile and Back recovers glossary", async ({ page }) => {
  await page.goto("/glossary");
  await page.getByRole("textbox", { name: "Find a term" }).fill("SLO");
  await page.getByRole("button", { name: "Error budget", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Error budget", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Find a term" }).fill("AI SRE");
  await page.getByRole("link", { name: "Read the OpenObserve Enterprise preview" }).click();
  await expect(page).toHaveURL(/\/tools\/openobserve-ai-sre$/);
  await expect(page.getByRole("heading", { name: "OpenObserve AI SRE Agent", exact: true })).toBeVisible();
  await expect(page.getByText(/Requires an Enterprise license/)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/glossary\?q=AI\+SRE$/);
  await expect(page.getByRole("textbox", { name: "Find a term" })).toHaveValue("AI SRE");
});
