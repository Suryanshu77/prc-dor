import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/use-profile";
import { avatarFileError, useSignedUrl } from "@/lib/avatars";
import {
  FAVOURITE_MOMENT_MAX,
  FOOTBALL_CLUBS,
  FOOTBALL_LEAGUES,
  FOOTBALL_NATIONS,
  FOOTBALL_PLAYERS,
} from "@/lib/football-data";
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
import { Combobox, ComboboxField } from "@/components/ui/combobox";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { FollowRequestsPanel } from "@/components/profile/FollowRequestsPanel";
import { toast } from "sonner";
import {
  AtSign,
  Calendar,
  Flag,
  Hash,
  Image as ImageIcon,
  Mail,
  Pencil,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
// Profile queries never select `email` (private); the form renders the
// account email from the auth session instead (see Email rows below).
type ProfileForm = Omit<Profile, "email">;
type Position = Database["public"]["Enums"]["player_position"];

const POSITIONS: Position[] = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Winger",
  "Striker",
];

// Mirrors the profiles_username_format CHECK and the normalize trigger, so
// an invalid handle is stopped in the form instead of by a database error.
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const USERNAME_HINT = "3–24 characters: a–z, 0–9 and underscores.";

function normalizeUsername(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

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

  const [form, setForm] = useState<ProfileForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  const bannerUrl = useSignedUrl(form?.banner_image);

  useEffect(() => {
    if (profileQ.data) {
      setForm(profileQ.data);
      setPhoto(null);
      setPhotoPreview(null);
      setRemovePhoto(false);
      setBanner(null);
      setBannerPreview(null);
      setRemoveBanner(false);
    }
  }, [profileQ.data]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [photoPreview, bannerPreview]);

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
    const invalid = avatarFileError(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  }

  function pickBanner(file: File | null) {
    if (!file) return;
    const invalid = avatarFileError(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBanner(file);
    setBannerPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  }

  async function save() {
    if (!form || !user) return;
    if (form.full_name.trim().length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }
    const username = normalizeUsername(form.username ?? "");
    if (!USERNAME_RE.test(username)) {
      toast.error(`Username must match ${USERNAME_HINT}`);
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
    if (
      form.favourite_moment &&
      form.favourite_moment.length > FAVOURITE_MOMENT_MAX
    ) {
      toast.error(
        `Favourite moment must be under ${FAVOURITE_MOMENT_MAX} characters.`,
      );
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

    // Banner lives in the same private `avatars` bucket under a distinct
    // file name so it never collides with the avatar object.
    let bannerPath = form.banner_image;
    if (removeBanner) {
      const current = form.banner_image;
      if (current && !current.startsWith("http")) {
        await supabase.storage.from("avatars").remove([current]);
      }
      bannerPath = null;
    } else if (banner) {
      const path = `${user.id}/banner.${photoExt(banner)}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, banner, {
          upsert: true,
          contentType: banner.type,
        });
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
      const current = form.banner_image;
      if (current && !current.startsWith("http") && current !== path) {
        await supabase.storage.from("avatars").remove([current]);
      }
      bannerPath = path;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        username,
        nickname: form.nickname?.trim() || null,
        age: form.age ?? null,
        position: form.position ?? null,
        jersey_number: form.jersey_number ?? null,
        bio: form.bio?.trim() || null,
        social_handle: form.social_handle?.trim() || null,
        profile_image: imagePath,
        banner_image: bannerPath,
        favourite_club: form.favourite_club?.trim() || null,
        favourite_player: form.favourite_player?.trim() || null,
        favourite_national_team: form.favourite_national_team?.trim() || null,
        favourite_league: form.favourite_league?.trim() || null,
        favourite_moment: form.favourite_moment?.trim() || null,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) {
      // 23505 = unique_violation on lower(username).
      if (error.code === "23505") {
        toast.error("That username is already taken.");
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["follow-state"] });
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

          <div className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-56">
                {!removeBanner && (bannerPreview || bannerUrl) && (
                  <img
                    src={bannerPreview ?? bannerUrl ?? ""}
                    alt="Profile banner preview"
                    className="h-full w-full object-cover"
                  />
                )}
                {removeBanner || (!bannerPreview && !bannerUrl) ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {removeBanner ? "Banner will be removed" : "No banner yet"}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label htmlFor="banner-input" className="cursor-pointer">
                      <ImageIcon className="mr-2 h-4 w-4" /> Change banner
                    </label>
                  </Button>
                  {!removeBanner && form.banner_image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setBanner(null);
                        setBannerPreview(null);
                        setRemoveBanner(true);
                      }}
                    >
                      Remove banner
                    </Button>
                  )}
                </div>
                <Input
                  id="banner-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => pickBanner(e.target.files?.[0] ?? null)}
                />
                {banner && (
                  <div className="text-xs text-muted-foreground">
                    {banner.name} · {(banner.size / (1024 * 1024)).toFixed(1)}{" "}
                    MB — save to apply
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Shown behind your header. JPG, PNG or WebP, up to 5 MB.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border/50 pt-6">
            <Row label="Username">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={form.username ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: normalizeUsername(e.target.value),
                    })
                  }
                  placeholder="e.g. ronaldo_7"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={24}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {USERNAME_HINT} This is the link to your public profile.
              </p>
            </Row>

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

            <div className="grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2">
              <ComboboxField label="Favourite club">
                <Combobox
                  value={form.favourite_club}
                  onChange={(v) => setForm({ ...form, favourite_club: v })}
                  options={FOOTBALL_CLUBS}
                  placeholder="Search clubs…"
                />
              </ComboboxField>
              <ComboboxField label="Favourite league">
                <Combobox
                  value={form.favourite_league}
                  onChange={(v) => setForm({ ...form, favourite_league: v })}
                  options={FOOTBALL_LEAGUES}
                  placeholder="Search leagues…"
                />
              </ComboboxField>
              <ComboboxField label="National team">
                <Combobox
                  value={form.favourite_national_team}
                  onChange={(v) =>
                    setForm({ ...form, favourite_national_team: v })
                  }
                  options={FOOTBALL_NATIONS}
                  placeholder="Search nations…"
                />
              </ComboboxField>
              <ComboboxField label="Favourite player">
                <Combobox
                  value={form.favourite_player}
                  onChange={(v) => setForm({ ...form, favourite_player: v })}
                  options={FOOTBALL_PLAYERS}
                  placeholder="Search players…"
                />
              </ComboboxField>
            </div>
            <Row label="Favourite football moment">
              <Textarea
                rows={3}
                value={form.favourite_moment ?? ""}
                onChange={(e) =>
                  setForm({ ...form, favourite_moment: e.target.value })
                }
                maxLength={FAVOURITE_MOMENT_MAX}
                placeholder="The goal, the save, the night you'll never forget…"
              />
              <p className="text-xs text-muted-foreground">
                {form.favourite_moment?.length ?? 0}/{FAVOURITE_MOMENT_MAX}
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

      <div className="glass-strong overflow-hidden rounded-2xl p-6 md:p-8">
        {bannerUrl && (
          <div className="-mx-6 -mt-6 mb-6 h-28 md:-mx-8 md:-mt-8">
            <img
              src={bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
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
            <div className="mt-1 flex items-center justify-center gap-1 text-muted-foreground sm:justify-start">
              <AtSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="text-sm">{form.username}</span>
            </div>
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
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" aria-hidden="true" /> Joined{" "}
                {joinedLabel(form.created_at)}
              </span>
            </div>
            <Link
              to="/players/$username"
              params={{ username: form.username }}
              className="mt-3 inline-flex items-center gap-1 text-sm text-gold hover:underline"
            >
              View public profile →
            </Link>
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

        <FavouritesView profile={form} />
      </div>

      <div className="glass-strong rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" />
          <h2 className="font-display text-xl text-foreground">Security</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Change the password for your PRC D&apos;or account.
        </p>
        <ChangePasswordForm />
      </div>

      <FollowRequestsPanel />
    </div>
  );
}

function photoExt(file: File) {
  const m = file.name.match(/\.([a-z0-9]+)$/i);
  const ext = (m?.[1] ?? file.type.split("/")[1] ?? "jpg").toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

/** "November 2026" for the Joined pill. */
function joinedLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

const FAVOURITE_FIELDS: {
  key:
    | "favourite_club"
    | "favourite_national_team"
    | "favourite_league"
    | "favourite_player";
  label: string;
  icon: typeof Hash;
}[] = [
  { key: "favourite_club", label: "Favourite club", icon: Shield },
  { key: "favourite_national_team", label: "National team", icon: Flag },
  { key: "favourite_league", label: "Favourite league", icon: Trophy },
  { key: "favourite_player", label: "Favourite player", icon: Star },
];

function FavouritesView({ profile }: { profile: ProfileForm }) {
  const filled = FAVOURITE_FIELDS.filter((f) => profile[f.key]);
  if (filled.length === 0 && !profile.favourite_moment) return null;

  return (
    <div className="mt-6 border-t border-border/50 pt-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
        <h2 className="font-display text-xl text-foreground">
          Football favourites
        </h2>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {filled.map((entry) => (
          <div key={entry.key} className="flex items-start gap-3">
            <entry.icon
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="mt-0.5 text-sm">{profile[entry.key]}</dd>
            </div>
          </div>
        ))}
        {profile.favourite_moment && (
          <div className="flex items-start gap-3 sm:col-span-2">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Favourite football moment
              </dt>
              <dd className="mt-0.5 text-sm leading-relaxed">
                {profile.favourite_moment}
              </dd>
            </div>
          </div>
        )}
      </dl>
    </div>
  );
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
