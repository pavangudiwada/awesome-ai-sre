"use client";

import { useActionState } from "react";

import {
  subscribeNewsletterAction,
  type NewsletterActionState,
} from "@/actions/newsletter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type NewsletterSignupProps = {
  className?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

const newsletterInitialActionState: NewsletterActionState = {
  status: "idle",
  message: "",
};

export function NewsletterSignup({
  className,
  title = "AI SRE updates, without the noise",
  description = "A concise, editorially reviewed digest of releases and changes that matter to reliability teams.",
  compact = false,
}: NewsletterSignupProps) {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletterAction,
    newsletterInitialActionState,
  );

  return (
    <Card className={cn("w-full", compact && "shadow-none", className)}>
      <CardHeader className={cn(compact && "gap-1 pb-4 text-center")}>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup className={cn(compact && "gap-4")}>
            <Field className="sr-only !size-px" aria-hidden="true">
              <FieldLabel htmlFor="newsletter-website">Website</FieldLabel>
              <Input id="newsletter-website" name="website" tabIndex={-1} autoComplete="off" />
            </Field>
            <div className={cn("grid gap-3", compact && "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end")}>
              <Field>
                <FieldLabel htmlFor="newsletter-email" className={cn(compact && "sr-only")}>
                  Email
                </FieldLabel>
                <Input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Email address"
                  required
                  className="h-11"
                />
              </Field>
              {compact ? (
                <Button type="submit" size="lg" className="h-11" disabled={pending}>
                  {pending ? "Subscribing…" : "Subscribe"}
                </Button>
              ) : null}
            </div>
            {state.status !== "idle" ? (
              <Alert variant={state.status === "error" ? "destructive" : "default"}>
                <AlertDescription aria-live="polite">{state.message}</AlertDescription>
              </Alert>
            ) : null}
            {!compact ? (
              <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
                {pending ? "Saving preference…" : "Subscribe to the newsletter"}
              </Button>
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
