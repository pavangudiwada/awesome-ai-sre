import type { ReactNode } from "react"
import Link from "next/link"
import { CheckIcon, MailIcon, ShieldCheckIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { AuthBenefit, ServerFormAction } from "./types"

const DEFAULT_BENEFITS: AuthBenefit[] = [
  {
    title: "Save products for later",
    description: "Keep a simple shortlist as you browse.",
  },
  {
    title: "Add private notes",
    description: "Keep your research context next to each product.",
  },
  {
    title: "Compare serious candidates",
    description: "Organize products into a structured evaluation when you need one.",
  },
]

interface AuthPanelProps {
  magicLinkAction?: ServerFormAction
  googleAction?: ServerFormAction
  githubAction?: ServerFormAction
  benefits?: AuthBenefit[]
  title?: string
  description?: string
  nextPath?: string
  emailDefaultValue?: string
  errorMessage?: string
  successMessage?: string
  googleIcon?: ReactNode
  githubIcon?: ReactNode
  termsHref?: string
  privacyHref?: string
}

export function AuthPanel({
  magicLinkAction,
  googleAction,
  githubAction,
  benefits = DEFAULT_BENEFITS,
  title = "Save your research when you’re ready.",
  description = "You can browse every product and source without an account. Sign in only when you want a private place to keep your work.",
  nextPath,
  emailDefaultValue,
  errorMessage,
  successMessage,
  googleIcon,
  githubIcon,
  termsHref = "/terms",
  privacyHref = "/privacy",
}: AuthPanelProps) {
  const hasOAuth = Boolean(googleAction || githubAction)

  return (
    <main className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="order-2 flex items-center border-t bg-muted/30 px-4 py-10 sm:px-8 lg:order-1 lg:border-r lg:border-t-0 lg:px-12">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-7">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-primary">Practitioner workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>

          <ul className="flex flex-col gap-4" aria-label="Account benefits">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex items-start gap-3">
                {benefit.icon ?? (
                  <CheckIcon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{benefit.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <Alert className="bg-background">
            <ShieldCheckIcon />
            <AlertTitle>Your workspace stays private</AlertTitle>
            <AlertDescription>
              Companies never see your saves, evaluations, or note contents.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section className="order-1 flex items-center px-4 py-10 sm:px-8 lg:order-2 lg:px-12" aria-label="Sign in">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>
              Sign in or create your workspace
            </CardTitle>
            <CardDescription>
              {magicLinkAction
                ? "Use a provider or a secure email link. No password required."
                : "Use a configured provider. No password required."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FieldGroup>
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign-in failed</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
              {successMessage ? (
                <Alert>
                  <MailIcon />
                  <AlertTitle>Check your email</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              ) : null}

              {hasOAuth ? (
                <FieldSet>
                  <FieldLegend className="sr-only">Sign-in providers</FieldLegend>
                  <FieldGroup className="grid gap-3 sm:grid-cols-2">
                    {googleAction ? (
                      <form action={googleAction}>
                        {nextPath ? (
                          <input type="hidden" name="next" value={nextPath} />
                        ) : null}
                        <FieldGroup>
                          <Field>
                            <Button
                              type="submit"
                              variant="outline"
                              size="lg"
                              className="h-11 w-full"
                            >
                              {googleIcon}
                              Continue with Google
                            </Button>
                          </Field>
                        </FieldGroup>
                      </form>
                    ) : null}
                    {githubAction ? (
                      <form action={githubAction}>
                        {nextPath ? (
                          <input type="hidden" name="next" value={nextPath} />
                        ) : null}
                        <FieldGroup>
                          <Field>
                            <Button
                              type="submit"
                              variant="outline"
                              size="lg"
                              className="h-11 w-full"
                            >
                              {githubIcon}
                              Continue with GitHub
                            </Button>
                          </Field>
                        </FieldGroup>
                      </form>
                    ) : null}
                  </FieldGroup>
                </FieldSet>
              ) : null}

              {hasOAuth && magicLinkAction ? <FieldSeparator>or use email</FieldSeparator> : null}

              {magicLinkAction ? <form action={magicLinkAction}>
                {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="auth-email">Email address</FieldLabel>
                    <Input
                      id="auth-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      defaultValue={emailDefaultValue}
                      required
                    />
                    <FieldDescription>
                      We will send a one-time sign-in link to this address.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <Button type="submit" size="lg" className="h-11 w-full">
                      <MailIcon data-icon="inline-start" />
                      Email me a sign-in link
                    </Button>
                  </Field>
                </FieldGroup>
              </form> : (
                <Alert>
                  <MailIcon />
                  <AlertTitle>Email sign-in is not available yet</AlertTitle>
                  <AlertDescription>Use a configured provider, or check back after email delivery is enabled.</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>

          <CardFooter>
            <p className="text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to the{" "}
              <Link href={termsHref} className="underline underline-offset-4 hover:text-foreground">
                Terms
              </Link>{" "}
              and acknowledge the{" "}
              <Link href={privacyHref} className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  )
}
