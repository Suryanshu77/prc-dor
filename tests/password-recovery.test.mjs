// Password recovery / password change regression guards, source-level:
// - login offers a forgot-password flow that calls resetPasswordForEmail
// - a dedicated public /reset-password route handles the recovery session
// - authenticated users can change their password from the profile page
// - no service-role key, no auth.users tampering, no plaintext logging
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("login screen offers a forgot-password entry point", () => {
  const src = read("src/routes/auth.tsx");
  assert.match(src, /Forgot password\?/, "missing forgot-password link");
  assert.match(src, /setForgot\(true\)/, "link must switch to recovery form");
  assert.match(
    src,
    /<ForgotPasswordForm onBack=\{\(\) => setForgot\(false\)\} \/>/,
    "recovery form must be rendered with a way back to sign in",
  );
});

test("forgot-password form requests a reset email with the reset route as redirect", () => {
  const src = read("src/components/auth/ForgotPasswordForm.tsx");
  assert.match(src, /supabase\.auth\.resetPasswordForEmail\(/);
  assert.match(src, /redirectTo: passwordResetRedirectUrl\(\)/);
  assert.match(
    src,
    /supabase\.auth\.resetPasswordForEmail\([\s\S]*?\{[^}]*redirectTo/s,
    "redirect must be passed as options",
  );
});

test("recovery redirect URL points at /reset-password", () => {
  const src = read("src/lib/password.ts");
  assert.match(src, /origin\}\/reset-password/);
  assert.match(src, /export function passwordResetRedirectUrl/);
});

test("forgot-password never reveals whether an email is registered", () => {
  const src = read("src/components/auth/ForgotPasswordForm.tsx");
  // The success copy is a single static sentence, identical for every address.
  const sent = src.match(/const SENT_MESSAGE =\s*\n?\s*"([^"]+)"/);
  assert.ok(sent, "generic SENT_MESSAGE constant missing");
  assert.ok(
    !sent[1].includes("${"),
    "success message must not interpolate user input",
  );
  assert.match(sent[1], /if an account exists/i);
  // Enumeration-style errors are folded into that same generic message.
  assert.match(src, /revealsAccountExists\(error\.message\)/);
  assert.match(
    src,
    /import \{[\s\S]*revealsAccountExists[\s\S]*\} from "@\/lib\/password"/,
  );
});

test("duplicate reset requests are blocked while in flight or cooling down", () => {
  const src = read("src/components/auth/ForgotPasswordForm.tsx");
  assert.match(src, /if \(busy \|\| cooldown > 0\) return;/);
  assert.match(src, /disabled=\{busy \|\| cooldown > 0\}/);
  assert.match(src, /RESEND_COOLDOWN_SECONDS = 60/);
});

test("public reset route exists outside the authenticated layout", () => {
  assert.ok(
    existsSync(path.join(root, "src/routes/reset-password.tsx")),
    "reset-password route file missing",
  );
  assert.ok(
    !existsSync(
      path.join(root, "src/routes/_authenticated/reset-password.tsx"),
    ),
    "reset route must stay reachable without a session",
  );
  const tree = read("src/routeTree.gen.ts");
  assert.match(tree, /id: '\/reset-password'/);
});

