import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  Home,
  Users,
  Vote,
  Trophy,
  BarChart3,
  Crown,
  Shield,
  LogOut,
  UserCircle2,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/players", label: "Players", icon: Users },
  { to: "/vote", label: "Vote", icon: Vote },
  { to: "/results", label: "Results", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/hall-of-fame", label: "Hall of Fame", icon: Crown },
  { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; profile_image?: string };
  const displayName = meta.full_name ?? user?.email ?? "Player";

  const visible = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform glass-strong border-r transition-transform md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col p-5">
          <Link to="/dashboard" className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg text-gold-gradient">PRC D'or</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Football Awards
              </div>
            </div>
          </Link>

          <nav className="flex-1 space-y-1">
            {visible.map((item) => {
              const Icon = item.icon;
              const active = router.state.location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-accent text-accent-foreground shadow-[inset_0_0_0_1px_var(--gold)]"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-border/50 pt-4">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary"
            >
              <PlayerAvatar path={meta.profile_image} name={displayName} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{displayName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {isAdmin ? "Administrator" : "Player"}
                </div>
              </div>
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-border/50 glass-strong px-4 py-3 md:hidden">
        <button onClick={() => setOpen((o) => !o)} className="rounded-md p-2 hover:bg-secondary">
          <Menu className="h-5 w-5" />
        </button>
        <div className="font-display text-base text-gold-gradient">PRC D'or</div>
        <PlayerAvatar path={meta.profile_image} name={displayName} className="h-8 w-8" />
      </header>

      <main className="flex-1 px-4 pb-12 pt-20 md:px-10 md:pt-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
