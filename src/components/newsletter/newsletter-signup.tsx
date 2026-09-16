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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type NewsletterSignupProps = {
  className?: string;
  title?: string;
  description?: string;
};

const newsletterInitialActionState: NewsletterActionState = {
  status: "idle",
  message: "",
};

export function NewsletterSignup({
  className,
  title = "AI SRE updates, without the noise",
  description = "A concise, editorially reviewed digest of releases and changes that matter to reliability teams.",
}: NewsletterSignupProps) {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletterAction,
    newsletterInitialActionState,
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field className="sr-only !size-px" aria-hidden="true">
              <FieldLabel htmlFor="newsletter-website">Website</FieldLabel>
              <Input id="newsletter-website" name="website" tabIndex={-1} autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="newsletter-email">Work email</FieldLabel>
              <Input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="newsletter-frequency">Send me updates</FieldLabel>
              <Select name="frequency" defaultValue="weekly" required>
                <SelectTrigger id="newsletter-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                    <SelectItem value="monthly">Monthly roundup</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="newsletter-consent" name="consent" required />
              <FieldContent>
                <FieldLabel htmlFor="newsletter-consent">
                  I agree to receive this newsletter and can unsubscribe at any time.
                </FieldLabel>
                <FieldDescription>
                  This is separate from any account, saved products, or company follows.
                </FieldDescription>
              </FieldContent>
            </Field>
            {state.status !== "idle" ? (
              <Alert variant={state.status === "error" ? "destructive" : "default"}>
                <AlertDescription aria-live="polite">{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
              {pending ? "Saving preference…" : "Subscribe to the newsletter"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
