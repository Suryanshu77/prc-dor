import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Every profile column except `email` (private: read via the auth session or
// the admin-only RPC, never through the shared profiles table select).
// Shared by every query keyed ["profile", <id>] so the React Query cache
// never receives a row shape missing fields a consumer relies on.
export const PROFILE_COLUMNS =
  "id, full_name, nickname, age, position, jersey_number, profile_image, bio, social_handle, created_at, updated_at";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[profile] failed to load own profile", error);
        toast.error("Couldn't load your profile.", { id: "profile-load" });
      }
      return data;
    },
  });
}
