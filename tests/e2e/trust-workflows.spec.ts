import { expect, test } from "@playwright/test";

import {
  expectBellWithoutFakeUnread,
  expectMinimumTouchTarget,
  expectPublicPageGuardrails,
  openRoute,
} from "./support/watchlist";

test.describe("trust and activation workflows", () => {
  test("company profile makes Save and Follow explicitly different actions", async ({ page }, testInfo) => {
    await openRoute(page, "/companies/runwhen");

    await expect(page.getByRole("heading", { level: 1, name: "RunWhen" })).toBeVisible();
    await expect(
      page.getByText("Saving a product does not follow this company. These are intentionally separate actions."),
    ).toBeVisible();
    await expect(
      page.getByText(/Following this company will notify you after the Watchlist publishes a reviewed update/),
    ).toBeVisible();

    const save = page.getByRole("button", { name: "Save RunWhen" });
    const follow = page.getByRole("button", { name: "Follow RunWhen" });
    await expectMinimumTouchTarget(save, "Product Save action");
    await expectMinimumTouchTarget(follow, "Company Follow action");
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await expect(follow).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Follow company", { exact: true })).toBeVisible();
    await expect(page.getByText("Save", { exact: true })).toHaveCount(0);
    await expect(page.getByText("No reviewed updates published yet", { exact: true })).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("sign-in uses the benefit-led split layout and passwordless form", async ({ page }, testInfo) => {
    await openRoute(page, "/sign-in");

    const benefitSection = page.getByRole("heading", {
      level: 1,
      name: "Your reliability research, in one place.",
    }).locator("xpath=ancestor::section");
    const signInSection = page.getByRole("region", { name: "Sign in" });

    await expect(benefitSection).toBeVisible();
    await expect(signInSection).toBeVisible();
    await expect(page.getByRole("list", { name: "Account benefits" })).toBeVisible();
    await expect(page.getByText("Keep a focused shortlist", { exact: true })).toBeVisible();
    await expect(page.getByText("Run structured evaluations", { exact: true })).toBeVisible();
    await expect(page.getByText("Write private product notes", { exact: true })).toBeVisible();
    await expect(page.getByText("Follow company updates", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Work email")).toHaveAttribute("type", "email");
    await expect(page.getByText("No password required.", { exact: false })).toBeVisible();

    const emailAction = page.getByRole("button", { name: "Email me a sign-in link" });
    await expectMinimumTouchTarget(emailAction, "Magic-link action");

    const left = await benefitSection.boundingBox();
    const right = await signInSection.boundingBox();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();

    if (testInfo.project.name === "chromium") {
      expect(Math.abs(left!.y - right!.y), "Desktop split panels should begin on the same row").toBeLessThanOrEqual(1);
      expect(right!.x, "The sign-in panel should be the right half of the desktop split").toBeGreaterThanOrEqual(left!.x + left!.width - 1);
      expect(Math.abs(left!.width - right!.width), "Desktop split panels should have balanced widths").toBeLessThanOrEqual(2);
    } else {
      expect(right!.y, "Mobile auth panels should stack without side overflow").toBeGreaterThanOrEqual(left!.y + left!.height - 1);
    }

    await expectPublicPageGuardrails(page, testInfo);
  });

  test("updates show an honest empty state and no invented unread count", async ({ page }, testInfo) => {
    await openRoute(page, "/updates");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Reviewed updates, not vendor-feed noise",
      }),
    ).toBeVisible();
    await expect(page.getByText("No reviewed updates have been published yet", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/feed intentionally stays empty until an update has sources and editorial review/i),
    ).toBeVisible();
    await expect(page.getByText(/There are no placeholder unread badges/i)).toBeVisible();
    await expectBellWithoutFakeUnread(page);
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("correction form exposes source, review, and privacy constraints without auto-publishing", async ({ page }, testInfo) => {
    await openRoute(page, "/submit/correction?product=runwhen");

    await expect(page.getByRole("heading", { level: 1, name: "Help keep a profile accurate" })).toBeVisible();
    await expect(page.getByText("Corrections need a primary source. Public proof remains public after review.")).toBeVisible();
    await expect(page.getByLabel("Your relationship")).toBeVisible();
    await expect(page.getByLabel("Company")).toBeVisible();
    await expect(page.getByLabel("Product")).toContainText("RunWhen");

    const source = page.getByLabel("Primary source URL");
    const message = page.getByLabel("What should we review?");
    const email = page.getByLabel("Contact email");
    await expect(source).toHaveAttribute("type", "url");
    await expect(source).toHaveAttribute("required", "");
    await expect(message).toHaveAttribute("minlength", "20");
    await expect(message).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("required", "");
    await expect(page.getByText("Editorial review is mandatory", { exact: true })).toBeVisible();
    await expect(page.getByText(/Company submissions never publish directly/i)).toBeVisible();
    await expect(page.getByText(/never shown publicly/i)).toBeVisible();
    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Send for review" }),
      "Correction submission action",
    );
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("every private workspace entry redirects an anonymous visitor to sign in", async ({ page }, testInfo) => {
    const protectedRoutes = [
      "/workspace/saved",
      "/workspace/notes",
      "/workspace/evaluations",
      "/workspace/following",
      "/settings",
    ] as const;

    for (const route of protectedRoutes) {
      await openRoute(page, route);
      await expect(page).toHaveURL((url) => {
        return url.pathname === "/sign-in" && url.searchParams.get("next") === route;
      });
      await expect(page.getByText("Sign in to AI SRE Watchlist", { exact: true })).toBeVisible();
      await expect(page.getByText("Public evidence stays public.", { exact: false })).toBeVisible();
      await expectPublicPageGuardrails(page, testInfo);
    }
  });
});
