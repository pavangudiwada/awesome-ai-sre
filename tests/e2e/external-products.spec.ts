import { expect, test } from "@playwright/test";

import { expectImageHasNaturalSize, expectPublicPageGuardrails, openRoute } from "./support/watchlist";

for (const product of [
  { slug: "anyshift", name: "Anyshift", website: "https://www.anyshift.io/", category: "incident-ai", categoryLabel: "Incident AI", summary: "AI agents for production incident investigation" },
  { slug: "emisar", name: "emisar", website: "https://emisar.dev/", category: "learning", categoryLabel: "Security", summary: "Controlled infrastructure access for AI agents" },
]) {
  test(`${product.name} has a discoverable sourced public profile`, async ({ page }, testInfo) => {
    await openRoute(page, `/tools?q=${product.slug}&category=${product.category}`);
    const result = page.getByRole("link", { name: `View ${product.name} profile`, exact: true });
    await expect(result).toBeVisible();
    await expect(page.getByRole("radio", { name: `Show ${product.categoryLabel}`, exact: true })).toHaveAttribute("aria-checked", "true");
    await Promise.all([page.waitForURL(`**/tools/${product.slug}`), result.click()]);
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.locator("article > header").getByText(product.summary, { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit website", exact: true })).toHaveAttribute("href", product.website);
    await expectImageHasNaturalSize(page.getByRole("img", { name: `${product.name} logo`, exact: true }).first(), `${product.name} logo`);
    await expectPublicPageGuardrails(page, testInfo);

    await openRoute(page, `/companies/${product.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit company website", exact: true })).toHaveAttribute("href", product.website);
    const companyPreview = page.getByRole("img", { name: `${product.name} product preview`, exact: true });
    await expectImageHasNaturalSize(companyPreview, `${product.name} official-page preview`);
    expect(await companyPreview.evaluate((image: HTMLImageElement) => new URL(image.currentSrc || image.src).pathname)).toBe(`/screenshots/${product.slug}.jpg`);
    await expect(page.getByRole("link", { name: /Official (product|company|project)/ }).first()).toBeVisible();
    const companyLogos = page.getByRole("img", { name: `${product.name} logo`, exact: true });
    await expect(companyLogos).toHaveCount(2);
    for (const logo of await companyLogos.all()) {
      await expectImageHasNaturalSize(logo, `${product.name} company-page logo`);
      await logo.evaluate((node) => (node as HTMLImageElement).decode());
    }
    await expect(page.getByText("Learning", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Runbooks", { exact: true })).toHaveCount(0);
    await expectPublicPageGuardrails(page, testInfo);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: testInfo.outputPath(`${product.slug}-company.png`), fullPage: true, caret: "initial" });
  });
}
