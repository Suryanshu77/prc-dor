import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { toast } from "sonner";

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Striker"];

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your profile — PRC D'or" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (profileQ.data) setForm(profileQ.data);
  }, [profileQ.data]);

  if (!form) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  async function save() {
    setBusy(true);
    let imagePath = form.profile_image;
    if (photo) {
      const ext = photo.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, photo, { upsert: true, contentType: photo.type });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      imagePath = path;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        nickname: form.nickname,
        age: form.age,
        position: form.position,
        jersey_number: form.jersey_number,
        profile_image: imagePath,
      })
      .eq("id", user!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["players"] });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-3xl">Your profile</h1>
        <p className="text-muted-foreground">Update how you appear in the PRC D'or directory.</p>
      </header>

      <div className="glass-strong rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <PlayerAvatar path={form.profile_image} name={form.full_name} className="h-20 w-20" ring />
          <div>
            <Label className="text-xs">Replace photo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <Row label="Full name">
            <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Row>
          <Row label="Nickname">
            <Input value={form.nickname ?? ""} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Age">
              <Input
                type="number"
                value={form.age ?? ""}
                onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })}
              />
            </Row>
            <Row label="Jersey #">
              <Input
                type="number"
                value={form.jersey_number ?? ""}
                onChange={(e) =>
                  setForm({ ...form, jersey_number: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Row>
          </div>
          <Row label="Position">
            <Select
              value={form.position ?? ""}
              onValueChange={(v) => setForm({ ...form, position: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </div>

        <Button
          onClick={save}
          disabled={busy}
          className="mt-6 w-full bg-gold-gradient text-background hover:opacity-90"
        >
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
