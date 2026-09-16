import { expect, test } from "@playwright/test";

import {
  AUTH_E2E_USERS,
  authenticatePage,
  cleanupLocalAuthenticatedFixtures,
  requestMagicLink,
  resetLocalUserWorkflows,
  sessionCount,
  seedLocalAuthenticatedFixtures,
  type AuthenticatedFixtureUsers,
} from "./support/authenticated";
import { openRoute } from "./support/watchlist";

test.skip(
  process.env.RUN_AUTHENTICATED_E2E !== "1",
  "Authenticated release tests require the explicit loopback Better Auth harness",
);

test.describe("authenticated release workflows", () => {
  test.describe.configure({ mode: "serial" });
  let users: AuthenticatedFixtureUsers;

  test.beforeAll(async () => {
    users = await seedLocalAuthenticatedFixtures();
  });

  test.beforeEach(async () => {
    await resetLocalUserWorkflows(users);
  });

  test.afterAll(async () => {
    await cleanupLocalAuthenticatedFixtures(users);
  });

    test("resumes pending Save and Follow intents after a real magic-link callback", async ({ page }) => {
      await openRoute(page, "/companies/runwhen");
      await page.getByRole("button", { name: "Save RunWhen" }).click();
      await expect(page).toHaveURL(/\/sign-in\?next=%2Ftools%2Frunwhen/);
      await authenticatePage(page, AUTH_E2E_USERS.primary.email, "/tools/runwhen");
      await expect(page.getByRole("button", { name: "Remove RunWhen from saved" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await page.context().clearCookies();
      await openRoute(page, "/companies/runwhen");
      await page.getByRole("button", { name: "Follow RunWhen" }).click();
      await expect(page).toHaveURL(/\/sign-in\?next=%2Fcompanies%2Frunwhen/);
      await authenticatePage(page, AUTH_E2E_USERS.primary.email, "/companies/runwhen");
      await expect(page.getByRole("button", { name: "Unfollow RunWhen" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await openRoute(page, "/workspace/saved");
      await expect(page.getByRole("link", { name: "RunWhen" })).toBeVisible();
      await openRoute(page, "/workspace/following");
      await expect(page.getByRole("link", { name: "RunWhen" })).toBeVisible();
    });

    test("uses each captured magic link once and rejects the retired Supabase callback", async ({ page }) => {
      const link = await requestMagicLink(page, AUTH_E2E_USERS.primary.email, "/workspace/saved");
      await page.goto(link, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL("/workspace/saved");

      await page.context().clearCookies();
      await page.goto(link, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/sign-in/);

      await page.goto("/auth/confirm?token_hash=retired&type=magiclink", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/sign-in\?error=Please\+request\+a\+new\+sign-in\+link/);
    });

    test("keeps notes private to the signed-in practitioner", async ({ page }) => {
      await authenticatePage(page, AUTH_E2E_USERS.primary.email, "/tools/runwhen");
      const note = page.getByLabel("Private note for RunWhen");
      await note.fill("Only the primary practitioner should see this incident-review note.");
      await note.blur();
      await expect(page.getByRole("status")).toHaveText("Saved privately");

      await openRoute(page, "/workspace/notes");
      await expect(page.getByText(/Only the primary practitioner should see/)).toBeVisible();

      await page.context().clearCookies();
      await authenticatePage(page, AUTH_E2E_USERS.secondary.email, "/workspace/notes");
      await expect(page.getByText("No product notes yet", { exact: true })).toBeVisible();

      await page.context().clearCookies();
      await authenticatePage(page, AUTH_E2E_USERS.primary.email, "/tools/runwhen");
      await page.getByLabel("Private note for RunWhen").fill("   ");
      await expect(page.getByLabel("Private note for RunWhen")).toHaveValue("   ");
      await page.getByLabel("Private note for RunWhen").blur();
      await expect(page.getByRole("status")).toHaveText("Saved privately");
      await openRoute(page, "/workspace/notes");
      await expect(page.getByText("No product notes yet", { exact: true })).toBeVisible();
    });

    test("revokes the server session on sign out", async ({ page }) => {
      await authenticatePage(page, AUTH_E2E_USERS.primary.email, "/workspace/saved");
      await expect(sessionCount(AUTH_E2E_USERS.primary.id)).resolves.toBeGreaterThan(0);
      await page.getByRole("button", { name: /Open account menu/ }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect(page).toHaveURL("/");
      await expect(sessionCount(AUTH_E2E_USERS.primary.id)).resolves.toBe(0);
      await openRoute(page, "/workspace/saved");
      await expect(page).toHaveURL(/\/sign-in\?next=%2Fworkspace%2Fsaved/);
    });

    test("covers evaluation create, update, candidate changes, and deletion", async ({ page }) => {
      await authenticatePage(
        page,
        AUTH_E2E_USERS.primary.email,
        "/workspace/evaluations/new?product=runwhen",
      );
      await page.getByLabel("Evaluation name").fill("Release incident pilot");
      await page.getByLabel("Goal").fill("Reduce incident investigation time");
      await page.getByLabel("Requirements").fill("Private deployment and audit trail");
      await page.getByLabel("Risks and open questions").fill("Evidence completeness");
      await page.getByRole("button", { name: "Create evaluation" }).click();
      await expect(page).toHaveURL(/\/workspace\/evaluations\/[0-9a-f-]+$/);
      await expect(page.getByRole("heading", { level: 1, name: "Release incident pilot" })).toBeVisible();
      await expect(page.getByRole("link", { name: "RunWhen" })).toBeVisible();

      await page.getByLabel("Product").click();
      await page.getByRole("option", { name: "HolmesGPT" }).click();
      await page.getByRole("button", { name: "Add candidate" }).click();
      await expect(page.getByRole("link", { name: "HolmesGPT" })).toBeVisible();

      await page.getByLabel("Name").fill("Release incident pilot updated");
      await page.getByLabel("Decision").click();
      await page.getByRole("option", { name: "Advance to pilot" }).click();
      await page.getByRole("button", { name: "Save brief" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Release incident pilot updated" })).toBeVisible();

      await page.getByRole("button", { name: "Remove candidate" }).last().click();
      await expect(page.getByRole("link", { name: "HolmesGPT" })).toHaveCount(0);

      await page.getByRole("button", { name: "Delete evaluation" }).click();
      await page.getByRole("button", { name: "Delete permanently" }).click();
      await expect(page).toHaveURL("/workspace/evaluations");
      await expect(page.getByText("No evaluations yet", { exact: true })).toBeVisible();
    });
});
