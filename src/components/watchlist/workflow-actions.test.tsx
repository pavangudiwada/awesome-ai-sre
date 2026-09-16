import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompanyFollowAction } from "./workflow-actions";

describe("CompanyFollowAction", () => {
  it("uses the server action's followed contract when toggling a company", () => {
    const { container } = render(
      <CompanyFollowAction
        companySlug="runwhen"
        companyName="RunWhen"
        following
        action={vi.fn()}
        privateWorkflowsAvailable
      />,
    );

    const followIntent = container.querySelector('input[name="followed"]');
    expect(followIntent).toHaveValue("false");
    expect(container.querySelector('input[name="following"]')).toBeNull();
  });

  it("keeps following visible but disabled for launch", () => {
    render(
      <CompanyFollowAction
        companySlug="runwhen"
        companyName="RunWhen"
        following={false}
        action={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Follow RunWhen — coming soon" }),
    ).toBeDisabled();
  });
});
