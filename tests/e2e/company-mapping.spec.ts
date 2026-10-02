import { expect, test } from "@playwright/test";

import { expectImageHasNaturalSize, expectPublicPageGuardrails, openRoute } from "./support/watchlist";

test.describe("sourced company mappings", () => {
  test("shared Elastic identity keeps its own brand and both product paths", async ({ page }, testInfo) => {
    await openRoute(page, "/companies/elastic");
    await expect(page.getByRole("heading", { level: 1, name: "Elastic", exact: true })).toBeVisible();
    await expect(page.getByText("2 listed products", { exact: true })).toBeVisible();
    const logo = page.getByRole("img", { name: "Elastic logo", exact: true }).first();
    await expectImageHasNaturalSize(logo, "Elastic company logo");
    await expect(logo).toHaveAttribute("src", /elastic/);
    await expect(page.getByRole("img", { name: "Elastic product preview", exact: true })).toHaveAttribute("src", /elastic/);
    await expect(page.getByRole("link", { name: "View Elastic profile", exact: true })).toHaveAttribute("href", "/tools/elastic");
    await page.getByRole("link", { name: "View Deductive AI profile", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/deductive-ai$/);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Elastic", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Completed acquisition of Deductive AI/ })).toHaveAttribute("href", /ir\.elastic\.co/);
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("parent without company media retains product previews without an empty hero", async ({ page }, testInfo) => {
    await openRoute(page, "/companies/mirantis");
    await expect(page.getByRole("heading", { level: 1, name: "Mirantis" })).toBeVisible();
    await expect(page.getByText("Preview unavailable", { exact: true })).toHaveCount(0);
    await expectImageHasNaturalSize(page.getByRole("img", { name: "Lens K8s IDE product interface", exact: true }), "Lens product preview");
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("Vigiles exposes company identity sources without inventing reviewed updates", async ({ page }, testInfo) => {
    await openRoute(page, "/companies/vigiles");
    await expect(page.getByRole("heading", { level: 1, name: "Vigiles Pte. Ltd." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Official terms identify service/ })).toHaveAttribute("href", "https://vigileshq.com/terms");
    await expect(page.getByText("No reviewed updates published yet", { exact: true })).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });
});
