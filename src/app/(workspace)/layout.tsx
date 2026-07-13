import type { ReactNode } from "react";

import { markUpdateReadAction } from "@/actions/workflows";
import { SiteHeader } from "@/components/watchlist";
import { getHeaderState } from "@/lib/presentation/header";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { viewer, notifications } = await getHeaderState();
  return (
    <>
      <SiteHeader
        viewer={viewer}
        notifications={notifications}
        markNotificationReadAction={markUpdateReadAction}
      />
      {children}
    </>
  );
}
