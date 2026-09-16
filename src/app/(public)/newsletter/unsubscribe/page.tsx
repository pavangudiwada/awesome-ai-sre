import { unsubscribeNewsletterAction } from "@/actions/newsletter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const { status, token } = await searchParams;
  if (status === "done") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Alert>
          <AlertTitle>Newsletter preference updated</AlertTitle>
          <AlertDescription>
            If this link belonged to an active subscription, it is now unsubscribed.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Unsubscribe from AI SRE Watchlist updates</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={unsubscribeNewsletterAction}>
            <input type="hidden" name="token" value={token ?? ""} />
            <Button type="submit" variant="outline" className="h-11">
              Unsubscribe
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
