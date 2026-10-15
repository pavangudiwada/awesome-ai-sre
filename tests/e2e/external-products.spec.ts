import { expect, test } from "@playwright/test";

import { expectImageHasNaturalSize, expectPublicPageGuardrails, openRoute } from "./support/watchlist";

for (const product of [
  { slug: "anyshift", name: "Anyshift", website: "https://www.anyshift.io/", summary: "AI agents for production incident investigation" },
  { slug: "emisar", name: "emisar", website: "https://emisar.dev/", summary: "Controlled infrastructure access for AI agents" },
]) {
  test(`${product.name} has a discoverable sourced public profile`, async ({ page }, testInfo) => {
    await openRoute(page, `/tools?q=${product.slug}`);
    const result = page.getByRole("link", { name: `View ${product.name} profile`, exact: true });
    await expect(result).toBeVisible();
    await Promise.all([page.waitForURL(`**/tools/${product.slug}`), result.click()]);
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.locator("article > header").getByText(product.summary, { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit website", exact: true })).toHaveAttribute("href", product.website);
    await expectImageHasNaturalSize(page.getByRole("img", { name: `${product.name} logo`, exact: true }).first(), `${product.name} logo`);
    await expectPublicPageGuardrails(page, testInfo);

    await openRoute(page, `/companies/${product.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit company website", exact: true })).toHaveAttribute("href", product.website);
    await expectImageHasNaturalSize(page.locator(`img[src="/screenshots/${product.slug}.jpg"]`).first(), `${product.name} official-page preview`);
    await expect(page.getByRole("link", { name: /Official (product|company|project)/ }).first()).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
    await page.screenshot({ path: testInfo.outputPath(`${product.slug}-company.png`), fullPage: true });
  });
}
