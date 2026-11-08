export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

/** Where Supabase sends the user after they click a password recovery email link. */
export function passwordResetRedirectUrl(): string {
  if (typeof window === "undefined") return "/reset-password";
  return `${window.location.origin}/reset-password`;
}

/**
 * Shared client-side validation for the recovery and change-password forms.
 * Returns an error message, or null when the pair is acceptable.
 */
export function validateNewPassword(
  password: string,
  confirm: string,
): string | null {
  if (!password) return "Enter a new password.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (password !== confirm) return "Passwords don't match.";
  return null;
}

/**
 * Supabase errors that would tell an attacker whether an email is registered.
 * Those are folded into the generic "check your inbox" message so the forgot
 * password flow never reveals whether an account exists.
 */
export function revealsAccountExists(message: string): boolean {
  return /not\s+found|no\s+user|does\s+not\s+exist|doesn'?t\s+exist|unknown\s+email|user\s+not/i.test(
    message,
  );
}

/**
 * Supabase's optional "Secure password change" setting rejects a password
 * update unless the session was created in the last 24 hours (a nonce via
 * `reauthenticate()` is the alternative). Recovery sessions are always fresh,
 * so this only affects long-lived sessions on the profile form.
 */
export function isRecentLoginRequired(message: string): boolean {
  return /recent\s+login|reauthenticate|nonce/i.test(message);
}

export const RECENT_LOGIN_HINT =
  "For your security, changing your password can require a recent sign-in. Sign out, sign back in, then try again.";
