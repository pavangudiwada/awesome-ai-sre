import { describe, expect, it } from "vitest";

import { deterministicQueue, parseGitHubReleaseAtom } from "./collect-release-candidates";

const source = {
  productSlug: "k8sgpt",
  feedUrl: "https://github.com/k8sgpt-ai/k8sgpt/releases.atom",
};

describe("review release candidate collection", () => {
  it("sanitizes Atom entries, accepts only GitHub links, and produces stable IDs", () => {
    const parsed = parseGitHubReleaseAtom(
      source,
      `<feed><entry><id>tag:github.com,2008:Repository/1/v1.2.3</id><title> v1.2.3 </title><published>2026-09-16T10:00:00Z</published><link href="https://github.com/k8sgpt-ai/k8sgpt/releases/tag/v1.2.3"/><content type="html"><![CDATA[<p>Fix <strong>reliability</strong></p><script>alert(1)</script>]]></content></entry><entry><id>bad</id><title>Bad</title><updated>2026-09-16T10:00:00Z</updated><link href="https://example.com/not-allowed"/></entry></feed>`,
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      productSlug: "k8sgpt",
      title: "v1.2.3",
      summary: "Fix reliability",
    });
    expect(parsed[0]?.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deduplicates and orders queues without a timestamp diff", () => {
    const item = parseGitHubReleaseAtom(
      source,
      `<feed><entry><id>one</id><title>One</title><updated>2026-09-16T10:00:00Z</updated><link href="https://github.com/k8sgpt-ai/k8sgpt/releases/tag/one"/></entry></feed>`,
    )[0]!;
    expect(deterministicQueue([item, item])).toEqual({
      schemaVersion: 1,
      generatedAt: null,
      items: [item],
    });
  });
});
