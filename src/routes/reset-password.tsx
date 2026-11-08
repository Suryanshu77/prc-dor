import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, ShieldAlert, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  isRecentLoginRequired,
  PASSWORD_MIN_LENGTH,
  RECENT_LOGIN_HINT,
  validateNewPassword,
} from "@/lib/password";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — PRC D'or" }] }),
  component: PasswordResetPage,
});

/**
 * Captured at module load, i.e. before supabase-js consumes the auth callback
 * parameters and clears `window.location.hash`. Hash fragments are never sent
 * to the server, so this only ever reads browser state.
 */
const callbackSignal = readCallbackSignal();

function readCallbackSignal() {
  if (typeof window === "undefined") {
    return { recovery: false, authError: false };
  }
  const href = window.location.href;
  return {
    recovery: /[#&?]type=recovery(&|$)/.test(href),
    authError: /[#&?](error|error_code)=/i.test(href),
  };
}

type Phase = "checking" | "ready" | "invalid" | "done";

function PasswordResetPage() {
  const { user, loading, passwordRecovery } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isRecoveryContext = passwordRecovery || callbackSignal.recovery;

  // Resolve the link state once auth has initialised. `phase` is intentionally
  // sticky so a later session refresh can't yank the user off a completed reset.
  useEffect(() => {
    if (phase !== "checking" || loading) return;
    if (callbackSignal.authError) {
      setPhase("invalid");
      return;
    }
    setPhase(user ? "ready" : "invalid");
  }, [phase, loading, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);

    const validationError = validateNewPassword(password, confirm);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setBusy(true);
    try {
      // Re-verify the recovery session immediately before updating anything.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setPhase("invalid");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (/session|jwt|not authenticated|expired/i.test(error.message)) {
          setPhase("invalid");
          return;
        }
        setFormError(error.message);
        return;
      }

      setPassword("");
      setConfirm("");
      setPhase("done");
      toast.success("Password updated");
    } finally {
      setBusy(false);
    }
  }

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
          <h1 className="font-display text-3xl text-gold-gradient">
            PRC D&apos;or
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Football community awards
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-glow">
          {phase === "checking" && (
            <p
              className="py-10 text-center text-sm text-muted-foreground"
              role="status"
            >
              Checking your link…
            </p>
          )}

          {phase === "ready" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl text-foreground">
                  Choose a new password
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isRecoveryContext
                    ? "Your recovery link worked — pick a new password for your account."
                    : "Set a new password for your PRC D'or account."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-password">New password</Label>
                <PasswordInput
                  id="reset-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-password-confirm">
                  Confirm new password
                </Label>
                <PasswordInput
                  id="reset-password-confirm"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least {PASSWORD_MIN_LENGTH} characters.
              </p>

              {formError && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}
              {formError && isRecentLoginRequired(formError) && (
                <p className="text-xs text-muted-foreground">
                  {RECENT_LOGIN_HINT}
                </p>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gold-gradient text-background hover:opacity-90"
              >
                {busy ? "Updating password…" : "Update password"}
              </Button>
            </form>
          )}

          {phase === "invalid" && (
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl text-foreground">
                This link isn&apos;t valid anymore
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Reset links expire and can only be used once. Request a fresh
                link below and we&apos;ll email you a new one.
              </p>
              <ForgotPasswordForm />
              <div className="pt-2">
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="text-sm text-gold underline-offset-4 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4 text-center" role="status">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl text-foreground">
                Password updated
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your new password is active. Sign in with it any time — your
                profile, votes and roles are exactly as you left them.
              </p>
              <Button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full bg-gold-gradient text-background hover:opacity-90"
              >
                Continue to PRC D&apos;or
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
