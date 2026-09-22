import { expect, test } from "@playwright/test";

import {
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
      page.getByText(/Following this company will prioritize its reviewed updates/),
    ).toBeVisible();

    const save = page.getByRole("button", { name: "Save RunWhen" });
    const follow = page.getByRole("button", { name: "Follow RunWhen" });
    await expectMinimumTouchTarget(save, "Product Save action");
    await expectMinimumTouchTarget(follow, "Company Follow action");
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await expect(follow).toHaveAttribute("aria-pressed", "false");
    await expect(save).toBeEnabled();
    await expect(follow).toBeEnabled();
    await expect(page.getByText("Follow company", { exact: true })).toBeVisible();
    await expect(page.getByText("No reviewed updates published yet", { exact: true })).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("sign-in keeps public browsing open while auth is unavailable", async ({ page }, testInfo) => {
    await openRoute(page, "/sign-in");

    const benefitSection = page.getByRole("heading", {
      level: 1,
      name: "Save your research when you’re ready.",
    }).locator("xpath=ancestor::section");
    const signInSection = page.getByRole("region", { name: "Sign in" });

    await expect(benefitSection).toBeVisible();
    await expect(signInSection).toBeVisible();
    await expect(page.getByRole("list", { name: "Account benefits" })).toBeVisible();
    await expect(page.getByText("Save products for later", { exact: true })).toBeVisible();
    await expect(page.getByText("Add private notes", { exact: true })).toBeVisible();
    await expect(page.getByText("Compare serious candidates", { exact: true })).toBeVisible();
    await expect(page.getByText("browse every product and source without an account", { exact: false })).toBeVisible();
    await expect(page.getByText("Sign in or create your workspace", { exact: true })).toBeVisible();
    await expect(page.getByText(/Authentication is not configured for this local preview/i)).toBeVisible();

    const left = await benefitSection.boundingBox();
    const right = await signInSection.boundingBox();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();

    if (testInfo.project.name === "chromium") {
      expect(Math.abs(left!.y - right!.y), "Desktop split panels should begin on the same row").toBeLessThanOrEqual(1);
      expect(right!.x, "The sign-in panel should be the right half of the desktop split").toBeGreaterThanOrEqual(left!.x + left!.width - 1);
    } else {
      expect(left!.y, "Mobile should put supporting account details after the sign-in panel").toBeGreaterThanOrEqual(right!.y + right!.height - 1);
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
    await expect(page.getByRole("button", { name: "Open updates" }).first()).toBeEnabled();
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
      await expect(page.getByText("Sign in or create your workspace", { exact: true })).toBeVisible();
      await expect(page.getByText("browse every product and source without an account", { exact: false })).toBeVisible();
      await expectPublicPageGuardrails(page, testInfo);
    }
  });
});
