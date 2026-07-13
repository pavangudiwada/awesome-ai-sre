"use client";

import posthog from "posthog-js";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.appHydrated = "true";

    return () => {
      delete document.documentElement.dataset.appHydrated;
    };
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      person_profiles: "never",
      persistence: "memory",
    });
  }, []);

  return (
    <TooltipProvider>
      {children}
      <Toaster richColors closeButton />
    </TooltipProvider>
  );
}