test("reset route drives Supabase updateUser and re-checks the session first", () => {
  const src = read("src/routes/reset-password.tsx");
  assert.match(src, /createFileRoute\("\/reset-password"\)/);
  assert.match(src, /supabase\.auth\.updateUser\(\{\s*password,?\s*\}\)/);
  // The session is verified immediately before the update, so an expired or
  // missing recovery link can never reach updateUser.
  assert.match(
    src,
    /data: \{\s*session\s*\}[\s\S]*supabase\.auth\.getSession\(\)/,
  );
  assert.match(src, /setPhase\("invalid"\)/);
  assert.match(src, /if \(!session\) \{\s*setPhase\("invalid"\)/);
});

test("reset route validates the new password pair and offers a resend", () => {
  const src = read("src/routes/reset-password.tsx");
  assert.match(src, /validateNewPassword\(password, confirm\)/);
  assert.match(src, /<ForgotPasswordForm \/>/);
  assert.match(
    src,
    /phase === "invalid"/,
    "expired/invalid link state missing",
  );
  assert.match(src, /phase === "done"/, "success state missing");
});

test("show/hide controls cover every new password field", () => {
  const toggle = read("src/components/ui/password-input.tsx");
  assert.match(
    toggle,
    /aria-label=\{visible \? "Hide password" : "Show password"\}/,
  );
  assert.match(toggle, /EyeOff/);
  for (const file of [
    "src/routes/reset-password.tsx",
    "src/components/auth/ChangePasswordForm.tsx",
  ]) {
    assert.match(
      read(file),
      /<PasswordInput[\s>/]/,
      `${file} must use the shared show/hide password field`,
    );
  }
});

test("profile page exposes a security section with change-password", () => {
  const src = read("src/routes/_authenticated/profile.tsx");
  assert.match(src, /Security/, "security section missing");
  assert.match(src, /<ChangePasswordForm \/>/);
  assert.match(src, /ShieldCheck/);
});

test("change-password requires an authenticated user and uses updateUser", () => {
  const src = read("src/components/auth/ChangePasswordForm.tsx");
  assert.match(src, /if \(!user\)/, "must refuse when signed out");
  assert.match(src, /supabase\.auth\.updateUser\(\{\s*password,?\s*\}\)/);
  assert.match(src, /validateNewPassword\(password, confirm\)/);
  // No plaintext is ever written to the console.
  assert.ok(!/console\.(log|debug|info|warn|error)\([^)]*password/i.test(src));
});

test("PASSWORD_RECOVERY events are handled by the auth provider", () => {
  const src = read("src/lib/auth.tsx");
  assert.match(src, /event === "PASSWORD_RECOVERY"/);
  assert.match(src, /passwordRecovery: boolean/, "flag must be exposed");
  assert.match(
    src,
    /router\.navigate\(\{ to: PASSWORD_RESET_PATH \}\)/,
    "recovery sign-ins must land on the reset page, not the dashboard",
  );
});

test("promotional popups never obstruct the reset page", () => {
  const src = read("src/routes/__root.tsx");
  assert.match(src, /onPasswordReset = pathname === "\/reset-password"/);
  assert.match(src, /onPasswordReset \? null : <PRCDorIntroPopup \/>/);
  assert.match(src, /!loading && user && !onPasswordReset/);
});

test("existing signup and login flows are untouched", () => {
  const src = read("src/routes/auth.tsx");
  assert.match(src, /supabase\.auth\.signInWithPassword\(/);
  assert.match(src, /supabase\.auth\.signUp\(/);
  assert.match(
    src,
    /emailRedirectTo: .\$\{window\.location\.origin\}\/dashboard/,
  );
});

test("password validation enforces length and confirmation", () => {
  const src = read("src/lib/password.ts");
  assert.match(src, /PASSWORD_MIN_LENGTH = 6/);
  assert.match(src, /if \(password\.length < PASSWORD_MIN_LENGTH\)/);
  assert.match(src, /if \(password !== confirm\)/);
});

test("no service-role key or auth.users tampering anywhere in src", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
        const text = readFileSync(full, "utf8");
        const hits = [
          /\bservice_role\b/i.test(text) ? "service_role" : null,
          /encrypted_password/.test(text) ? "encrypted_password" : null,
          /sb_secret_[A-Za-z0-9]{10,}/.test(text)
            ? "embedded secret key"
            : null,
        ].filter(Boolean);
        if (hits.length)
          offenders.push(`${path.relative(root, full)} (${hits.join(", ")})`);
      }
    }
  };
  walk(path.join(root, "src"));
  assert.deepEqual(
    offenders,
    [],
    `forbidden patterns in: ${offenders.join("; ")}`,
  );
});

test("no migration was added for password recovery", () => {
  const migrations = readdirSync(path.join(root, "src/supabase/migrations"));
  const passwordMigrations = migrations.filter((f) =>
    /password|recover|reset/i.test(f),
  );
  assert.deepEqual(
    passwordMigrations,
    [],
    "password recovery must not need database migrations",
  );
});

// ---------------------------------------------------------------------------
// Audit: behavioural checks of the pure password helpers (Node strips types).
// ---------------------------------------------------------------------------

const passwordLib = await import("../src/lib/password.ts");

test("validateNewPassword rejects short, long, empty and mismatched pairs", () => {
  const { validateNewPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } =
    passwordLib;
  assert.equal(validateNewPassword("", ""), "Enter a new password.");
  assert.equal(
    validateNewPassword("abc", "abc"),
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  );
  const tooLong = "x".repeat(PASSWORD_MAX_LENGTH + 1);
  assert.equal(
    validateNewPassword(tooLong, tooLong),
    `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`,
  );
  // Mismatch is rejected even when both entries satisfy the length rule.
  assert.equal(
    validateNewPassword("abcdef123", "abcdef124"),
    "Passwords don't match.",
  );
  assert.equal(validateNewPassword("abcdef", "abcdef"), null);
});

test("enumeration-style errors are folded, operational errors are surfaced", () => {
  const { revealsAccountExists } = passwordLib;
  for (const message of [
    "User not found",
    "No user found with this email",
    "user does not exist",
    "Email not found",
  ]) {
    assert.equal(revealsAccountExists(message), true, message);
  }
  for (const message of [
    "Email rate limit exceeded",
    "SMTP connection failed",
    "Invalid email format",
  ]) {
    assert.equal(revealsAccountExists(message), false, message);
  }
});

