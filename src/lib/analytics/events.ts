"use client";

import posthog from "posthog-js";
import { z } from "zod";

const publicPageSchema = z.object({
  kind: z.enum(["product", "company", "comparison", "resource", "update"]),
  slug: z.string().min(1).max(160),
});

const actionSchema = z.object({
  action: z.enum(["save", "follow", "note", "evaluation"]),
  surface: z.enum(["card", "profile", "workspace", "auth_resume"]),
});

function capture(event: string, properties: Record<string, string | number | boolean>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) return;
  posthog.capture(event, properties);
}

export function trackPublicPage(input: z.input<typeof publicPageSchema>) {
  const value = publicPageSchema.parse(input);
  capture("public_page_viewed", value);
}

export function trackWorkflowAction(input: z.input<typeof actionSchema>) {
  const value = actionSchema.parse(input);
  capture("workflow_action", value);
}

export function trackSearchResultBucket(count: number) {
  const bucket = count === 0 ? "0" : count <= 5 ? "1-5" : count <= 20 ? "6-20" : "21+";
  capture("catalog_search_completed", { result_bucket: bucket });
}
