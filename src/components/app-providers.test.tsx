import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppProviders } from "./app-providers";

describe("AppProviders", () => {
  afterEach(() => {
    delete document.documentElement.dataset.appHydrated;
  });

  it("exposes a deterministic readiness signal after client hydration", async () => {
    render(
      <AppProviders>
        <main>Ready</main>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.appHydrated).toBe("true");
    });
  });
});
