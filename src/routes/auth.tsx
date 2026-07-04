import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — PRC D'or" }] }),
  component: AuthPage,
});

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Striker"] as const;

function AuthPage() {
  const { user, loading } = useAuth();
  const { mode } = Route.useSearch();
  const navigate = useNavigate();

  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[var(--gold)] opacity-10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl text-gold-gradient">PRC D'or</h1>
          <p className="mt-1 text-sm text-muted-foreground">Football community awards</p>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-glow">
          <Tabs defaultValue={mode ?? "login"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-background hover:opacity-90">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  nickname: z.string().trim().max(40).optional().or(z.literal("")),
  age: z.coerce.number().int().min(8).max(80),
  position: z.enum(POSITIONS),
  jersey_number: z.coerce.number().int().min(1).max(99).optional().or(z.literal("")),
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  confirm: z.string(),
});

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const data = parsed.data;
    if (data.password !== data.confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setBusy(true);
    const { data: signed, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: data.full_name,
          nickname: data.nickname || null,
          age: String(data.age),
          position: data.position,
          jersey_number: data.jersey_number ? String(data.jersey_number) : "",
        },
      },
    });
    if (error || !signed.user) {
      setBusy(false);
      toast.error(error?.message ?? "Sign up failed");
      return;
    }

    // Upload avatar if provided
    if (photo) {
      const ext = photo.name.split(".").pop() ?? "jpg";
      const path = `${signed.user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, photo, { upsert: true, contentType: photo.type });
      if (!upErr) {
        await supabase.from("profiles").update({ profile_image: path }).eq("id", signed.user.id);
      }
    }

    setBusy(false);
    toast.success("Welcome to PRC D'or!");
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" name="full_name" required />
        <Field label="Nickname" name="nickname" placeholder="optional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age" name="age" type="number" min={8} max={80} required />
        <Field label="Jersey #" name="jersey_number" type="number" min={1} max={99} placeholder="optional" />
      </div>
      <div className="space-y-2">
        <Label>Position</Label>
        <Select name="position" required defaultValue="Midfielder">
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
      </div>
      <div className="space-y-2">
        <Label>Profile photo</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </div>
      <Field label="Email" name="email" type="email" required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password" name="password" type="password" required />
        <Field label="Confirm" name="confirm" type="password" required />
      </div>
      <Button type="submit" disabled={busy} className="mt-2 w-full bg-gold-gradient text-background hover:opacity-90">
        {busy ? "Creating account…" : "Join PRC D'or"}
      </Button>
    </form>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...rest} />
    </div>
  );
}
