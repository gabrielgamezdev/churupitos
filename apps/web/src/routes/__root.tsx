import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { UpdatePrompt } from "@/features/pwa/update-prompt";
import { RequestBrakeBanner } from "@/features/request-brake/request-brake-banner";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <Outlet />
      <RequestBrakeBanner />
      <UpdatePrompt />
    </div>
  );
}
