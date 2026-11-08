import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  isRecentLoginRequired,
  PASSWORD_MIN_LENGTH,
  RECENT_LOGIN_HINT,
  validateNewPassword,
} from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

/**
 * Change-password form for an already authenticated user. Plaintext passwords
 * live only in component state long enough to be submitted to Supabase — they
 * are never logged, stored or displayed outside the field itself.
 */
export function ChangePasswordForm() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const validationError = validateNewPassword(password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!user) {
      setError("You need to be signed in to change your password.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="change-password-new">New password</Label>
        <PasswordInput
          id="change-password-new"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="change-password-confirm">Confirm new password</Label>
        <PasswordInput
          id="change-password-confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        At least {PASSWORD_MIN_LENGTH} characters. Pick something you don&apos;t
        use anywhere else.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {error && isRecentLoginRequired(error) && (
        <p className="text-xs text-muted-foreground">{RECENT_LOGIN_HINT}</p>
      )}
      <Button
        type="submit"
        disabled={busy}
        className="bg-gold-gradient text-background hover:opacity-90"
      >
        {busy ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
