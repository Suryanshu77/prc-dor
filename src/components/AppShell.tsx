import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/use-profile";
import {
  Home,
  Users,
  Vote,
  Trophy,
  BarChart3,
  Crown,
  Gamepad2,
  Shield,
  LogOut,
  UserCircle2,
  Menu,
  ChevronDown,
  Pencil,
  Award,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { CountdownWidget } from "@/components/CountdownWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  { to: "/vote-special", label: "Special Awards", icon: Award },
  { to: "/results", label: "Results", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/hall-of-fame", label: "Hall of Fame", icon: Crown },
  { to: "/game", label: "Game", icon: Gamepad2 },
  { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  { to: "/the-creator", label: "The Creator", icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const profileQ = useProfile();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const profile = profileQ.data;
  const displayName =
    profile?.nickname ||
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Player";

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
              <div className="font-display text-lg text-gold-gradient">
                PRC D'or
              </div>
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
            {!user ? (
              <Link
                to="/auth"
                search={{ mode: "login" }}
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-gradient px-3 py-2.5 text-sm font-medium text-background shadow-gold transition hover:opacity-90"
              >
                <LogOut className="h-4 w-4" />
                Sign in
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary"
                  >
                    <PlayerAvatar
                      path={profile?.profile_image}
                      name={displayName}
                      className="h-9 w-9"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {displayName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {isAdmin ? "Administrator" : "Player"}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  className="w-56"
                >
                  <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
                  <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild onClick={() => setOpen(false)}>
                    <Link to="/profile">
                      <UserCircle2 /> View profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild onClick={() => setOpen(false)}>
                    <Link to="/profile" search={{ edit: true }}>
                      <Pencil /> Edit profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-border/50 glass-strong px-4 py-3 md:hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-2 hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="font-display text-base text-gold-gradient">
          PRC D'or
        </div>
        {!user ? (
          <Link
            to="/auth"
            search={{ mode: "login" }}
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-gold"
          >
            Sign in
          </Link>
        ) : (
          <Link to="/profile" onClick={() => setOpen(false)}>
            <PlayerAvatar
              path={profile?.profile_image}
              name={displayName}
              className="h-8 w-8"
            />
          </Link>
        )}
      </header>

      {/* Content column: slim countdown bar sits above every authenticated page */}
      <div className="flex min-w-0 flex-1 flex-col pt-20 md:pt-0">
        <div className="flex items-center justify-end border-b border-border/40 px-4 py-2 md:px-10 md:py-3">
          <CountdownWidget />
        </div>
        {/* pb-28 keeps the last row of content clear of the floating player */}
        <main className="flex-1 px-4 pb-28 pt-3 md:px-10 md:pt-3">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
