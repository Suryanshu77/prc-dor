import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ApprovalGate } from "@/components/ApprovalGate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user)
      throw redirect({ to: "/auth", search: { mode: "login" } });
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <ApprovalGate>
        <Outlet />
      </ApprovalGate>
    </AppShell>
  ),
});
