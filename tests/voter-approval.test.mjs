// Voter approval system — guards for
// src/supabase/migrations/20261111140000_voter_approval_system.sql plus the
// ApprovalGate / Registrations UI halves.
//
//   * Static: pins the migration security contract (dedicated table, not a
//     profiles column; SELECT-only RLS; fail-closed assert; no self-approve;
//     both ballot RPCs gated; five cheating UUIDs seeded rejected; profiles
//     never written) and the frontend call sites.
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     never touches Supabase), seeds the five rejected accounts, then proves
//     pending / rejected / missing all fail both ballot RPCs while approved
//     and admin succeed, admin decide + audit works, signup is atomic, and
//     historical vote counts stay intact.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "src/supabase/migrations");
const MIGRATION_NAME = "20261111140000_voter_approval_system.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const APPROVAL_GATE = path.join(ROOT, "src/components/ApprovalGate.tsx");
const USE_APPROVAL = path.join(ROOT, "src/lib/use-approval.ts");
const ROUTE_TSX = path.join(ROOT, "src/routes/_authenticated/route.tsx");
const ADMIN_TSX = path.join(ROOT, "src/routes/_authenticated/admin.tsx");
const NOTIFICATIONS_TSX = path.join(
  ROOT,
  "src/components/admin/AdminNotifications.tsx",
);
const TYPES_TS = path.join(ROOT, "src/integrations/supabase/types.ts");
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = readFileSync(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// The five cheating accounts from the Phase 0 orphan report. Profiles are
// intentionally absent and must stay absent.
const REJECTED_IDS = [
  "4db2e610-505f-4842-8b66-86fdc4ad068e",
  "b2e52277-7174-457f-857c-d8296a3bdee0",
  "83a5ace1-1426-4501-9a2a-5b83c5bd537d",
  "42321688-4be7-4112-ad72-b05d6b1e5c78",
  "0e84b649-105a-41d5-bb58-97e6b2f38aaa",
];

const uuidArray = (ids) => `{${ids.join(",")}}`;

function loadMigration(file) {
  const name = path.basename(file);
  let text = readFileSync(file, "utf8");
  // PGlite / PostgreSQL 18 rejects unquoted POSITION as a RETURNS TABLE
  // output column (same accommodation as main-ballot-rpc.test.mjs).
  if (
    name === "20261008120000_results_visibility.sql" ||
    name === "20261008130000_secure_result_views.sql"
  ) {
    text = text.replaceAll(
      "position public.player_position",
      '"position" public.player_position',
    );
  }
  return text;
}

function bodyOf(name) {
  const start = stripped.lastIndexOf(
    `CREATE OR REPLACE FUNCTION public.${name}`,
  );
  assert.ok(start >= 0, `function ${name} missing from the migration`);
  const end = stripped.indexOf("REVOKE ALL ON FUNCTION", start);
  return stripped.slice(start, end > 0 ? end : undefined);
}

// ==========================================================================
// Static guards
// ==========================================================================
test("migration file name follows the convention and lands after the ballot cutover", () => {
  assert.match(path.basename(MIGRATION), /^\d{14}_voter_approval_system\.sql$/);
  assert.ok(
    FILES.indexOf("20261027120000_secure_main_ballot.sql") <
      FILES.indexOf(MIGRATION_NAME),
    "voter approval must apply after the secure main-ballot cutover",
  );
  assert.ok(
    FILES.indexOf("20261025120000_special_awards.sql") <
      FILES.indexOf(MIGRATION_NAME),
    "voter approval must apply after special awards",
  );
  assert.ok(
    FILES.indexOf("20261023120000_reconcile_permissions.sql") <
      FILES.indexOf(MIGRATION_NAME),
    "voter approval must apply after permission reconciliation",
  );
});

test("migration uses a dedicated table, never a profiles column", () => {
  assert.match(stripped, /CREATE TYPE public\.voter_approval_status AS ENUM/);
  assert.match(
    stripped,
    /CREATE TABLE public\.voter_approvals\s*\(/,
    "dedicated voter_approvals table",
  );
  assert.ok(
    !/ALTER TABLE public\.profiles ADD COLUMN/i.test(stripped),
    "must not add an approval column to the publicly readable profiles table",
  );

  // handle_new_user legitimately INSERTs a profile for every new signup;
  // submit_* legitimately INSERT into votes/special_votes. Outside those
  // function bodies the seed must never touch profiles/votes/special_votes
  // (the five rejected UUIDs keep missing profiles; historical ballots stay
  // byte-identical).
  function withoutFn(source, createNeedle, endNeedle) {
    const start = source.indexOf(createNeedle);
    assert.ok(start >= 0, `${createNeedle} present`);
    const open = source.indexOf(endNeedle, start);
    const close = source.indexOf(
      endNeedle === "AS $function$" ? "$function$;" : "$$;",
      open,
    );
    return source.slice(0, start) + source.slice(close);
  }
  let outside = stripped;
  outside = withoutFn(
    outside,
    "CREATE OR REPLACE FUNCTION public.handle_new_user",
    "AS $function$",
  );
  outside = withoutFn(
    outside,
    "CREATE OR REPLACE FUNCTION public.submit_main_ballot",
    "AS $$",
  );
  outside = withoutFn(
    outside,
    "CREATE OR REPLACE FUNCTION public.submit_special_ballot",
    "AS $$",
  );

  assert.ok(
    !/INSERT INTO public\.profiles/i.test(outside),
    "must never insert profiles outside the signup trigger",
  );
  assert.ok(
    !/UPDATE public\.profiles/i.test(outside),
    "must never update profiles",
  );
  assert.ok(
    !/DELETE FROM public\.profiles/i.test(outside),
    "must never delete profiles",
  );
  assert.ok(
    !/INSERT INTO auth\.users/i.test(stripped),
    "must never create auth users",
  );
  assert.ok(
    !/UPDATE auth\.users/i.test(stripped),
    "must never modify auth.users",
  );
  assert.ok(
    !/INSERT INTO public\.votes/i.test(outside),
    "must never touch votes outside the ballot RPCs",
  );
  assert.ok(
    !/DELETE FROM public\.votes/i.test(outside),
    "must never delete votes",
  );
  assert.ok(!/UPDATE public\.votes/i.test(outside), "must never update votes");
  assert.ok(
    !/INSERT INTO public\.special_votes/i.test(outside),
    "must never touch special_votes outside the ballot RPCs",
  );
});

test("table has fail-closed CHECK constraints and enable RLS", () => {
  assert.match(
    stripped,
    /CONSTRAINT voter_approvals_decided_state CHECK/,
    "pending has no decision; decided states must be stamped",
  );
  assert.match(
    stripped,
    /CONSTRAINT voter_approvals_rejection_reason CHECK/,
    "rejection_reason only legal on rejected",
  );
  assert.match(
    stripped,
    /ALTER TABLE public\.voter_approvals ENABLE ROW LEVEL SECURITY/,
  );
  assert.match(
    stripped,
    /CREATE POLICY voter_approvals_select_own ON public\.voter_approvals/,
  );
  assert.match(
    stripped,
    /user_id = auth\.uid\(\)\s+OR private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
    "own row or admin",
  );
  // No client write path: no INSERT/UPDATE/DELETE policy on the table.
  assert.ok(
    !/CREATE POLICY[^\n]*ON public\.voter_approvals\s+FOR\s+(INSERT|UPDATE|DELETE)/i.test(
      stripped,
    ),
    "clients must not have write policies on voter_approvals",
  );
  assert.match(
    stripped,
    /REVOKE ALL ON TABLE public\.voter_approvals FROM anon, authenticated/,
  );
  assert.match(
    stripped,
    /GRANT SELECT ON TABLE public\.voter_approvals TO authenticated/,
  );
});

test("assert_voter_approved is fail-closed with a stable message prefix", () => {
  const start = stripped.lastIndexOf(
    "CREATE OR REPLACE FUNCTION private.assert_voter_approved",
  );
  assert.ok(start >= 0, "private.assert_voter_approved missing");
  const open = stripped.indexOf("AS $$", start);
  const close = stripped.indexOf("$$;", open);
  const fn = stripped.slice(open, close);

  assert.match(
    fn,
    /IF _user_id IS NULL THEN[\s\S]*voter approval: not authenticated/,
  );
  assert.match(
    fn,
    /private\.has_role\(_user_id, 'admin'::public\.app_role\)[\s\S]*RETURN/,
    "admins pass without a row",
  );
  assert.match(
    fn,
    /v_status IS NULL THEN[\s\S]*voter approval: no approval record/,
  );
  assert.match(
    fn,
    /v_status = 'pending'[\s\S]*voter approval: pending admin approval/,
  );
  assert.match(
    fn,
    /v_status = 'rejected'[\s\S]*voter approval: account rejected/,
  );
  assert.ok(
    !/UPDATE public\.voter_approvals/i.test(fn),
    "the gate must not mutate approval state",
  );
});

test("handle_new_user inserts a pending row in the same trigger transaction", () => {
  const start = stripped.lastIndexOf(
    "CREATE OR REPLACE FUNCTION public.handle_new_user",
  );
  assert.ok(start >= 0);
  const open = stripped.indexOf("AS $function$", start);
  const close = stripped.indexOf("$function$;", open);
  const fn = stripped.slice(open, close);
  assert.match(
    fn,
    /INSERT INTO public\.voter_approvals \(user_id, status\)\s+VALUES \(NEW\.id, 'pending'::public\.voter_approval_status\)\s+ON CONFLICT \(user_id\) DO NOTHING/,
    "pending row is transactional with signup",
  );
  assert.match(
    fn,
    /INSERT INTO public\.admin_notifications/,
    "keeps the registration notification",
  );
  assert.match(fn, /ON CONFLICT \(type, user_id\) DO NOTHING/);
});

test("both ballot RPCs call the approval gate after auth", () => {
  const main = bodyOf("submit_main_ballot");
  const mainAuth = main.indexOf("not authenticated");
  const mainGate = main.indexOf("private.assert_voter_approved");
  assert.ok(mainGate > mainAuth, "main ballot: gate after auth check");
  assert.match(main, /PERFORM private\.assert_voter_approved\(v_voter\)/);

  const special = bodyOf("submit_special_ballot");
  const specialAuth = special.indexOf("auth.uid() IS NULL");
  const specialGate = special.indexOf("private.assert_voter_approved");
  assert.ok(specialGate > specialAuth, "special ballot: gate after auth check");
  assert.match(
    special,
    /PERFORM private\.assert_voter_approved\(auth\.uid\(\)\)/,
  );
});

test("admin RPCs are admin-gated, self-decision blocked, and audited", () => {
  const list = bodyOf("admin_list_registration_requests");
  assert.match(
    list,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
  );
  assert.match(list, /not authorized: admin only/);
  assert.ok(
    !/INSERT INTO public\.voter_approvals/i.test(list),
    "list is read-only",
  );

  const decide = bodyOf("admin_decide_registration");
  assert.match(
    decide,
    /private\.has_role\(v_admin, 'admin'::public\.app_role\)/,
  );
  assert.match(decide, /cannot decide your own registration/);
  assert.match(
    decide,
    /decision must be approved or rejected/,
    "no path back to pending",
  );
  assert.match(decide, /INSERT INTO public\.admin_audit_log/);
  assert.match(decide, /approve_registration/);
  assert.match(decide, /reject_registration/);
  // Reason is rejection-only: cleared on the approve branch (comment stripped
  // in `stripped`, so match the assignment itself).
  assert.match(decide, /v_reason := NULL;/);
  // ...and only written into the audit log via v_reason (NULL when approving).
  assert.match(
    decide,
    /IF v_decision = 'rejected'::public\.voter_approval_status THEN\s+v_action := 'reject_registration';\s+ELSE\s+v_action := 'approve_registration';\s+v_reason := NULL;/,
  );
});

test("get_my_approval_status is SECURITY DEFINER, admin short-circuits, no anon", () => {
  const start = stripped.lastIndexOf(
    "CREATE OR REPLACE FUNCTION public.get_my_approval_status",
  );
  assert.ok(start >= 0);
  const header = stripped.slice(start, stripped.indexOf("AS $$", start));
  assert.match(header, /SECURITY DEFINER/);
  assert.match(header, /STABLE/);
  const body = stripped.slice(
    stripped.indexOf("AS $$", start),
    stripped.indexOf("$$;", start),
  );
  assert.match(
    body,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)\s+THEN 'approved'::public\.voter_approval_status/,
  );
  assert.match(
    stripped,
    /REVOKE ALL ON FUNCTION public\.get_my_approval_status\(\) FROM PUBLIC, anon/,
  );
  assert.match(
    stripped,
    /GRANT EXECUTE ON FUNCTION public\.get_my_approval_status\(\) TO authenticated/,
  );
});

test("the five cheating UUIDs are seeded rejected with a fraud reason", () => {
  for (const id of REJECTED_IDS) {
    assert.ok(
      stripped.includes(`'${id}'::uuid`),
      `UUID ${id} must appear in the seed`,
    );
  }
  assert.match(
    stripped,
    /'rejected'::public\.voter_approval_status/,
    "seed status is rejected",
  );
  assert.match(stripped, /Account removed by administrator: voting fraud/);
  assert.match(
    stripped,
    /WHERE EXISTS \(\s+SELECT 1 FROM auth\.users u WHERE u\.id = v\.user_id\s+\)/,
    "FK-safe in hermetic test DBs",
  );
  assert.match(
    stripped,
    /ON CONFLICT \(user_id\) DO UPDATE SET\s+status = 'rejected'/,
    "forces rejected even if a prior row said approved",
  );
});

test("existing profile holders and admins are seeded approved", () => {
  // 2a: profiles → approved
  assert.match(
    stripped,
    /FROM auth\.users u\s+JOIN public\.profiles p ON p\.id = u\.id\s+ON CONFLICT \(user_id\) DO NOTHING/,
    "profile holders seeded approved",
  );
  // 2b: admins → approved
  assert.match(
    stripped,
    /FROM public\.user_roles ur\s+WHERE ur\.role = 'admin'::public\.app_role\s+ON CONFLICT \(user_id\) DO NOTHING/,
    "admins seeded approved",
  );
});

test("generated Supabase types expose the table, enum and new RPCs", async () => {
  const types = await readFile(TYPES_TS, "utf8");
  assert.match(types, /voter_approvals: \{/);
  assert.match(
    types,
    /voter_approval_status: "pending" \| "approved" \| "rejected"/,
  );
  assert.match(types, /get_my_approval_status: \{/);
  assert.match(types, /admin_list_registration_requests: \{/);
  assert.match(types, /admin_decide_registration: \{/);
});

test("frontend gates on server status and wires the admin queue", async () => {
  const route = await readFile(ROUTE_TSX, "utf8");
  assert.match(route, /ApprovalGate/);
  assert.match(route, /<Outlet \/>/);

  const gate = await readFile(APPROVAL_GATE, "utf8");
  assert.match(gate, /useApproval/);
  assert.match(gate, /Waiting for approval/);
  assert.match(gate, /Account not approved/);
  assert.match(gate, /signOut/);

  const hook = await readFile(USE_APPROVAL, "utf8");
  assert.match(hook, /get_my_approval_status/);
  assert.match(hook, /rejection_reason/);

  const admin = await readFile(ADMIN_TSX, "utf8");
  assert.match(admin, /admin_list_registration_requests/);
  assert.match(admin, /admin_decide_registration/);
  assert.match(admin, /RegistrationsSection/);
  assert.match(admin, /reg: z\.enum\(\["pending", "approved", "rejected"\]\)/);

  const notifs = await readFile(NOTIFICATIONS_TSX, "utf8");
  assert.match(
    notifs,
    /user_registration[\s\S]{0,200}reg: "pending"/,
    "registration notifications deep-link to the queue",
  );
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;
let periodId;
let adminId;
let approvedVoter;
let pendingVoter;
let rejectedVoter;
let missingVoter;
const players = [];

async function createUser(fullName) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@voter-approval.test`,
      JSON.stringify({ full_name: fullName }),
    ],
  );
  return id;
}

async function approveUser(id) {
  await db.query(
    "UPDATE public.voter_approvals SET status = 'approved', decided_at = now() WHERE user_id = $1",
    [id],
  );
}

async function asUser(userId) {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    userId ?? "",
  ]);
}

async function asRole(role, userId) {
  await asUser(userId);
  await db.query(`SET ROLE ${role}`);
}

async function resetRole() {
  await db.query("RESET ROLE");
  await asUser(null);
}

function submitMain(period, ids) {
  return db.query("SELECT public.submit_main_ballot($1, $2::uuid[])", [
    period,
    uuidArray(ids),
  ]);
}

function submitSpecial(awardId, ids) {
  return db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
    awardId,
    uuidArray(ids),
  ]);
}

async function raises(fn, pattern) {
  try {
    await fn();
    assert.fail("expected the call to raise");
  } catch (err) {
    assert.match(String(err.message), pattern);
  }
}

async function approvalStatus(userId) {
  await asUser(userId);
  const r = await db.query("SELECT public.get_my_approval_status() AS s");
  await asUser(null);
  return r.rows[0].s;
}

before(async () => {
  db = new PGlite();
  await db.exec(await readFile(STUB, "utf8"));
  await db.exec(await readFile(STORAGE_STUB, "utf8"));
  await db.exec(await readFile(DEFAULT_ACL, "utf8"));
  for (const f of FILES) {
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }

  periodId = (
    await db.query("SELECT id FROM public.voting_periods WHERE year = 2026")
  ).rows[0].id;

  adminId = await createUser("Approval Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );

  for (let i = 0; i < 12; i++) players.push(await createUser(`VA Player ${i}`));

  approvedVoter = await createUser("VA Approved Voter");
  await approveUser(approvedVoter);

  pendingVoter = await createUser("VA Pending Voter");
  // leave pending (signup trigger)

  // Rejected + missing: create then force the states the product requires.
  rejectedVoter = await createUser("VA Rejected Voter");
  await db.query(
    `INSERT INTO public.voter_approvals (user_id, status, decided_at, decided_by, rejection_reason)
       VALUES ($1, 'rejected', now(), NULL::uuid, 'Account removed by administrator: voting fraud')
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'rejected', decided_at = now(), decided_by = NULL,
         rejection_reason = EXCLUDED.rejection_reason`,
    [rejectedVoter],
  );

  missingVoter = await createUser("VA Missing Approval Voter");
  await db.query("DELETE FROM public.voter_approvals WHERE user_id = $1", [
    missingVoter,
  ]);

  // Seed the five cheating UUIDs as production does: they already exist in
  // auth.users without profiles (admin removed them). Simulate by creating
  // the accounts, dropping the profiles the trigger made, then re-running
  // the seed statement shape from the migration (WHERE EXISTS + force).
  for (const id of REJECTED_IDS) {
    await db.query(
      "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
      [
        id,
        `${id.slice(0, 8)}@cheater.test`,
        JSON.stringify({ full_name: "Cheater" }),
      ],
    );
    await db.query("DELETE FROM public.profiles WHERE id = $1", [id]);
    await db.query(
      `INSERT INTO public.voter_approvals (user_id, status, decided_at, decided_by, rejection_reason)
       SELECT $1, 'rejected'::public.voter_approval_status, now(), NULL::uuid,
              'Account removed by administrator: voting fraud'
       WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = $1)
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'rejected', decided_at = now(), decided_by = NULL,
         rejection_reason = EXCLUDED.rejection_reason, updated_at = now()`,
      [id],
    );
  }

  // Historical vote baseline: cast one ballot as the approved voter so we
  // can prove later mutations never touch existing rows.
  const ballot = players.slice(0, 10);
  await asRole("authenticated", approvedVoter);
  await submitMain(periodId, ballot);
  await resetRole();
});

after(async () => {
  await db.close();
});

// ---------------------------------------------------------------------------
// Seed / five rejected accounts
// ---------------------------------------------------------------------------
test("the five cheating accounts are rejected and their profiles stay absent", async () => {
  for (const id of REJECTED_IDS) {
    const va = await db.query(
      "SELECT status, rejection_reason FROM public.voter_approvals WHERE user_id = $1",
      [id],
    );
    assert.equal(va.rows.length, 1, `${id} has an approval row`);
    assert.equal(va.rows[0].status, "rejected");
    assert.match(va.rows[0].rejection_reason, /voting fraud/);

    const p = await db.query("SELECT 1 FROM public.profiles WHERE id = $1", [
      id,
    ]);
    assert.equal(p.rows.length, 0, `${id} must have NO profile row`);
  }
});

test("existing legitimate users are approved; new signup starts pending", async () => {
  assert.equal(await approvalStatus(approvedVoter), "approved");
  assert.equal(await approvalStatus(pendingVoter), "pending");
  assert.equal(
    await approvalStatus(adminId),
    "approved",
    "admin short-circuit",
  );
  assert.equal(await approvalStatus(rejectedVoter), "rejected");
  assert.equal(
    await approvalStatus(missingVoter),
    null,
    "missing row → null (fail closed at the ballot)",
  );
});

test("signup trigger creates profiles + pending approval + notification atomically", async () => {
  const id = await createUser("VA Atomic Signup");
  const r = await db.query(
    `SELECT
       (SELECT count(*)::int FROM public.profiles WHERE id = $1) AS profiles,
       (SELECT count(*)::int FROM public.user_roles WHERE user_id = $1) AS roles,
       (SELECT status::text FROM public.voter_approvals WHERE user_id = $1) AS status,
       (SELECT count(*)::int FROM public.admin_notifications
         WHERE user_id = $1 AND type = 'user_registration') AS notifs`,
    [id],
  );
  const row = r.rows[0];
  assert.equal(row.profiles, 1, "profile created by trigger");
  assert.equal(row.roles, 1, "default role created");
  assert.equal(row.status, "pending", "new signup is pending");
  assert.equal(row.notifs, 1, "admin notified");

  // Cleanup so later counts stay predictable.
  await db.query("DELETE FROM auth.users WHERE id = $1", [id]);
});

// ---------------------------------------------------------------------------
// Ballot gate — both RPCs, fail closed
// ---------------------------------------------------------------------------
test("approved voter can submit a main ballot", async () => {
  // approvedVoter already submitted in before(); use a fresh voter.
  const voter = await createUser("VA Second Approved");
  await approveUser(voter);
  // A second period would be needed for a second ballot by the same voter —
  // instead assert the gate allows a *new* voter through a fresh period.
  const period = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2027, 'PRC D''or 2027', true, now(), now() + interval '60 days')
       RETURNING id`,
    )
  ).rows[0].id;
  const ballot = players.slice(0, 10);
  await asRole("authenticated", voter);
  await submitMain(period, ballot);
  await resetRole();
  const n = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [voter],
  );
  assert.equal(n.rows[0].n, 10, "approved voter's ballot landed");
});

test("pending voter is blocked from the main ballot", async () => {
  const period = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2028, 'PRC D''or 2028', true, now(), now() + interval '60 days')
       RETURNING id`,
    )
  ).rows[0].id;
  await asRole("authenticated", pendingVoter);
  await raises(
    () => submitMain(period, players.slice(0, 10)),
    /voter approval: pending admin approval/,
  );
  await resetRole();
  const n = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [pendingVoter],
  );
  assert.equal(n.rows[0].n, 0, "no rows written for pending");
});

test("rejected voter is blocked from the main ballot", async () => {
  const period = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2029, 'PRC D''or 2029', true, now(), now() + interval '60 days')
       RETURNING id`,
    )
  ).rows[0].id;
  await asRole("authenticated", rejectedVoter);
  await raises(
    () => submitMain(period, players.slice(0, 10)),
    /voter approval: account rejected/,
  );
  await resetRole();
  const n = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [rejectedVoter],
  );
  assert.equal(n.rows[0].n, 0);
});

