import { afterEach, describe, expect, it, vi } from "vitest";

import { trackProductShare } from "./event-beacon";

describe("product share analytics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends only the aggregate product subject", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 202 })));
    vi.stubGlobal("fetch", fetchMock);

    trackProductShare("holmesgpt");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "share",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
      }),
      credentials: "same-origin",
      keepalive: true,
    });
  });
});
