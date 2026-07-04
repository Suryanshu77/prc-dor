import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Vote,
  Trophy,
  Users,
  UserSquare2,
  BarChart3,
  Settings,
  FolderKanban,
} from "lucide-react";

const menu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
];

export default function AdminSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <aside className="w-72 border-r border-border bg-card/40 backdrop-blur-xl min-h-screen">
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-gold">
          PRC D'OR
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Admin Control Panel
        </p>
      </div>

      <nav className="px-4 space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;

          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all
              ${
                active
                  ? "bg-gold text-black font-semibold"
                  : "hover:bg-accent"
              }`}
            >
              <Icon size={18} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}