test("recovery redirect is derived from the page origin only", () => {
  const { passwordResetRedirectUrl } = passwordLib;
  const hadWindow = "window" in globalThis;
  const previous = globalThis.window;
  try {
    globalThis.window = { location: { origin: "https://prc-dor.example" } };
    assert.equal(
      passwordResetRedirectUrl(),
      "https://prc-dor.example/reset-password",
    );
  } finally {
    if (hadWindow) globalThis.window = previous;
    else delete globalThis.window;
  }
  // No window (SSR) never produces an absolute URL.
  assert.equal(passwordResetRedirectUrl(), "/reset-password");
});

test("secure-password-change errors are recognised for the sign-in hint", () => {
  const { isRecentLoginRequired, RECENT_LOGIN_HINT } = passwordLib;
  assert.equal(isRecentLoginRequired("A recent login is required"), true);
  assert.equal(isRecentLoginRequired("Nonce is required to continue"), true);
  assert.equal(
    isRecentLoginRequired(
      "New password should be different from the old password",
    ),
    false,
  );
  assert.equal(
    isRecentLoginRequired("Password must be at least 6 characters"),
    false,
  );
  assert.ok(RECENT_LOGIN_HINT.includes("sign back in"));
});

// ---------------------------------------------------------------------------
// Audit: recovery-session validation and invalid-link handling (source guards).
// ---------------------------------------------------------------------------

test("password update is unreachable without a live session", () => {
  const src = read("src/routes/reset-password.tsx");
  const sessionCheck = src.indexOf("supabase.auth.getSession()");
  const update = src.indexOf("supabase.auth.updateUser(");
  assert.ok(sessionCheck > 0, "reset page must check the session first");
  assert.ok(update > sessionCheck, "getSession() must run before updateUser()");
  assert.match(
    src,
    /if \(!session\) \{\s*setPhase\("invalid"\)/,
    "a missing session must flip the page to the invalid state",
  );
});

test("an invalid or expired link overrides any existing session", () => {
  const src = read("src/routes/reset-password.tsx");
  const errorCheck = src.indexOf("callbackSignal.authError");
  const grant = src.indexOf('setPhase(user ? "ready" : "invalid")');
  assert.ok(errorCheck > 0, "callback error must be inspected");
  assert.ok(
    grant > errorCheck,
    "auth error must be evaluated before the form is granted",
  );
});

test("the reset route stays reachable without a session", () => {
  const src = read("src/routes/reset-password.tsx");
  assert.ok(!/beforeLoad/.test(src), "no auth guard on the reset route");
  assert.ok(
    !/redirect\(/.test(src),
    "reset route must not redirect authenticated users away",
  );
});

test("recovery redirect is one-shot and cleared on sign-out", () => {
  const src = read("src/lib/auth.tsx");
  assert.match(
    src,
    /if \(!passwordRecovery \|\| recoveryRedirectDone\.current\) return;/,
    "redirect must be guarded against loops",
  );
  assert.match(
    src,
    /else if \(event === "SIGNED_OUT"\) \{\s*setPasswordRecovery\(false\)/,
    "sign-out must clear recovery state",
  );
});

test("supabase client keeps recovery URL detection and session persistence", () => {
  const src = read("src/integrations/supabase/client.ts");
  assert.ok(
    !/detectSessionInUrl:\s*false/.test(src),
    "disabling detectSessionInUrl breaks recovery links",
  );
  assert.ok(!/persistSession:\s*false/.test(src));
  assert.ok(!/autoRefreshToken:\s*false/.test(src));
});

test("recovery code never logs or persists credentials", () => {
  const files = [
    "src/routes/reset-password.tsx",
    "src/components/auth/ForgotPasswordForm.tsx",
    "src/components/auth/ChangePasswordForm.tsx",
    "src/lib/password.ts",
    "src/lib/auth.tsx",
  ];
  for (const file of files) {
    const src = read(file);
    assert.ok(!/console\./.test(src), `${file} must not log anything`);
    assert.ok(
      !/localStorage|sessionStorage|document\.cookie/.test(src),
      `${file} must not persist credentials`,
    );
    assert.ok(
      !/location\.hash\s*=/.test(src),
      `${file} must not rewrite the auth callback hash`,
    );
  }
});

test("both password forms block double submission", () => {
  for (const file of [
    "src/routes/reset-password.tsx",
    "src/components/auth/ChangePasswordForm.tsx",
  ]) {
    const src = read(file);
    assert.match(src, /if \(busy\) return;/, `${file} needs a busy guard`);
    assert.match(src, /disabled=\{busy\}/, `${file} needs a disabled button`);
  }
});