test("missing approval row fails closed on the main ballot", async () => {
  const period = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2030, 'PRC D''or 2030', true, now(), now() + interval '60 days')
       RETURNING id`,
    )
  ).rows[0].id;
  await asRole("authenticated", missingVoter);
  await raises(
    () => submitMain(period, players.slice(0, 10)),
    /voter approval: no approval record/,
  );
  await resetRole();
});

test("pending / rejected / missing are blocked on the special ballot too", async () => {
  // Open a special award with five candidates (award_key CHECK allows
  // only the four production keys).
  const award = (
    await db.query(
      `INSERT INTO public.special_awards (award_key, title, voting_period_id, voting_open)
       VALUES ('kopa', 'Kopa Test', $1, true)
       RETURNING id`,
      [periodId],
    )
  ).rows[0].id;
  for (let i = 0; i < 5; i++) {
    await db.query(
      "INSERT INTO public.special_award_candidates (award_id, player_id) VALUES ($1, $2)",
      [award, players[i]],
    );
  }
  const candidates = (
    await db.query(
      "SELECT id FROM public.special_award_candidates WHERE award_id = $1 ORDER BY created_at, id",
      [award],
    )
  ).rows.map((r) => r.id);
  assert.equal(candidates.length, 5);

  for (const [voter, pattern] of [
    [pendingVoter, /voter approval: pending admin approval/],
    [rejectedVoter, /voter approval: account rejected/],
    [missingVoter, /voter approval: no approval record/],
  ]) {
    await asRole("authenticated", voter);
    await raises(() => submitSpecial(award, candidates), pattern);
    await resetRole();
  }

  const n = await db.query(
    "SELECT count(*)::int AS n FROM public.special_votes",
  );
  assert.equal(n.rows[0].n, 0, "no special votes written by blocked voters");

  // Approved voter succeeds.
  await asRole("authenticated", approvedVoter);
  await submitSpecial(award, candidates);
  await resetRole();
  const n2 = await db.query(
    "SELECT count(*)::int AS n FROM public.special_votes WHERE voter_id = $1",
    [approvedVoter],
  );
  assert.equal(n2.rows[0].n, 5);
});

test("admins pass the gate even without relying on a personal approved row", async () => {
  const period = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2031, 'PRC D''or 2031', true, now(), now() + interval '60 days')
       RETURNING id`,
    )
  ).rows[0].id;
  await asRole("authenticated", adminId);
  await submitMain(period, players.slice(0, 10));
  await resetRole();
  const n = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
    [adminId],
  );
  assert.equal(n.rows[0].n, 10, "admin ballot accepted via role bypass");
});

