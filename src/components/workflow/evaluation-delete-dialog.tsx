"use client";

import { useState, useTransition } from "react";
import { CircleAlertIcon, Trash2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface EvaluationDeleteDialogProps {
  evaluationId: string;
  evaluationName: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
}

export function EvaluationDeleteDialog({
  evaluationId,
  evaluationName,
  deleteAction,
}: EvaluationDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) setErrorMessage(undefined);
  }

  function deleteEvaluation() {
    setErrorMessage(undefined);
    const formData = new FormData();
    formData.set("evaluationId", evaluationId);

    startTransition(async () => {
      try {
        await deleteAction(formData);
        setOpen(false);
      } catch {
        setErrorMessage(
          "The evaluation could not be deleted. Nothing was removed. Try again.",
        );
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="h-11 w-full">
          <Trash2Icon data-icon="inline-start" />
          Delete evaluation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {evaluationName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the evaluation brief and its candidate set. Saved
            products and private product notes are not deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Evaluation not deleted</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={isPending}>
            Keep evaluation
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            className="h-11"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              deleteEvaluation();
            }}
          >
            {isPending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            {isPending ? "Deleting evaluation…" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
