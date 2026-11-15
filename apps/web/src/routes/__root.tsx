import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

import { UpdatePrompt } from "@/features/pwa/update-prompt";
import { RequestBrakeBanner } from "@/features/request-brake/request-brake-banner";
import { releaseFocusWhenHidden } from "@/lib/release-focus-when-hidden";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => releaseFocusWhenHidden(), []);
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <Outlet />
      <RequestBrakeBanner />
      <UpdatePrompt />
    </div>
  );
}
