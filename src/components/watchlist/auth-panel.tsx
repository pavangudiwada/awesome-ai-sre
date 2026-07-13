import type { ReactNode } from "react"
import Link from "next/link"
import { CheckCircle2Icon, MailIcon, ShieldCheckIcon } from "lucide-react"

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
    title: "Keep a focused shortlist",
    description: "Save products you want to revisit without following their company.",
  },
  {
    title: "Run structured evaluations",
    description: "Group serious candidates and record goals, requirements, risks, and a decision.",
  },
  {
    title: "Write private product notes",
    description: "Keep research context attached to the product profile where you found it.",
  },
  {
    title: "Follow company updates",
    description: "Receive reviewed Watchlist updates only for companies you explicitly follow.",
  },
]

interface AuthPanelProps {
  magicLinkAction: ServerFormAction
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
  title = "Your reliability research, in one place.",
  description = "Sign in to build a private evaluation workspace. Public evidence stays public.",
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
    <main className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-2">
      <section className="flex items-center border-b bg-muted/40 px-4 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-primary">Practitioner workspace</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2" aria-label="Account benefits">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex items-start gap-3">
                {benefit.icon ?? (
                  <CheckCircle2Icon
                    className="mt-0.5 size-5 shrink-0 text-primary"
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

          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>Your notes and evaluation work stay private</AlertTitle>
            <AlertDescription>
              Company-facing analytics never expose saves, evaluations, or note contents.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section className="flex items-center px-4 py-10 sm:px-8 lg:px-12" aria-label="Sign in">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to AI SRE Watchlist</CardTitle>
            <CardDescription>
              Continue with a provider or receive a secure email link. No password required.
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

              {hasOAuth ? <FieldSeparator>or use email</FieldSeparator> : null}

              <form action={magicLinkAction}>
                {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="auth-email">Work email</FieldLabel>
                    <Input
                      id="auth-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@company.com"
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
              </form>
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
