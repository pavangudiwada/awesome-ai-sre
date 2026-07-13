"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ProductNoteEditor } from "@/components/watchlist";
import { upsertProductNoteAction } from "@/actions/workflows";

export function ConnectedProductNoteEditor({
  productSlug,
  productName,
  initialValue,
}: {
  productSlug: string;
  productName: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [lastSavedValue, setLastSavedValue] = useState(initialValue);
  const firstRender = useRef(true);

  function save() {
    if (value === lastSavedValue) return;
    const formData = new FormData();
    formData.set("productSlug", productSlug);
    formData.set("body", value);
    startTransition(async () => {
      try {
        await upsertProductNoteAction(formData);
        setLastSavedValue(value);
      } catch {
        toast.error("Your note could not be saved. Try again.");
      }
    });
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timeout = window.setTimeout(save, 900);
    return () => window.clearTimeout(timeout);
    // `save` intentionally follows the latest controlled value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <ProductNoteEditor
      productName={productName}
      value={value}
      onValueChange={setValue}
      onSave={save}
      saveStateLabel={
        isPending
          ? "Saving…"
          : value === lastSavedValue
            ? "Saved privately"
            : "Unsaved changes"
      }
      disabled={isPending}
    />
  );
}
