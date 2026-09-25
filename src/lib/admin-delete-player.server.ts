import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DELETE_PLAYER_ENDPOINT =
  "https://prc-dor-gold.lovable.app/api/admin/delete-player";

const deletePlayerSchema = z.object({
  targetId: z.string().uuid(),
});

async function endpointErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const json = JSON.parse(raw);
    if (typeof json === "string") return json;
    return json?.error ?? json?.message ?? raw;
  } catch {
    return raw || `Request failed with status ${response.status}`;
  }
}

export const deletePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(deletePlayerSchema)
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const targetId = data.targetId;

    if (targetId === userId) {
      throw new Error("You cannot delete your own account.");
    }

    const { data: requesterRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!(requesterRoles ?? []).some((r) => r.role === "admin")) {
      throw new Error("You do not have permission to delete players.");
    }

    const { data: targetRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetId);

    if ((targetRoles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Administrator accounts cannot be deleted.");
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    const response = await fetch(DELETE_PLAYER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetId }),
    });

    if (!response.ok) {
      throw new Error(await endpointErrorMessage(response));
    }

    return { ok: true as const, targetId };
  });