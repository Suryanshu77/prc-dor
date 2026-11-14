// Guards for src/supabase/migrations/20261113160000_profile_directory.sql
//   * Static: filename convention, profile columns + backfill rules, the
//     per-column grants (email never appears), the membership-gated
//     profiles visibility policy that replaces profiles_select_all,
//     follow_requests privileges and the RPC revoke/grant pairs.
//   * Functional: PGlite, hermetic - full migration chain, never Supabase.
//     Covers the pre-migration backfill, signup username generation, the
//     uniqueness/format invariants, effective column privileges under the
//     `authenticated` role, profile visibility across
//     approved/pending/rejected/admin/anon viewers, and the whole
//     follow-request state machine including its approval gates.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "src/supabase/migrations");
const MIGRATION_NAME = "20261113160000_profile_directory.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const TYPES_TS = path.join(ROOT, "src/integrations/supabase/types.ts");
const USE_PROFILE = path.join(ROOT, "src/lib/use-profile.ts");
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = readFileSync(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const NEW_PROFILE_COLUMNS = [
  "username",
  "banner_image",
  "favourite_club",
  "favourite_player",
  "favourite_national_team",
  "favourite_league",
  "favourite_moment",
];

const PROFILE_COLUMNS_LIST = [
  "id",
  "full_name",
  "nickname",
  "age",
  "position",
  "jersey_number",
  "profile_image",
  "bio",
  "social_handle",
  "created_at",
  "updated_at",
  ...NEW_PROFILE_COLUMNS,
];

// PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
// output column (same accommodation as the other full-chain suites).
function loadMigration(file) {
  const name = path.basename(file);
  let text = readFileSync(file, "utf8");
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

async function bootPg() {
  const db = new PGlite();
  await db.exec(await readFile(STUB));
  await db.exec(await readFile(STORAGE_STUB));
  await db.exec(await readFile(DEFAULT_ACL));
  return db;
}

async function applyChain(db, files) {
  for (const f of files) {
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }
}

async function readFile(p) {
  return readFileSync(p, "utf8");
}

function grantStatements(text, table) {
  return text
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => /^GRANT /i.test(s) && new RegExp(`\\b${table}\\b`).test(s));
}

function columnsOf(grant) {
  const m = grant.match(/^GRANT\s+\w+\s*\(([^)]+)\)/i);
  return m ? m[1].split(",").map((c) => c.trim().toLowerCase()) : null;
}

function bodyOf(fn) {
  const start = stripped.lastIndexOf(`CREATE OR REPLACE FUNCTION ${fn}`);
  assert.ok(start >= 0, `${fn} missing from the migration`);
  const open = stripped.indexOf("AS $", start);
  const close = stripped.indexOf("$$;", open);
  return stripped.slice(start, close > 0 ? close : undefined);
}

// ==========================================================================
// Static guards
// ==========================================================================
test("migration file name follows the convention and lands after its predecessors", () => {
  assert.match(path.basename(MIGRATION), /^\d{14}_profile_directory\.sql$/);
  assert.ok(
    FILES.indexOf("20261023120000_reconcile_permissions.sql") <
      FILES.indexOf(MIGRATION_NAME),
    "must apply after permission reconciliation",
  );
  assert.ok(
    FILES.indexOf("20261111140000_voter_approval_system.sql") <
      FILES.indexOf(MIGRATION_NAME),
    "must apply after the voter-approval system",
  );
  assert.equal(
    FILES[FILES.length - 1],
    MIGRATION_NAME,
    "must be the newest migration",
  );
});

test("all seven profile columns are added and email stays untouched", () => {
  const alter = stripped.match(
    /ALTER TABLE public\.profiles\s+ADD COLUMN[^;]+;/i,
  );
  assert.ok(alter, "profiles ALTER TABLE missing");
  for (const col of NEW_PROFILE_COLUMNS) {
    assert.match(
      alter[0],
      new RegExp(`ADD COLUMN IF NOT EXISTS ${col} text`, "i"),
    );
  }
  assert.ok(
    !/ADD COLUMN[^;]*\bemail\b/i.test(stripped),
    "email must never be re-added or redefined",
  );
});

