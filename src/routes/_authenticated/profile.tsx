import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { toast } from "sonner";
import { AtSign, Hash, Mail, Pencil } from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Position = Database["public"]["Enums"]["player_position"];

const POSITIONS: Position[] = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Winger",
  "Striker",
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const searchSchema = z.object({
  edit: z.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/profile")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Your profile — PRC D'or" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profileQ = useProfile();

  const [form, setForm] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    if (profileQ.data) {
      setForm(profileQ.data);
      setPhoto(null);
      setPhotoPreview(null);
      setRemovePhoto(false);
    }
  }, [profileQ.data]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  if (profileQ.isLoading && !form) {
    return (
      <div className="py-20 text-center text-muted-foreground">Loading…</div>
    );
  }
  if (!form)
    return (
      <div className="py-20 text-center text-muted-foreground">
        Couldn&apos;t load your profile.
      </div>
    );

  const name = form.nickname || form.full_name || "Player";

  function pickPhoto(file: File | null) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  }

  async function save() {
    if (!form || !user) return;
    if (form.full_name.trim().length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }
    if (form.bio && form.bio.trim().length > 300) {
      toast.error("Bio must be under 300 characters.");
      return;
    }
    if (form.social_handle && form.social_handle.trim().length > 60) {
      toast.error("Social handle must be under 60 characters.");
      return;
    }

    setBusy(true);
    let imagePath = form.profile_image;
    if (removePhoto) {
      const current = form.profile_image;
      if (current && !current.startsWith("http")) {
        await supabase.storage.from("avatars").remove([current]);
      }
      imagePath = null;
    } else if (photo) {
      const path = `${user.id}/avatar.${photoExt(photo)}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, photo, {
          upsert: true,
          contentType: photo.type,
        });
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
      const current = form.profile_image;
      if (current && !current.startsWith("http") && current !== path) {
        await supabase.storage.from("avatars").remove([current]);
      }
      imagePath = path;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        nickname: form.nickname?.trim() || null,
        age: form.age ?? null,
        position: form.position ?? null,
        jersey_number: form.jersey_number ?? null,
        bio: form.bio?.trim() || null,
        social_handle: form.social_handle?.trim() || null,
        profile_image: imagePath,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["players"] });
    navigate({ to: "/profile" });
  }

  if (edit) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="font-display text-3xl">Edit profile</h1>
          <p className="text-muted-foreground">
            Update how you appear across PRC D'or.
          </p>
        </header>

        <div className="glass-strong rounded-2xl p-6">
          <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="New profile photo preview"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-background"
              />
            ) : (
              <PlayerAvatar
                path={form.profile_image}
                name={name}
                className="h-20 w-20"
                ring
              />
            )}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <label htmlFor="photo-input" className="cursor-pointer">
                    Change photo
                  </label>
                </Button>
                {!removePhoto && form.profile_image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                      setRemovePhoto(true);
                    }}
                  >
                    Remove photo
                  </Button>
                )}
              </div>
              <Input
                id="photo-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
              />
              {photo && (
                <div className="text-xs text-muted-foreground">
                  {photo.name} · {(photo.size / (1024 * 1024)).toFixed(1)} MB —
                  save to apply
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Full name">
                <Input
                  value={form.full_name ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                />
              </Row>
              <Row label="Display name / nickname">
                <Input
                  value={form.nickname ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, nickname: e.target.value })
                  }
                  placeholder="optional"
                />
              </Row>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Jersey number">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={form.jersey_number ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jersey_number: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  placeholder="optional"
                />
              </Row>
              <Row label="Age">
                <Input
                  type="number"
                  min={8}
                  max={80}
                  value={form.age ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      age: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Row>
            </div>
            <Row label="Position">
              <Select
                value={form.position ?? ""}
                onValueChange={(v) =>
                  setForm({ ...form, position: v as Position })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
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
            <Row label="Bio">
              <Textarea
                rows={3}
                value={form.bio ?? ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="A short line about you…"
              />
            </Row>
            <Row label="Social handle">
              <Input
                value={form.social_handle ?? ""}
                onChange={(e) =>
                  setForm({ ...form, social_handle: e.target.value })
                }
                placeholder="@username"
              />
            </Row>
            <Row label="Email">
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email is managed by your account and can&apos;t be changed here.
              </p>
            </Row>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/profile" })}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              className="bg-gold-gradient text-background hover:opacity-90"
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl">Profile</h1>
        <p className="text-muted-foreground">Your PRC D'or identity.</p>
      </header>

      <div className="glass-strong rounded-2xl p-6 md:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <PlayerAvatar
            path={form.profile_image}
            name={name}
            className="h-24 w-24"
            ring
          />
          <div className="w-full flex-1 text-center sm:text-left">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">
              PRC D'or Player
            </div>
            <h2 className="mt-1 font-display text-3xl">{form.full_name}</h2>
            {form.nickname && (
              <div className="mt-1 text-muted-foreground">
                "{form.nickname}"
              </div>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {form.position && (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                  {form.position}
                </span>
              )}
              {form.jersey_number && (
                <span className="rounded-full bg-gold-gradient px-2.5 py-1 text-xs font-medium text-background">
                  #{form.jersey_number}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: "/profile", search: { edit: true } })}
            className="w-full bg-gold-gradient text-background hover:opacity-90 sm:w-auto"
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit profile
          </Button>
        </div>

        {form.bio && (
          <p className="mt-6 border-t border-border/50 pt-6 text-sm leading-relaxed text-muted-foreground">
            {form.bio}
          </p>
        )}

        <dl className="mt-6 grid gap-4 border-t border-border/50 pt-6 sm:grid-cols-2">
          <InfoRow label="Full name">{form.full_name}</InfoRow>
          <InfoRow label="Display name / nickname">
            {form.nickname || "—"}
          </InfoRow>
          <InfoRow label="Jersey number" icon={Hash}>
            {form.jersey_number ? `#${form.jersey_number}` : "—"}
          </InfoRow>
          <InfoRow label="Position">{form.position || "—"}</InfoRow>
          <InfoRow label="Social handle" icon={AtSign}>
            {(form.social_handle || "").startsWith("@")
              ? form.social_handle
              : form.social_handle || "—"}
          </InfoRow>
          <InfoRow label="Email" icon={Mail}>
            {user?.email || "—"}
          </InfoRow>
        </dl>
      </div>
    </div>
  );
}

function photoExt(file: File) {
  const m = file.name.match(/\.([a-z0-9]+)$/i);
  const ext = (m?.[1] ?? file.type.split("/")[1] ?? "jpg").toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof Hash;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />}
      <div>
        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
