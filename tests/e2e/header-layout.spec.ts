import { expect, test } from "@playwright/test";

test("Resources groups guides, glossary and companies with keyboard and mobile dismissal", async ({ page }, testInfo) => {
  await page.goto("/");
  const mobileMenu = page.getByRole("button", { name: "Open navigation" });
  const usesSheet = await mobileMenu.isVisible();
  if (usesSheet) await mobileMenu.click();
  const trigger = page.getByRole("button", { name: "Resources", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const glossary = usesSheet
    ? page.getByRole("menuitem", { name: "Glossary", exact: true })
    : page.getByRole("link", { name: "Glossary", exact: true });
  await expect(glossary).toBeVisible();
  await expect(page.getByRole(usesSheet ? "menuitem" : "link", { name: "All resources", exact: true })).toHaveAttribute("href", "/resources");
  await expect(page.getByRole(usesSheet ? "menuitem" : "link", { name: "Companies", exact: true })).toHaveAttribute("href", "/companies");
  await page.screenshot({ path: testInfo.outputPath("public-brand-resources-open.png"), fullPage: false });
  await page.keyboard.press("Escape");
  await expect(glossary).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await glossary.click();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.getByRole("heading", { name: "AI SRE, SRE & DevOps glossary", exact: true })).toBeVisible();
  if (usesSheet) await expect(page.getByRole("dialog", { name: "AI SRE Watchlist", exact: true })).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});


test("latest notice is compact, dismissible and stays dismissed until a new update", async ({ page }, testInfo) => {
  let id = "news:layout-review";
  await page.route("**/api/header-state", route => route.fulfill({ json: {
    viewer: null,
    publicationStatus: "available",
    notifications: [{ id, title: "A new way to explore AI SRE", summary: "Browse tools, sources, and practitioner resources.", href: "https://example.com/update", publishedAtLabel: "Published Oct 15, 2026", category: "Product update", source: "watchlist" }],
  } }));
  await page.goto("/");
  const notice = page.getByRole("region", { name: "Latest update" });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "A new way to explore AI SRE", exact: true })).toBeVisible();
  await expect(notice).not.toContainText("Product update");
  await expect(notice).not.toContainText("Oct 15");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const close = notice.getByRole("button", { name: "Dismiss latest update" });
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  if (testInfo.project.name === "chromium") expect((await notice.boundingBox())!.height).toBeLessThanOrEqual(64);
  await page.screenshot({ path: testInfo.outputPath("public-brand-compact-notice.png"), fullPage: false });
  await close.focus();
  await close.press("Enter");
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.locator("header").first().getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(notice).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("public-brand-notice-dismissed.png"), fullPage: false });
  id = "news:layout-review-next";
  await page.reload();
  await expect(notice).toBeVisible();
  const bell = page.getByRole("button", { name: "Open updates", exact: true }).filter({ visible: true });
  await bell.click();
  await expect(page.getByRole("link", { name: /A new way to explore AI SRE/ }).last()).toBeVisible();
});
