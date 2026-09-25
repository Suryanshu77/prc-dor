import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Database } from "@/integrations/supabase/types";

type AdminNotification = Database["public"]["Tables"]["admin_notifications"]["Row"];

interface ProfileMeta {
  id: string;
  full_name: string;
  nickname: string | null;
  profile_image: string | null;
}

type EnrichedNotification = AdminNotification & { profile?: ProfileMeta };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminNotifications() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const notifsQ = useQuery({
    queryKey: ["admin-notifications"],
    enabled: isAdmin,
    queryFn: async (): Promise<EnrichedNotification[]> => {
      const { data: notifs } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      const list = (notifs ?? []) as AdminNotification[];
      const ids = [...new Set(list.map((n) => n.user_id))];
      let profileMap = new Map<string, ProfileMeta>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, nickname, profile_image")
          .in("id", ids);
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileMeta]));
      }
      return list.map((n) => ({ ...n, profile: profileMap.get(n.user_id) }));
    },
  });

  const notifications = notifsQ.data ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, qc]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function openNotification(n: AdminNotification) {
    if (!n.read_at) {
      await supabase
        .from("admin_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    }
    setOpen(false);
    navigate({ to: "/players/$id", params: { id: n.user_id } });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-colors hover:bg-gold/20"
        aria-label="Admin notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl glass-strong shadow-glow">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <Bell className="h-3 w-3" />
              Notifications
            </div>
            {unread > 0 && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                {unread} new
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No new registrations yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-accent",
                    !n.read_at && "bg-gold/5",
                  )}
                >
                  {n.profile ? (
                    <PlayerAvatar
                      path={n.profile.profile_image}
                      name={n.profile.full_name || n.message}
                      className="h-9 w-9 shrink-0"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-gold">
                      <UserPlus className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{n.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{n.message}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}