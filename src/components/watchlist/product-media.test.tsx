import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: ({
      alt,
      loading,
      preload,
    }: {
      alt: string;
      loading?: "eager" | "lazy";
      preload?: boolean;
    }) => createElement("span", {
      "aria-label": alt,
      "data-loading": loading ?? "browser-default",
      "data-preload": String(Boolean(preload)),
      role: "img",
    }),
  };
});

import { ProductMedia } from "./product-media";

describe("ProductMedia", () => {
  it("preloads above-the-fold profile media with eager loading", () => {
    render(<ProductMedia name="RunWhen" src="/screenshots/runwhen.png" preload />);

    const image = screen.getByRole("img", { name: "RunWhen product preview" });
    expect(image).toHaveAttribute("data-preload", "true");
    expect(image).toHaveAttribute("data-loading", "eager");
  });

  it("keeps non-priority catalog media lazy", () => {
    render(<ProductMedia name="RunWhen" src="/screenshots/runwhen.png" />);

    const image = screen.getByRole("img", { name: "RunWhen product preview" });
    expect(image).toHaveAttribute("data-preload", "false");
    expect(image).toHaveAttribute("data-loading", "lazy");
  });
});
