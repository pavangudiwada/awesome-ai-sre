import { expect, test } from "@playwright/test";

import { expectImageHasNaturalSize, expectPublicPageGuardrails, openRoute } from "./support/watchlist";

test.describe("new source-backed products", () => {
  for (const product of [
    { slug: "ilert-ai-sre", name: "ilert AI SRE", company: "ilert", boundary: "action execution left to the engineer", source: "Official AI SRE product page and GA autonomy boundary" },
    { slug: "empirik", name: "empirik", company: "empirik", boundary: "customer-managed VPC", source: "Official infrastructure-change product and deployment options" },
  ]) {
    test(`${product.name} preserves its scope, source links, and media`, async ({ page }, testInfo) => {
      await openRoute(page, `/tools/${product.slug}`);
      await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
      await expect(page.locator("article header").getByText(product.boundary, { exact: false })).toBeVisible();
      await expectImageHasNaturalSize(page.getByRole("img", { name: `${product.name} logo`, exact: true }), `${product.name} logo`);
      await expectImageHasNaturalSize(page.getByRole("img", { name: `${product.name} product preview`, exact: true }), `${product.name} preview`);
      await expect(page.getByRole("link", { name: product.source })).toBeVisible();
      await expectPublicPageGuardrails(page, testInfo);
      await page.screenshot({
        path: testInfo.outputPath(`public-catalog-${product.slug}.png`),
        fullPage: true,
      });

      await page.locator(`article header a[href="/companies/${product.company}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/companies/${product.company}$`));
      await expect(page.getByRole("heading", { level: 1, name: product.company, exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: product.source })).toBeVisible();
      await expectPublicPageGuardrails(page, testInfo);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/tools/${product.slug}$`));
      await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    });
  }
});
