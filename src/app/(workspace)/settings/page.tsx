import type { Metadata } from "next";

import { updateProfileAction } from "@/actions/workflows";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getPractitionerProfile } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const { profile, email } = await getPractitionerProfile();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Basic practitioner context for your private workspace.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This information is not included in company-facing analytics.</CardDescription>
        </CardHeader>
        <form action={updateProfileAction}>
          <CardContent>
            <FieldGroup>
              <Field data-disabled>
                <FieldLabel htmlFor="settings-email">Email</FieldLabel>
                <Input id="settings-email" value={email} disabled readOnly />
                <FieldDescription>Managed by your sign-in provider.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-name">Display name</FieldLabel>
                <Input id="settings-name" name="displayName" defaultValue={profile?.display_name ?? ""} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-role">Role</FieldLabel>
                <Input id="settings-role" name="role" defaultValue={profile?.role ?? ""} placeholder="SRE lead" />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-organization">Organization</FieldLabel>
                <Input id="settings-organization" name="organization" defaultValue={profile?.organization ?? ""} />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" size="lg" className="h-11">Save profile</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
