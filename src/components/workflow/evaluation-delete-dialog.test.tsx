import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EvaluationDeleteDialog } from "./evaluation-delete-dialog";

describe("EvaluationDeleteDialog", () => {
  it("requires explicit accessible confirmation before deleting", async () => {
    const user = userEvent.setup();
    const deleteAction = vi.fn();

    render(
      <EvaluationDeleteDialog
        evaluationId="e84390dd-7d54-4f75-9dc2-2205eac60629"
        evaluationName="Incident AI pilot"
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete evaluation" }));

    expect(
      screen.getByRole("alertdialog", { name: "Delete Incident AI pilot?" }),
    ).toBeVisible();
    expect(screen.getByText(/Saved products and private product notes are not deleted/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Keep evaluation" }));
    expect(deleteAction).not.toHaveBeenCalled();
  });

  it("prevents duplicate actions and keeps failures visible without claiming deletion", async () => {
    const user = userEvent.setup();
    let rejectDelete: (reason: Error) => void = () => undefined;
    const deleteAction = vi.fn<(formData: FormData) => Promise<void>>(
      (formData) => {
        void formData;
        return new Promise<void>((_resolve, reject) => {
          rejectDelete = reject;
        });
      },
    );

    render(
      <EvaluationDeleteDialog
        evaluationId="e84390dd-7d54-4f75-9dc2-2205eac60629"
        evaluationName="Incident AI pilot"
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete evaluation" }));
    await user.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(deleteAction).toHaveBeenCalledTimes(1);
    expect(deleteAction.mock.calls[0][0]).toBeInstanceOf(FormData);
    expect(deleteAction.mock.calls[0][0].get("evaluationId")).toBe(
      "e84390dd-7d54-4f75-9dc2-2205eac60629",
    );
    expect(screen.getByRole("button", { name: "Deleting evaluation…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep evaluation" })).toBeDisabled();

    await act(async () => {
      rejectDelete(new Error("database unavailable"));
    });

    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Evaluation not deleted");
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was removed");
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeEnabled();
  });
});
