import { expect, test } from "@playwright/test";

import { openRoute } from "./support/watchlist";

test("Resources groups guides, glossary and companies with keyboard and mobile dismissal", async ({ page }, testInfo) => {
  await openRoute(page, "/");
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
  const expandedTrigger = usesSheet
    ? page.locator('[data-slot="sheet-content"] [data-slot="dropdown-menu-trigger"]')
    : trigger;
  await expect(expandedTrigger).toHaveAttribute("aria-expanded", "true");
  for (const label of ["All resources", "Glossary", "Companies"]) {
    await expect(page.getByRole(usesSheet ? "menuitem" : "link", { name: label, exact: true })).toBeInViewport({ ratio: 1 });
  }
  // Visibility alone allows opacity zero. The dropdown is portaled outside
  // the drawer, so check both surfaces and their ancestors before capturing.
  const surfaces = usesSheet ? [glossary, page.locator('[data-slot="sheet-content"]')] : [glossary];
  for (const surface of surfaces) {
    await expect.poll(() => surface.evaluate((element) => {
      for (let current: Element | null = element; current; current = current.parentElement) {
        if (Number(getComputedStyle(current).opacity) < 1) return false;
        if (current.getAnimations().some((animation) => animation.playState === "running" || animation.pending)) return false;
      }
      return true;
    }), { message: "Resources submenu and drawer should be fully opaque and settled" }).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("public-brand-resources-open.png"), fullPage: false, animations: "disabled" });
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


test("search shortcut displays the platform key and opens from keyboard", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Keyboard shortcut badge is for desktop layouts");
  await page.setViewportSize({ width: 1536, height: 900 });
  // The shortcut badge is SSR content; wait for client effects before pressing
  // a shortcut rather than mistaking a visible label for an attached handler.
  // This request starts in PublicSiteHeader's effect, so it also establishes
  // header hydration when React hydrates streamed boundaries separately.
  const headerHydrated = page.waitForRequest("**/api/header-state");
  await openRoute(page, "/");
  await headerHydrated;
  const expectedShortcut = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘ K" : "Ctrl K");
  const search = page.getByRole("button", { name: "Search tools and resources" });
  await expect(search).toContainText(expectedShortcut);
  await expect(search.getByText(expectedShortcut, { exact: true })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Search the AI SRE Watchlist" });
  const dialogTitle = page.getByRole("heading", { name: "Search the AI SRE Watchlist", exact: true });
  await expect(dialogTitle).toHaveCount(0);
  for (const key of ["Control+k", "Meta+k", "Control+k"]) {
    await page.keyboard.press(key);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Search the AI SRE Watchlist", exact: true })).toHaveCount(1);
    await expect(dialog.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(dialogTitle).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("public-brand-search-shortcut.png"), fullPage: false });
});
