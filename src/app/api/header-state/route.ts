import { NextResponse } from "next/server";

import { getHeaderState } from "@/lib/presentation/header";

export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET() {
  try {
    const state = await getHeaderState();
    return NextResponse.json(
      {
        viewer: state.viewer
          ? {
              displayName: state.viewer.displayName,
              email: state.viewer.email,
              avatarUrl: state.viewer.avatarUrl,
              workspaceHref: state.viewer.workspaceHref,
              settingsHref: state.viewer.settingsHref,
            }
          : null,
        notifications: state.notifications,
      },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "Header state is temporarily unavailable" },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
