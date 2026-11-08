import { useEffect, useState } from "react";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { passwordResetRedirectUrl, revealsAccountExists } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

/** Identical for known and unknown addresses — never reveals whether an account exists. */
const SENT_MESSAGE =
  "If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.";

const RESEND_COOLDOWN_SECONDS = 60;

interface ForgotPasswordFormProps {
  /** Rendered under the form, e.g. a "Back to sign in" action. */
  onBack?: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function send(address: string) {
    if (busy || cooldown > 0) return;
    const parsed = emailSchema.safeParse({ email: address });
    if (!parsed.success) {
      toast.error("Enter a valid email address.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: passwordResetRedirectUrl() },
    );
    setBusy(false);

    // Account-enumeration style errors are folded into the generic message;
    // operational errors (rate limits, SMTP) are shown so the user can retry.
    if (error && !revealsAccountExists(error.message)) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void send(email);
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-4 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="font-display text-xl text-foreground">
          Check your inbox
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {SENT_MESSAGE}
        </p>
        <p className="text-xs text-muted-foreground">
          For your security the link can only be used once and expires shortly.
        </p>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy || cooldown > 0}
            onClick={() => void send(email)}
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : busy
                ? "Sending…"
                : "Send another link"}
          </Button>
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
            >
              Back to sign in
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-password-email">Email</Label>
        <Input
          id="forgot-password-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={busy || cooldown > 0}
        className="w-full bg-gold-gradient text-background hover:opacity-90"
      >
        {busy ? "Sending link…" : "Send reset link"}
      </Button>
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={busy}
        >
          Back to sign in
        </Button>
      )}
    </form>
  );
}
