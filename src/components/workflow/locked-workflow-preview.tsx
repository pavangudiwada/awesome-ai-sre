import Link from "next/link";
import { FileTextIcon, FolderSearch2Icon, LockKeyholeIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export function LockedWorkflowPreview({ returnTo }: { returnTo: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Private evaluation workspace</CardTitle>
            <CardDescription>
              Public evidence stays visible. Sign in only when you want personal workflow.
            </CardDescription>
          </div>
          <Badge variant="outline">
            <LockKeyholeIcon />
            Private
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ItemGroup className="grid sm:grid-cols-2">
          <Item variant="muted" className="min-h-28 items-start">
            <ItemMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Product note</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Keep one auto-saved private note for questions and research context.
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item variant="muted" className="min-h-28 items-start">
            <ItemMedia variant="icon">
              <FolderSearch2Icon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Evaluation brief</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Capture your goal, requirements, risks, candidates, and decision.
              </ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>
            Sign in to use the workspace
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
