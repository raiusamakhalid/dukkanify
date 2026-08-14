import type { ReactNode } from "react";
import { requireSession } from "@/features/shell/require-session";

/**
 * The builder's own shell — which is to say, almost none.
 *
 * It exists so the builder can be a signed-in route *without* being inside the dashboard's
 * emerald rail. The builder is already three panes wide; a fourth column of navigation
 * beside them leaves the canvas too narrow to work in on a laptop, and the canvas is the
 * whole point of the screen.
 *
 * The guard is the same function the dashboard's layout calls, so the two groups cannot
 * drift apart on who is allowed in. `min-h-dvh` and nothing else: the page below owns its
 * own chrome.
 */
export default async function BuilderLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();

  return <div className="min-h-dvh">{children}</div>;
}