// ---------------------------------------------------------------------------
// Admin decide RPC + audit + RLS
// ---------------------------------------------------------------------------
test("admin can approve a pending voter and the ballot then succeeds", async () => {
  const voter = await createUser("VA Approve Via Rpc");
  assert.equal(await approvalStatus(voter), "pending");

  await asRole("authenticated", adminId);
  await db.query(
    "SELECT public.admin_decide_registration($1, 'approved', NULL)",
    [voter],
  );
  await resetRole();

  assert.equal(await approvalStatus(voter), "approved");

  const audit = await db.query(
    `SELECT action, admin_user_id, target_user_id
       FROM public.admin_audit_log
      WHERE action = 'approve_registration' AND target_user_id = $1`,
    [voter],
  );
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].admin_user_id, adminId);

  const period = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2032, 'PRC D''or 2032', true, now(), now() + interval '60 days')
       RETURNING id`,
    )
  ).rows[0].id;
  await asRole("authenticated", voter);
  await submitMain(period, players.slice(0, 10));
  await resetRole();
});

test("admin can reject with a reason; reason is stored and audited", async () => {
  const voter = await createUser("VA Reject Via Rpc");
  await asRole("authenticated", adminId);
  await db.query(
    "SELECT public.admin_decide_registration($1, 'rejected', $2)",
    [voter, "suspicious multi-account"],
  );
  await resetRole();

  const row = (
    await db.query(
      "SELECT status, rejection_reason, decided_by FROM public.voter_approvals WHERE user_id = $1",
      [voter],
    )
  ).rows[0];
  assert.equal(row.status, "rejected");
  assert.equal(row.rejection_reason, "suspicious multi-account");
  assert.equal(row.decided_by, adminId);

  const audit = await db.query(
    `SELECT reason FROM public.admin_audit_log
      WHERE action = 'reject_registration' AND target_user_id = $1`,
    [voter],
  );
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].reason, "suspicious multi-account");
});

test("non-admins cannot list or decide registrations", async () => {
  await asRole("authenticated", approvedVoter);
  await raises(
    () =>
      db.query("SELECT * FROM public.admin_list_registration_requests(NULL)"),
    /not authorized: admin only/,
  );
  await raises(
    () =>
      db.query(
        "SELECT public.admin_decide_registration($1, 'approved', NULL)",
        [pendingVoter],
      ),
    /not authorized: admin only/,
  );
  await resetRole();
});

test("admin cannot decide their own registration", async () => {
  await asRole("authenticated", adminId);
  await raises(
    () =>
      db.query(
        "SELECT public.admin_decide_registration($1, 'rejected', NULL)",
        [adminId],
      ),
    /cannot decide your own registration/,
  );
  await resetRole();
});

test("clients have SELECT-only RLS on voter_approvals", async () => {
  // Own row visible.
  await asRole("authenticated", pendingVoter);
  const own = await db.query(
    "SELECT status FROM public.voter_approvals WHERE user_id = $1",
    [pendingVoter],
  );
  assert.equal(own.rows.length, 1);
  assert.equal(own.rows[0].status, "pending");

  // Another user's row invisible (RLS filters it out).
  const other = await db.query(
    "SELECT count(*)::int AS n FROM public.voter_approvals WHERE user_id = $1",
    [rejectedVoter],
  );
  assert.equal(other.rows[0].n, 0, "non-admin cannot read others' rows");

  // No INSERT privilege.
  await raises(
    () =>
      db.query(
        "INSERT INTO public.voter_approvals (user_id, status) VALUES ($1, 'approved')",
        [pendingVoter],
      ),
    /permission denied|new row violates|RLS/,
  );
  // No UPDATE privilege.
  await raises(
    () =>
      db.query(
        "UPDATE public.voter_approvals SET status = 'approved' WHERE user_id = $1",
        [pendingVoter],
      ),
    /permission denied|update violates|RLS/,
  );
  await resetRole();

  // Admin can read all rows.
  await asRole("authenticated", adminId);
  const all = await db.query(
    "SELECT count(*)::int AS n FROM public.voter_approvals",
  );
  assert.ok(all.rows[0].n >= 5, "admin sees the queue");
  await resetRole();
});

test("grants: authenticated has SELECT only; anon has nothing on the table", async () => {
  const priv = await db.query(
    `SELECT
       has_table_privilege('authenticated', 'public.voter_approvals', 'SELECT') AS sel,
       has_table_privilege('authenticated', 'public.voter_approvals', 'INSERT') AS ins,
       has_table_privilege('authenticated', 'public.voter_approvals', 'UPDATE') AS upd,
       has_table_privilege('authenticated', 'public.voter_approvals', 'DELETE') AS del,
       has_table_privilege('anon', 'public.voter_approvals', 'SELECT') AS anon_sel`,
  );
  const p = priv.rows[0];
  assert.equal(p.sel, true);
  assert.equal(p.ins, false);
  assert.equal(p.upd, false);
  assert.equal(p.del, false);
  assert.equal(p.anon_sel, false, "anon must not read approvals");
});

test("function EXECUTE: get_my_approval_status / admin_* are authenticated-only", async () => {
  const priv = await db.query(
    `SELECT
       has_function_privilege('anon', 'public.get_my_approval_status()', 'EXECUTE') AS a1,
       has_function_privilege('authenticated', 'public.get_my_approval_status()', 'EXECUTE') AS e1,
       has_function_privilege('anon', 'public.admin_list_registration_requests(text)', 'EXECUTE') AS a2,
       has_function_privilege('authenticated', 'public.admin_list_registration_requests(text)', 'EXECUTE') AS e2,
       has_function_privilege('anon', 'public.admin_decide_registration(uuid, text, text)', 'EXECUTE') AS a3,
       has_function_privilege('authenticated', 'public.admin_decide_registration(uuid, text, text)', 'EXECUTE') AS e3,
       has_function_privilege('anon', 'private.assert_voter_approved(uuid)', 'EXECUTE') AS a4,
       has_function_privilege('authenticated', 'private.assert_voter_approved(uuid)', 'EXECUTE') AS e4`,
  );
  const p = priv.rows[0];
  assert.equal(p.a1, false, "anon cannot call get_my_approval_status");
  assert.equal(p.e1, true);
  assert.equal(p.a2, false, "anon cannot list registrations");
  assert.equal(p.e2, true);
  assert.equal(p.a3, false, "anon cannot decide registrations");
  assert.equal(p.e3, true);
  assert.equal(p.a4, false, "anon cannot call the assert helper");
  assert.equal(
    p.e4,
    false,
    "authenticated cannot call the assert helper (only the ballot RPCs / owners)",
  );
});

// ---------------------------------------------------------------------------
// Historical data safety
// ---------------------------------------------------------------------------
test("historical vote rows are untouched by the approval system", async () => {
  const baseline = await db.query(
    `SELECT count(*)::int AS n,
            count(DISTINCT voter_id)::int AS voters,
            coalesce(sum(points), 0)::int AS points
       FROM public.votes`,
  );
  const row = baseline.rows[0];
  // At least the approved voter's 10 + admin's 10 + approved-again 10 + special path.
  assert.ok(row.n >= 30, `expected historical votes to survive, got ${row.n}`);

  // The approved voter's original ballot is byte-stable.
  const original = await db.query(
    `SELECT rank_position, points, ranked_player_id
       FROM public.votes
      WHERE voter_id = $1 AND voting_period_id = $2
      ORDER BY rank_position`,
    [approvedVoter, periodId],
  );
  assert.equal(original.rows.length, 10, "original ballot intact");
  assert.equal(original.rows[0].rank_position, 1);
  assert.equal(original.rows[0].points, 15, "server scoring unchanged");

  // The five rejected UUIDs own zero vote rows in this hermetic DB (they
  // never voted here) — production keeps their historical rows untouched
  // because this migration never DELETEs from votes.
  const cheaterVotes = await db.query(
    `SELECT count(*)::int AS n FROM public.votes
      WHERE voter_id = ANY($1::uuid[])`,
    [uuidArray(REJECTED_IDS)],
  );
  assert.equal(cheaterVotes.rows[0].n, 0);
});

test("re-running the five-UUID seed is idempotent and stays rejected", async () => {
  for (const id of REJECTED_IDS) {
    await db.query(
      `INSERT INTO public.voter_approvals (user_id, status, decided_at, decided_by, rejection_reason)
       SELECT $1, 'rejected'::public.voter_approval_status, now(), NULL::uuid,
              'Account removed by administrator: voting fraud'
       WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = $1)
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'rejected', decided_at = now(), decided_by = NULL,
         rejection_reason = EXCLUDED.rejection_reason, updated_at = now()`,
      [id],
    );
    const s = await db.query(
      "SELECT status FROM public.voter_approvals WHERE user_id = $1",
      [id],
    );
    assert.equal(s.rows[0].status, "rejected");
    const p = await db.query("SELECT 1 FROM public.profiles WHERE id = $1", [
      id,
    ]);
    assert.equal(p.rows.length, 0, "profile still absent after re-seed");
  }
});