test("backfill + signup share one deterministic username algorithm", () => {
  for (const body of [bodyOf("public.handle_new_user"), stripped]) {
    assert.match(body, /'\[\^a-z0-9_\]', '', 'g'/);
    assert.match(body, /'user_' \|\| substr\(md5\(/);
    assert.match(body, /~ '\^\[0-9\]'/);
  }
  // Backfill loop and signup trigger both de-duplicate before writing.
  assert.match(stripped, /WHILE EXISTS \(/);
  assert.match(
    stripped,
    /UPDATE public\.profiles SET username = candidate WHERE id = rec\.id/,
  );
  assert.match(
    stripped,
    /INSERT INTO public\.profiles \(id, full_name, nickname, age, position, jersey_number, profile_image, email, username\)/,
    "signup must write the generated username",
  );
});

test("username invariants are enforced by the database, not the app", () => {
  assert.match(
    stripped,
    /ALTER TABLE public\.profiles ALTER COLUMN username SET NOT NULL/,
  );
  assert.match(
    stripped,
    /ADD CONSTRAINT profiles_username_format CHECK \(username ~ '\^\[a-z0-9_\]\{3,24\}\$'\)/,
  );
  assert.match(
    stripped,
    /CREATE UNIQUE INDEX profiles_username_lower_key\s+ON public\.profiles \(lower\(username\)\)/,
    "case-insensitive uniqueness must be an expression index",
  );
  assert.match(
    stripped,
    /CREATE TRIGGER trg_profiles_username_normalize/,
    "upper-case input is normalised rather than rejected",
  );
});

test("new profile columns join BOTH per-column grants; email joins neither", () => {
  const grants = grantStatements(sql, "public\\.profiles");
  assert.ok(grants.length >= 2, "expected SELECT and UPDATE grants");

  const select = grants.find((g) => /^GRANT SELECT \(/i.test(g));
  const update = grants.find((g) => /^GRANT UPDATE \(/i.test(g));
  assert.ok(select && update, "column-level SELECT and UPDATE grants required");

  for (const g of grants) {
    const cols = columnsOf(g);
    assert.ok(cols, `unrecognised profiles grant: ${g}`);
    assert.ok(!cols.includes("email"), `email leaked into grant: ${g}`);
    assert.ok(
      !/^GRANT (SELECT|UPDATE|ALL|INSERT|DELETE) ON (TABLE )?public\.profiles/i.test(
        g,
      ),
      `table-level grant re-exposes email: ${g}`,
    );
  }

  const selectCols = columnsOf(select);
  const updateCols = columnsOf(update);
  for (const col of PROFILE_COLUMNS_LIST) {
    assert.ok(selectCols.includes(col), `SELECT grant missing ${col}`);
  }
  for (const col of NEW_PROFILE_COLUMNS) {
    assert.ok(updateCols.includes(col), `UPDATE grant missing ${col}`);
  }
  assert.ok(!selectCols.includes("email"));
  assert.ok(!updateCols.includes("email"));
});

test("follow_requests is SELECT-only for clients and RLS-enabled", () => {
  assert.match(stripped, /CREATE TYPE public\.follow_request_status AS ENUM/);
  assert.match(stripped, /CREATE TABLE public\.follow_requests\s*\(/);
  assert.match(
    stripped,
    /ALTER TABLE public\.follow_requests ENABLE ROW LEVEL SECURITY/,
  );
  assert.match(
    stripped,
    /CREATE POLICY follow_requests_select_own ON public\.follow_requests/,
  );
  assert.match(
    stripped,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
  );

  const grants = grantStatements(sql, "public\\.follow_requests");
  for (const g of grants) {
    assert.match(
      g,
      /^GRANT SELECT ON TABLE public\.follow_requests TO authenticated/i,
      `only SELECT may be granted on follow_requests: ${g}`,
    );
  }
  assert.ok(
    !/GRANT (INSERT|UPDATE|DELETE|ALL)[^\n]*follow_requests/i.test(stripped),
    "clients must never write follow_requests directly",
  );

  // Self-follow and one-row-per-pair are schema-level invariants.
  assert.match(
    stripped,
    /CONSTRAINT follow_requests_no_self_follow CHECK \(follower_id <> followee_id\)/,
  );
  assert.match(
    stripped,
    /CONSTRAINT follow_requests_one_pair UNIQUE \(follower_id, followee_id\)/,
  );
  assert.match(
    stripped,
    /CONSTRAINT follow_requests_decided_state CHECK/,
    "pending must carry no decision",
  );
});

test("every follow RPC is revoked from anon and granted to authenticated", () => {
  for (const [name, args] of [
    ["request_follow", "uuid"],
    ["decide_follow", "uuid, text"],
    ["remove_follow", "uuid"],
  ]) {
    assert.ok(
      stripped.includes(
        `REVOKE ALL ON FUNCTION public.${name}(${args}) FROM PUBLIC, anon;`,
      ),
      `missing anon REVOKE for ${name}(${args})`,
    );
    assert.ok(
      stripped.includes(
        `GRANT EXECUTE ON FUNCTION public.${name}(${args}) TO authenticated;`,
      ),
      `missing authenticated GRANT for ${name}(${args})`,
    );
  }
});

test("follow RPCs authenticate before acting and are SECURITY DEFINER", () => {
  for (const fn of [
    "public.request_follow",
    "public.decide_follow",
    "public.remove_follow",
  ]) {
    const body = bodyOf(fn);
    assert.match(body, /SECURITY DEFINER/, `${fn} must be SECURITY DEFINER`);
    assert.match(body, /SET search_path = public, pg_temp/);
    assert.match(body, /auth\.uid\(\) IS NULL|v_(?:follower|uid) IS NULL/);
    assert.match(body, /'follow request: not authenticated'/);
  }
  // The follower side is gated on admin approval, fail-closed.
  assert.match(
    bodyOf("public.request_follow"),
    /PERFORM private\.assert_voter_approved\(v_follower\)/,
  );
  // The recipient side is gated too (approval may be revoked mid-request).
  assert.match(
    bodyOf("public.decide_follow"),
    /PERFORM private\.assert_voter_approved\(v_uid\)/,
  );
  assert.match(bodyOf("public.decide_follow"), /only the recipient can decide/);
  assert.match(bodyOf("public.decide_follow"), /already decided/);
  // remove_follow is deliberately ungated: a revoked member must still be
  // able to withdraw their own rows.
  assert.ok(
    !/assert_voter_approved/.test(bodyOf("public.remove_follow")),
    "remove_follow must stay ungated",
  );
});

test("profiles visibility replaces profiles_select_all with a gated policy", () => {
  // The helper must be SECURITY DEFINER so the policy can read
  // voter_approvals despite voter_approvals_select_own being own-row only;
  // a naive EXISTS in the policy would hide every other member's status.
  const helper = bodyOf("private.is_approved");
  assert.match(
    helper,
    /SECURITY DEFINER/,
    "is_approved must be SECURITY DEFINER",
  );
  assert.match(helper, /SET search_path = public, pg_temp/);
  assert.match(helper, /public\.voter_approvals/);
  assert.match(helper, /'approved'::public\.voter_approval_status/);
  // Admin bypass lives inside the helper (admins remain approved everywhere).
  assert.match(helper, /public\.user_roles/);
  assert.match(helper, /'admin'::public\.app_role/);

  // EXECUTE for the policy role only — never anon, never PUBLIC.
  assert.ok(
    stripped.includes(
      "REVOKE ALL ON FUNCTION private.is_approved(uuid) FROM PUBLIC, anon;",
    ),
    "is_approved must be revoked from PUBLIC and anon",
  );
  assert.ok(
    stripped.includes(
      "GRANT EXECUTE ON FUNCTION private.is_approved(uuid) TO authenticated, service_role;",
    ),
    "is_approved must be executable by the policy role",
  );

  // Old wide-open policy is dropped; the gated policy is the only SELECT
  // policy created here.
  assert.match(
    stripped,
    /DROP POLICY IF EXISTS profiles_select_all ON public\.profiles/,
  );
  assert.match(
    stripped,
    /CREATE POLICY profiles_select_visible ON public\.profiles/,
  );
  assert.ok(
    !/CREATE POLICY "?profiles_select_all"?/.test(stripped),
    "profiles_select_all must never be re-created",
  );

  // Policy shape: own row OR admin OR (viewer approved AND target approved).
  const start = stripped.indexOf("CREATE POLICY profiles_select_visible");
  assert.ok(start >= 0, "profiles_select_visible missing");
  const policy = stripped.slice(start, stripped.indexOf(";", start));
  assert.match(policy, /id = auth\.uid\(\)/, "own row must stay readable");
  assert.match(
    policy,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
    "admins must see every row",
  );
  assert.match(
    policy,
    /private\.is_approved\(auth\.uid\(\)\) AND private\.is_approved\(id\)/,
    "everyone else needs viewer AND target approved",
  );
  assert.match(policy, /TO authenticated/, "never applies to anon");

  // request_follow's target check uses the same helper, so an unapproved
  // target raises the same 'player not found' as a missing one.
  assert.match(
    bodyOf("public.request_follow"),
    /private\.is_approved\(p\.id\)/,
  );
});

test("generated Supabase types and PROFILE_COLUMNS expose the new surface", async () => {
  const types = await readFile(TYPES_TS);
  assert.match(types, /username: string;/);
  assert.match(types, /banner_image: string \| null;/);
  assert.match(types, /favourite_club: string \| null;/);
  assert.match(types, /follow_requests: \{/);
  assert.match(
    types,
    /follow_request_status: "pending" \| "approved" \| "rejected"/,
  );
  assert.match(types, /request_follow: \{/);
  assert.match(types, /decide_follow: \{/);
  assert.match(types, /remove_follow: \{/);

  const src = await readFile(USE_PROFILE);
  const match = src.match(/export const PROFILE_COLUMNS\s*=\s*"([^"]+)"/);
  assert.ok(match, "PROFILE_COLUMNS export not found");
  const cols = match[1].split(",").map((c) => c.trim());
  assert.ok(!cols.includes("email"), "PROFILE_COLUMNS must not include email");
  for (const col of PROFILE_COLUMNS_LIST) {
    assert.ok(cols.includes(col), `PROFILE_COLUMNS missing ${col}`);
  }
});

test("no later migration re-exposes profiles.email or grants unapproved columns", () => {
  // The reconcile file is the last REVOKE+GRANT before this migration, so
  // anything it grants to `authenticated` after that point is effective state.
  // Scanning every file would trip over the pre-reconcile table-level grant
  // and the deliberate service_role email grant, both of which the reconcile
  // REVOKE already superseded.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const start = files.indexOf("20261023120000_reconcile_permissions.sql");
  assert.ok(start >= 0, "reconcile_permissions must exist");

  const approved = new Set(PROFILE_COLUMNS_LIST);
  let checked = 0;

  for (const file of files.slice(start + 1)) {
    const text = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")
      .replace(/--[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const raw of text.split(";")) {
      const stmt = raw.replace(/\s+/g, " ").trim();
      if (!/^GRANT /i.test(stmt)) continue;
      if (!/\bpublic\.profiles\b/.test(stmt)) continue;
      if (!/\bauthenticated\b/.test(stmt)) continue;

      checked++;
      const m = stmt.match(
        /^GRANT (SELECT|UPDATE) \(([^)]+)\) ON (?:TABLE )?public\.profiles/i,
      );
      assert.ok(
        m,
        `${file}: table-level profiles grant would re-expose email: ${stmt}`,
      );
      const cols = m[2].split(",").map((c) => c.trim().toLowerCase());
      assert.ok(
        !cols.includes("email"),
        `${file}: grants profiles.email to authenticated`,
      );
      for (const col of cols) {
        assert.ok(
          approved.has(col),
          `${file}: grants unapproved profiles column "${col}"`,
        );
      }
    }
  }

  assert.ok(
    checked >= 2,
    "reconcile and profile-directory grants must be checked",
  );
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;

async function createUser(email, fullName, meta = {}) {
  // Setup always runs as the migration role: a prior test may have left the
  // session as `authenticated`, which has no privilege on auth.users.
  await asSuper();
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [id, email, JSON.stringify({ full_name: fullName, ...meta })],
  );
  return id;
}

async function approve(userId) {
  await db.query(
    "UPDATE public.voter_approvals SET status = 'approved', decided_at = now() WHERE user_id = $1",
    [userId],
  );
}

// voter_approvals_decided_state requires decided_at/decided_by to be NULL
// while pending and decided_at to be stamped on approved/rejected.
async function reject(userId) {
  await db.query(
    "UPDATE public.voter_approvals SET status = 'rejected', decided_at = now() WHERE user_id = $1",
    [userId],
  );
}

async function revokeToPending(userId) {
  await db.query(
    `UPDATE public.voter_approvals
        SET status = 'pending', decided_at = NULL, decided_by = NULL
      WHERE user_id = $1`,
    [userId],
  );
}

async function asUser(userId) {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    userId ?? "",
  ]);
  await db.query("SET ROLE authenticated");
}

async function asSuper() {
  await db.query("RESET ROLE");
  await db.query("SELECT set_config('test.user_id', '', false)");
}

async function usernameOf(id) {
  const r = await db.query(
    "SELECT username FROM public.profiles WHERE id = $1",
    [id],
  );
  return r.rows[0]?.username ?? null;
}

before(async () => {
  db = await bootPg();
  await applyChain(db, FILES);
});

after(async () => {
  await db?.close();
});

test("signup assigns a lowercase, format-valid, unique username", async () => {
  const id = await createUser("Lionel.Messi+10@Barca.test", "Lionel Messi");
  assert.equal(await usernameOf(id), "lionelmessi10");

  const digit = await createUser("10fan@club.test", "Ten Fan");
  assert.equal(await usernameOf(digit), "user_10fan");

  const short = await createUser("ab@x.test", "Tiny");
  const shortName = await usernameOf(short);
  assert.match(shortName, /^user_[0-9a-f]{8}$/);
});

test("identical e-mail local-parts never collide", async () => {
  const a = await createUser("ronaldo@one.test", "Ronaldo A");
  const b = await createUser("ronaldo@two.test", "Ronaldo B");
  const names = [await usernameOf(a), await usernameOf(b)].sort();
  assert.deepEqual(names, ["ronaldo", "ronaldo_2"]);
});

test("username invariants hold against direct writes", async () => {
  const owner = await createUser("keeper@one.test", "Keeper");
  const other = await createUser("keeper@two.test", "Keeper Two");
  const taken = await usernameOf(other);

  // Upper-case input is normalised, not rejected.
  await db.query(
    "UPDATE public.profiles SET username = 'KEEPER' WHERE id = $1",
    [owner],
  );
  assert.equal(await usernameOf(owner), "keeper");

  // Duplicate handle is rejected by the expression unique index.
  await assert.rejects(
    () =>
      db.query("UPDATE public.profiles SET username = $1 WHERE id = $2", [
        taken,
        owner,
      ]),
    /duplicate key|unique constraint/i,
  );

  // Too-short handles fail the format CHECK.
  await assert.rejects(
    () =>
      db.query("UPDATE public.profiles SET username = 'ab' WHERE id = $1", [
        owner,
      ]),
    /profiles_username_format|check constraint/i,
  );

  // email stays unselectable for authenticated.
  await asUser(owner);
  const priv = await db.query(
    `SELECT has_column_privilege('public.profiles', 'username', 'SELECT') AS u,
            has_column_privilege('public.profiles', 'email', 'SELECT') AS e,
            has_column_privilege('public.profiles', 'banner_image', 'SELECT') AS b,
            has_column_privilege('public.profiles', 'favourite_club', 'UPDATE') AS f`,
  );
  assert.deepEqual(priv.rows[0], { u: true, e: false, b: true, f: true });
  await asSuper();
});

test("backfill derives handles from e-mail local-parts before the index lands", async () => {
  const partial = await bootPg();
  try {
    await applyChain(partial, FILES.slice(0, FILES.indexOf(MIGRATION_NAME)));

    const a = randomUUID();
    const b = randomUUID();
    const c = randomUUID();
    for (const [id, email, name] of [
      [a, "Ronaldo@One.test", "Ronaldo"],
      [b, "ronaldo@two.test", "Ronaldo Two"],
      [c, "88fan@x.test", "Eighty Eight"],
    ]) {
      await partial.query(
        "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
        [id, email, JSON.stringify({ full_name: name })],
      );
    }

    const before = await partial.query(
      "SELECT count(*)::int AS n FROM public.profiles",
    );
    assert.equal(before.rows[0].n, 3, "three profiles exist pre-migration");

    await partial.exec(loadMigration(MIGRATION));

    const rows = await partial.query(
      "SELECT username FROM public.profiles WHERE id = ANY($1::uuid[]) ORDER BY username",
      [[a, b, c]],
    );
    assert.deepEqual(
      rows.rows.map((r) => r.username),
      ["ronaldo", "ronaldo_2", "user_88fan"],
    );

    const remaining = await partial.query(
      "SELECT count(*)::int AS n FROM public.profiles WHERE username IS NULL",
    );
    assert.equal(
      remaining.rows[0].n,
      0,
      "backfill must leave no NULL username",
    );
  } finally {
    await partial.close();
  }
});

test("authenticated can read the new profile columns and write them, but never email", async () => {
  const id = await createUser("viewer@one.test", "Viewer");
  await asUser(id);
  const r = await db.query(
    `SELECT username, banner_image, favourite_club, favourite_player,
            favourite_national_team, favourite_league, favourite_moment
       FROM public.profiles WHERE id = $1`,
    [id],
  );
  assert.equal(r.rows.length, 1);
  await assert.rejects(
    () => db.query("SELECT email FROM public.profiles WHERE id = $1", [id]),
    /permission denied/i,
  );
  await asSuper();
});

test("follow_requests: request, decide, re-request and withdraw", async () => {
  const follower = await createUser("follower@one.test", "Follower");
  const followee = await createUser("followee@one.test", "Followee");
  const stranger = await createUser("stranger@one.test", "Stranger");
  await approve(follower);
  await approve(followee);
  await approve(stranger);

  // Unauthenticated callers are rejected.
  await asUser(null);
  await assert.rejects(
    () => db.query("SELECT public.request_follow($1)", [followee]),
    /follow request: not authenticated/,
  );

  // Self-follow is rejected.
  await asUser(follower);
  await assert.rejects(
    () => db.query("SELECT public.request_follow($1)", [follower]),
    /cannot follow yourself/,
  );

  // Request lands as pending and is visible to both parties only.
  const pending = await db.query("SELECT public.request_follow($1) AS s", [
    followee,
  ]);
  assert.equal(pending.rows[0].s, "pending");

  const asFollower = await db.query(
    "SELECT status FROM public.follow_requests WHERE followee_id = $1",
    [followee],
  );
  assert.equal(asFollower.rows.length, 1);

  await asUser(stranger);
  const asStranger = await db.query(
    "SELECT count(*)::int AS n FROM public.follow_requests",
  );
  assert.equal(asStranger.rows[0].n, 0, "RLS hides other people's requests");

  // Only the recipient may decide.
  const requestId = asFollower.rows[0].id ?? null;
  await asUser(follower);
  const row = await db.query(
    "SELECT id FROM public.follow_requests WHERE follower_id = $1 AND followee_id = $2",
    [follower, followee],
  );
  assert.ok(row.rows.length === 1, "follower sees their own request");
  await assert.rejects(
    () =>
      db.query("SELECT public.decide_follow($1, 'approved')", [row.rows[0].id]),
    /only the recipient can decide/,
  );

  await asUser(followee);
  const decided = await db.query(
    "SELECT public.decide_follow($1, 'approved') AS s",
    [row.rows[0].id],
  );
  assert.equal(decided.rows[0].s, "approved");
  await assert.rejects(
    () =>
      db.query("SELECT public.decide_follow($1, 'rejected')", [row.rows[0].id]),
    /already decided/,
  );

  // Approved is idempotent for the follower.
  await asUser(follower);
  const again = await db.query("SELECT public.request_follow($1) AS s", [
    followee,
  ]);
  assert.equal(again.rows[0].s, "approved");

  // Withdraw / unfollow removes the row entirely.
  await db.query("SELECT public.remove_follow($1)", [followee]);
  const gone = await db.query(
    "SELECT count(*)::int AS n FROM public.follow_requests WHERE follower_id = $1",
    [follower],
  );
  assert.equal(gone.rows[0].n, 0);

  // A declined request can be re-opened by the follower.
  const follower2 = await createUser("follower2@one.test", "Follower Two");
  await approve(follower2);
  await asUser(follower2);
  await db.query("SELECT public.request_follow($1)", [followee]);
  const req2 = await db.query(
    "SELECT id FROM public.follow_requests WHERE follower_id = $1 AND followee_id = $2",
    [follower2, followee],
  );
  await asUser(followee);
  await db.query("SELECT public.decide_follow($1, 'rejected')", [
    req2.rows[0].id,
  ]);

  await asUser(follower2);
  const reopened = await db.query("SELECT public.request_follow($1) AS s", [
    followee,
  ]);
  assert.equal(
    reopened.rows[0].s,
    "pending",
    "a declined follow may be re-requested",
  );

  // Invalid decision text is rejected server-side.
  await asUser(followee);
  const req3 = await db.query(
    "SELECT id FROM public.follow_requests WHERE follower_id = $1 AND followee_id = $2",
    [follower2, followee],
  );
  await assert.rejects(
    () =>
      db.query("SELECT public.decide_follow($1, 'maybe')", [req3.rows[0].id]),
    /decision must be approved or rejected/,
  );

  await asSuper();
  assert.ok(requestId === null || typeof requestId === "string");
});

test("follow requests require an approved voter", async () => {
  const pendingUser = await createUser("pending@one.test", "Pending Member");
  const target = await createUser("target@one.test", "Target Member");
  await approve(target);

  await asUser(pendingUser);
  await assert.rejects(
    () => db.query("SELECT public.request_follow($1)", [target]),
    /voter approval: pending admin approval/,
  );
  await asSuper();
});

test("profiles visibility: approved/pending/rejected/admin/anon viewers", async () => {
  const viewer = await createUser("vis-viewer@one.test", "Approved Viewer");
  await approve(viewer);
  const targetOk = await createUser("vis-ok@one.test", "Approved Target");
  await approve(targetOk);
  const targetPending = await createUser(
    "vis-pending@one.test",
    "Pending Target",
  );
  const targetRejected = await createUser(
    "vis-rejected@one.test",
    "Rejected Target",
  );
  await reject(targetRejected);
  const admin = await createUser("vis-admin@one.test", "Admin Viewer");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [admin],
  );
  const cast = [viewer, targetOk, targetPending, targetRejected, admin];

  // Scope every read to this test's cast: the suite shares one database
  // with earlier createUser runs.
  async function visibleTo(uid) {
    await asUser(uid);
    const r = await db.query(
      "SELECT id FROM public.profiles WHERE id = ANY($1::uuid[]) ORDER BY id",
      [cast],
    );
    await asSuper();
    return r.rows.map((row) => row.id);
  }

  // Approved viewer: own row + approved targets (admins count as approved
  // via the helper's role bypass), never pending/rejected members.
  assert.deepEqual(
    await visibleTo(viewer),
    [
      ...cast.filter((id) => id === viewer || id === targetOk || id === admin),
    ].sort(),
  );

  // Pending viewer: own row only.
  assert.deepEqual(await visibleTo(targetPending), [targetPending]);

  // Rejected viewer: own row only (own profile stays readable).
  assert.deepEqual(await visibleTo(targetRejected), [targetRejected]);

  // Admin viewer: every row, approved or not.
  assert.deepEqual(await visibleTo(admin), [...cast].sort());

  // authenticated with no session (NULL uid): fail-closed, sees nothing.
  await asUser(null);
  const noSession = await db.query(
    "SELECT id FROM public.profiles WHERE id = ANY($1::uuid[])",
    [cast],
  );
  assert.equal(noSession.rows.length, 0, "NULL uid must see nothing");
  await asSuper();

  // anon holds no grant on profiles at all (RLS never even consulted).
  await db.query("SELECT set_config('test.user_id', '', false)");
  await db.query("SET ROLE anon");
  await assert.rejects(
    () => db.query("SELECT id FROM public.profiles"),
    /permission denied/i,
  );
  await asSuper();
});

test("request_follow targets must be approved (same error as missing)", async () => {
  const follower = await createUser("follow-gate@one.test", "Follow Gate");
  await approve(follower);
  const pendingTarget = await createUser(
    "follow-gate-p@one.test",
    "Pending Target",
  );
  const rejectedTarget = await createUser(
    "follow-gate-r@one.test",
    "Rejected Target",
  );
  await reject(rejectedTarget);
  const ghost = randomUUID();

  await asUser(follower);
  for (const target of [pendingTarget, rejectedTarget, ghost]) {
    await assert.rejects(
      () => db.query("SELECT public.request_follow($1)", [target]),
      /follow request: player not found/,
      "unapproved and missing targets must raise the identical error",
    );
  }
  await asSuper();
});

test("decide_follow requires an approved recipient", async () => {
  const follower = await createUser(
    "decide-gate-f@one.test",
    "Decide Follower",
  );
  await approve(follower);
  const followee = await createUser(
    "decide-gate-r@one.test",
    "Decide Recipient",
  );
  await approve(followee);

  await asUser(follower);
  await db.query("SELECT public.request_follow($1)", [followee]);
  const req = await db.query(
    "SELECT id FROM public.follow_requests WHERE follower_id = $1 AND followee_id = $2",
    [follower, followee],
  );
  assert.equal(req.rows.length, 1);
  await asSuper();

  // Approval revoked after the request arrived: pending recipient blocked.
  await revokeToPending(followee);
  await asUser(followee);
  await assert.rejects(
    () =>
      db.query("SELECT public.decide_follow($1, 'approved')", [req.rows[0].id]),
    /voter approval: pending admin approval/,
  );
  await asSuper();

  // Rejected recipient blocked too.
  await reject(followee);
  await asUser(followee);
  await assert.rejects(
    () =>
      db.query("SELECT public.decide_follow($1, 'approved')", [req.rows[0].id]),
    /voter approval: account rejected/,
  );
  await asSuper();

  // Approval restored: the still-pending request can now be decided.
  await approve(followee);
  await asUser(followee);
  const decided = await db.query(
    "SELECT public.decide_follow($1, 'approved') AS s",
    [req.rows[0].id],
  );
  assert.equal(decided.rows[0].s, "approved");
  await asSuper();
});

test("remove_follow stays available after approval is revoked", async () => {
  const follower = await createUser("withdraw-f@one.test", "Withdraw Follower");
  await approve(follower);
  const followee = await createUser("withdraw-r@one.test", "Withdraw Target");
  await approve(followee);

  await asUser(follower);
  await db.query("SELECT public.request_follow($1)", [followee]);
  await asSuper();

  await revokeToPending(follower);

  // Deliberately ungated: the revoked member can still withdraw.
  await asUser(follower);
  await db.query("SELECT public.remove_follow($1)", [followee]);
  const gone = await db.query(
    "SELECT count(*)::int AS n FROM public.follow_requests WHERE follower_id = $1 AND followee_id = $2",
    [follower, followee],
  );
  assert.equal(gone.rows[0].n, 0, "withdrawal must work without approval");
  await asSuper();
});

test("an unapproved admin can still follow (role bypass)", async () => {
  const admin = await createUser("follow-admin@one.test", "Admin Follow");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [admin],
  );
  const target = await createUser("follow-admin-t@one.test", "Admin Target");
  await approve(target);

  // Admin's own voter_approvals row is still 'pending' from signup.
  await asUser(admin);
  const r = await db.query("SELECT public.request_follow($1) AS s", [target]);
  assert.equal(r.rows[0].s, "pending", "admin bypass must skip the gate");
  await asSuper();
});

test("follow_requests writes are impossible for the client role", async () => {
  const id = await createUser("readonly@one.test", "Read Only");
  await asUser(id);
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO public.follow_requests (follower_id, followee_id) VALUES ($1, $2)",
        [id, id],
      ),
    /permission denied/i,
  );
  await assert.rejects(
    () => db.query("UPDATE public.follow_requests SET status = 'approved'"),
    /permission denied/i,
  );
  await assert.rejects(
    () => db.query("DELETE FROM public.follow_requests"),
    /permission denied/i,
  );
  await asSuper();
});
