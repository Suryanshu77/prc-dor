// Special Awards — Master Control (all six awards in one atomic operation).
//
// Guards for the master-control RPC, whose live body now ships in
// src/supabase/migrations/20261120120000_position_group_awards.sql (it
// redefines admin_set_all_special_award_status with the six-key allow-list
// after 20261115120000_special_awards_master_control.sql introduced the
// four-key original).
//
//   * Static: the RPC keeps the sibling admin-RPC security contract
//     (SECURITY DEFINER + private.has_role('admin')), scopes itself to the
//     newest edition, validates EVERY award before a single write, uses
//     COALESCE NULL semantics (one column per call) and ships a lone UPDATE so
//     a failure can never leave the rows half-updated. Also pins the
//     admin UI wiring (labels, confirm dialog, null-not-undefined args).
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     never Supabase) and proves the master and individual controls compose
//     across all six awards: open-all -> publish -> hide -> close-all, then
//     reopen ONLY Yashin individually, then close-all again, plus the
//     rollback paths.
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
const MIGRATION_NAME = "20261120120000_position_group_awards.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = await readFile(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

function fnBody(text, name) {
  const start = text.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.ok(start >= 0, `function ${name} missing`);
  const open = text.indexOf("AS $$", start);
  assert.ok(open > start, `function ${name} has no AS $$ body`);
  const close = text.indexOf("$$;", open);
  assert.ok(close > open, `function ${name} body is not terminated`);
  return text.slice(start, close);
}

// PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
// output column name. Quoting it is a no-op on the Supabase versions these
// migrations already ran on.
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

// ==========================================================================
// Static guards
// ==========================================================================
test("migration file name follows the convention and lands after its siblings", () => {
  assert.match(path.basename(MIGRATION), /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(
    filesIndexOf("20261025120000_special_awards.sql") <
      filesIndexOf(MIGRATION_NAME),
    "must apply after the special-awards migration it extends",
  );
  assert.ok(
    filesIndexOf("20261113090000_yashin_variable_ballot.sql") <
      filesIndexOf(MIGRATION_NAME),
    "must apply after the yashin threshold migration it reuses",
  );
  assert.ok(
    filesIndexOf("20261115120000_special_awards_master_control.sql") <
      filesIndexOf(MIGRATION_NAME),
    "must apply after the original four-key master-control migration it replaces",
  );
  // The live RPC must be the only definition of itself: every rival
  // CREATE OR REPLACE must land earlier so this file wins the race.
  const rivals = FILES.filter(
    (f) =>
      f !== MIGRATION_NAME &&
      /CREATE OR REPLACE FUNCTION public\.admin_set_all_special_award_status/.test(
        readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"),
      ),
  );
  for (const rival of rivals) {
    assert.ok(
      filesIndexOf(rival) < filesIndexOf(MIGRATION_NAME),
      `the six-key master control must come after ${rival} so it wins the CREATE OR REPLACE race`,
    );
  }
});

function filesIndexOf(name) {
  const i = FILES.indexOf(name);
  assert.ok(i >= 0, `${name} must exist in the migration chain`);
  return i;
}

test("the RPC keeps the sibling admin security contract", () => {
  const body = fnBody(stripped, "admin_set_all_special_award_status");
  assert.match(
    stripped,
    /CREATE OR REPLACE FUNCTION public\.admin_set_all_special_award_status\(\s*_voting_open boolean DEFAULT NULL,\s*_results_visible boolean DEFAULT NULL\s*\)/,
    "NULL arguments mean 'leave unchanged' so one master action never clobbers the other column",
  );
  assert.match(body, /SECURITY DEFINER/);
  assert.match(body, /SET search_path = public, pg_temp/);
  assert.match(
    body,
    /IF NOT private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\) THEN/,
    "admin-only gate identical to admin_set_special_award_status",
  );
  assert.match(body, /RAISE EXCEPTION 'not authorized: admin only'/);
  assert.match(
    stripped,
    /REVOKE ALL ON FUNCTION public\.admin_set_all_special_award_status\(boolean, boolean\) FROM PUBLIC, anon;/,
  );
  assert.match(
    stripped,
    /GRANT EXECUTE ON FUNCTION public\.admin_set_all_special_award_status\(boolean, boolean\) TO authenticated;/,
  );
});

test("scope is self-contained: newest edition with special awards, all six keys required", () => {
  const body = fnBody(stripped, "admin_set_all_special_award_status");
  assert.match(
    body,
    /ORDER BY p\.year DESC, p\.id\s+LIMIT 1/,
    "client cannot pass ids; newest edition wins deterministically",
  );
  assert.match(
    body,
    /_keys CONSTANT text\[\] := ARRAY\['kopa', 'yashin', 'gerd_muller', 'socrates', 'best_midfielder', 'best_defender'\]/,
    "a single allow-list constant must name exactly the six awards",
  );
  assert.equal(
    (
      body.match(
        /ARRAY\['kopa', 'yashin', 'gerd_muller', 'socrates', 'best_midfielder', 'best_defender'\]/g,
      ) ?? []
    ).length,
    1,
    "the six-key list must be declared once and reused, never duplicated",
  );
  assert.match(body, /IF _missing IS NOT NULL THEN\s+RAISE EXCEPTION/);
  // The write must be restricted to the allow-list: never "every row of the
  // period", so an unrelated award in the same period stays untouched.
  assert.match(
    body,
    /UPDATE public\.special_awards[\s\S]*?WHERE voting_period_id = _period\s+AND award_key = ANY\(_keys\)/,
    "one UPDATE over the six scoped rows only",
  );
  assert.ok(
    !/WHERE voting_period_id = _period\s*;/.test(body),
    "no period-only filter may remain anywhere in the function",
  );
  assert.match(body, /COALESCE\(_voting_open, voting_open\)/);
  assert.match(body, /COALESCE\(_results_visible, results_visible\)/);
  assert.match(body, /GET DIAGNOSTICS _updated = ROW_COUNT;\s+RETURN _updated/);
});

test("completeness, threshold validation and the UPDATE all use the same six keys", () => {
  const body = fnBody(stripped, "admin_set_all_special_award_status");
  assert.match(
    body,
    /FROM unnest\(_keys\) AS k\s+WHERE NOT EXISTS/,
    "completeness check must still require every allow-listed key",
  );
  const validation = body.slice(
    body.indexOf("IF _voting_open IS TRUE THEN"),
    body.indexOf("UPDATE public.special_awards"),
  );
  assert.match(
    validation,
    /WHERE sa\.voting_period_id = _period\s+AND sa\.award_key = ANY\(_keys\)/,
    "threshold validation must ignore awards outside the allow-list",
  );
  const update = body.slice(body.indexOf("UPDATE public.special_awards"));
  assert.match(update, /award_key = ANY\(_keys\)/);
});

test("opening is validated for EVERY award before any write", () => {
  const body = fnBody(stripped, "admin_set_all_special_award_status");
  const validation = body.slice(
    body.indexOf("IF _voting_open IS TRUE THEN"),
    body.indexOf("UPDATE public.special_awards"),
  );
  assert.ok(validation.length > 0, "pre-write validation block missing");
  assert.match(
    validation,
    /CASE WHEN _award\.award_key = 'yashin' THEN 3 ELSE 5 END/,
    "thresholds must match admin_set_special_award_status (yashin 3, others 5)",
  );
  assert.ok(
    validation.indexOf("RAISE EXCEPTION") > validation.indexOf("FOR _award IN"),
    "validation must run before the UPDATE",
  );
  assert.match(
    validation,
    /cannot open voting for all six awards/,
    "one failure aborts the whole operation",
  );
});

test("admin UI wires the master controls with null (never undefined) args", async () => {
  const admin = await readFile(
    path.join(ROOT, "src/routes/_authenticated/admin.tsx"),
    "utf8",
  );
  assert.match(admin, /admin_set_all_special_award_status/);
  for (const label of [
    "Open Voting for All",
    "Close Voting for All",
    "Publish All Results",
    "Hide All Results",
  ]) {
    assert.ok(admin.includes(label), `missing master action label: ${label}`);
  }
  for (const status of [
    "All Voting Open",
    "All Voting Closed",
    "Mixed Voting Status",
    "All Results Visible",
    "All Results Hidden",
    "Mixed Results Status",
  ]) {
    assert.ok(admin.includes(status), `missing overall status: ${status}`);
  }
  // JSON.stringify drops `undefined` keys and PostgREST then cannot resolve
  // the RPC (PGRST202); every master call must send explicit nulls.
  const runMaster = admin.match(/async function runMaster\([\s\S]*?\n  \}/);
  assert.ok(runMaster, "runMaster must exist in admin.tsx");
  const rpcCall = runMaster[0].match(/supabase\.rpc\([\s\S]*?\);/);
  assert.ok(rpcCall, "runMaster must call supabase.rpc");
  assert.ok(
    !/\bundefined\b/.test(rpcCall[0]),
    "master RPC args must not use undefined",
  );
  assert.match(rpcCall[0], /cfg\.args/);
  // Confirmation dialog + busy guard before the RPC fires.
  assert.match(admin, /masterConfirm !== null/);
  assert.match(admin, /if \(masterBusy\) return;/);
  assert.match(admin, /Applying…/);
  // Individual controls must survive: the per-award RPC call stays intact.
  assert.match(admin, /admin_set_special_award_status/);
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain)
// ==========================================================================
let db;
let adminId;
let userId;
let periodId;
const awards = {}; // award_key -> id
const young = []; // 5 under-21 -> Kopa / Gerd / Socrates nominees
const gks = []; // 3 goalkeepers -> Yashin nominees
const mids = []; // 5 midfielders -> Best Midfielder nominees
const defs = []; // 5 defenders -> Best Defender nominees

async function createUser(fullName, meta = {}) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@master.test`,
      JSON.stringify({ full_name: fullName, ...meta }),
    ],
  );
  await db.query(
    "UPDATE public.voter_approvals SET status = 'approved', decided_at = now() WHERE user_id = $1",
    [id],
  );
  return id;
}

async function asUser(id) {
  await db.query("SELECT set_config('test.user_id', $1, false)", [id ?? ""]);
}

// Caller sets the impersonated user (asUser) first: the same helper is used
// for the admin happy path and for the non-admin rejection probes.
async function master(votingOpen, resultsVisible) {
  const r = await db.query(
    "SELECT public.admin_set_all_special_award_status($1, $2) AS n",
    [votingOpen, resultsVisible],
  );
  return r.rows[0].n;
}

async function statuses() {
  const r = await db.query(
    "SELECT award_key, voting_open, results_visible FROM public.special_awards WHERE voting_period_id = $1 ORDER BY award_key",
    [periodId],
  );
  return Object.fromEntries(
    r.rows.map((row) => [
      row.award_key,
      { open: row.voting_open, visible: row.results_visible },
    ]),
  );
}

async function expectStatuses(expected) {
  const actual = await statuses();
  assert.deepEqual(
    actual,
    expected,
    `unexpected award states: ${JSON.stringify(actual)}`,
  );
}

const allClosed = () =>
  Object.fromEntries(
    Object.keys(awards).map((k) => [k, { open: false, visible: false }]),
  );

before(async () => {
  db = new PGlite();
  await db.exec(await readFile(STUB, "utf8"));
  await db.exec(await readFile(STORAGE_STUB, "utf8"));
  await db.exec(await readFile(DEFAULT_ACL, "utf8"));
  for (const f of FILES) {
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }

  adminId = await createUser("Master Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );
  userId = await createUser("Plain Voter");

  for (let i = 0; i < 5; i++) {
    young.push(await createUser(`Young ${i}`, { age: "18" }));
  }
  for (let i = 0; i < 3; i++) {
    gks.push(
      await createUser(`Keeper ${i}`, { age: "30", position: "Goalkeeper" }),
    );
  }
  for (let i = 0; i < 5; i++) {
    mids.push(
      await createUser(`Mid ${i}`, { age: "26", position: "Midfielder" }),
    );
  }
  for (let i = 0; i < 5; i++) {
    defs.push(
      await createUser(`Def ${i}`, { age: "27", position: "Defender" }),
    );
  }

  await asUser(adminId);
  const edition = await db.query(
    "SELECT award_key, award_id, period_id FROM public.admin_create_special_award_edition(2027)",
  );
  periodId = edition.rows[0].period_id;
  for (const row of edition.rows) awards[row.award_key] = row.award_id;
  assert.equal(Object.keys(awards).length, 6, "all six awards seeded");
});

after(async () => {
  await db.close();
});

test("non-admins cannot run the master operation", async () => {
  await asUser(userId);
  await assert.rejects(
    () => master(true, null),
    /not authorized/,
    "plain user must be rejected",
  );
  await asUser(null);
  await assert.rejects(() => master(true, null), /not authorized/);
});

test("open-all rolls back completely while any award misses its threshold", async () => {
  await asUser(adminId);
  // No nominees yet: every award would fail its threshold, but even a single
  // failure must leave all six untouched (atomic pre-validation).
  await assert.rejects(
    () => master(true, null),
    /cannot open voting for all six awards/,
  );
  await expectStatuses(allClosed());
});

test("nominations satisfy the thresholds (5 / 3 / 5 / 5 / 5 / 5)", async () => {
  await asUser(adminId);
  const nominate = (awardKey, players) =>
    Promise.all(
      players.map((p) =>
        db.query("SELECT public.admin_nominate_player($1, $2)", [
          awards[awardKey],
          p,
        ]),
      ),
    );
  await nominate("kopa", young);
  await nominate("gerd_muller", young);
  await nominate("socrates", young);
  await nominate("yashin", gks);
  await nominate("best_midfielder", mids);
  await nominate("best_defender", defs);
  const counts = await db.query(
    `SELECT sa.award_key, count(*)::int n
       FROM public.special_award_candidates c
       JOIN public.special_awards sa ON sa.id = c.award_id
      GROUP BY sa.award_key`,
  );
  assert.deepEqual(
    Object.fromEntries(counts.rows.map((r) => [r.award_key, r.n])),
    {
      kopa: 5,
      yashin: 3,
      gerd_muller: 5,
      socrates: 5,
      best_midfielder: 5,
      best_defender: 5,
    },
  );
});

test("one award below threshold blocks open-all and updates nothing", async () => {
  // Yashin has 3 (its minimum) but Kopa loses a nominee -> Kopa fails at 4/5.
  await asUser(adminId);
  const victim = await db.query(
    "SELECT player_id FROM public.special_award_candidates WHERE award_id = $1 LIMIT 1",
    [awards.kopa],
  );
  await db.query("SELECT public.admin_remove_nominee($1, $2)", [
    awards.kopa,
    victim.rows[0].player_id,
  ]);
  await assert.rejects(
    () => master(true, null),
    /Kopa Trophy \(4\/5 nominees\)/,
  );
  await expectStatuses(allClosed());
  // restore the fifth nominee so the happy path can proceed
  await db.query("SELECT public.admin_nominate_player($1, $2)", [
    awards.kopa,
    victim.rows[0].player_id,
  ]);
});

test("open-all opens the six awards and leaves results hidden", async () => {
  await asUser(adminId);
  assert.equal(await master(true, null), 6, "exactly six rows updated");
  const s = await statuses();
  for (const key of Object.keys(awards)) {
    assert.equal(s[key].open, true, `${key} must be open`);
    assert.equal(s[key].visible, false, `${key} results must stay hidden`);
  }
});

test("publish-all flips visibility only; close-all flips voting only", async () => {
  await asUser(adminId);
  assert.equal(await master(null, true), 6);
  let s = await statuses();
  for (const key of Object.keys(awards)) {
    assert.equal(s[key].visible, true, `${key} results must be visible`);
    assert.equal(s[key].open, true, `${key} voting must stay open`);
  }

  assert.equal(await master(false, null), 6);
  s = await statuses();
  for (const key of Object.keys(awards)) {
    assert.equal(s[key].open, false, `${key} voting must be closed`);
    assert.equal(s[key].visible, true, `${key} results must stay visible`);
  }

  assert.equal(await master(null, false), 6);
  await expectStatuses(allClosed());
});

test("master and individual controls compose: reopen only Yashin, then close-all", async () => {
  await asUser(adminId);
  await db.query(
    "SELECT public.admin_set_special_award_status($1, true, false)",
    [awards.yashin],
  );
  let s = await statuses();
  assert.equal(s.yashin.open, true, "individual control must still work");
  for (const key of Object.keys(awards)) {
    if (key === "yashin") continue;
    assert.equal(s[key].open, false, `${key} must stay closed`);
  }
  // Mixed state: Yashin open, the other five closed.
  assert.equal(
    Object.values(s).filter((v) => v.open).length,
    1,
    "expected a mixed voting state",
  );

  // The master close-all sweeps the mixed state back to all-closed.
  assert.equal(await master(false, null), 6);
  await expectStatuses(allClosed());
});

test("an unrelated award in the same period is never blocked by, nor written to", async () => {
  await asUser(adminId);

  // The production table carries `CHECK (award_key IN ('kopa', ...))`, so a
  // seventh key cannot exist there today. Drop it here to model the future /
  // manual case this hardening defends against: the RPC must not rely on the
  // table constraint to know which six rows it owns.
  const con = await db.query(
    `SELECT c.conname
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'special_awards'
        AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%award_key%'`,
  );
  assert.ok(con.rows.length >= 1, "award_key CHECK constraint must exist");
  await db.query(
    `ALTER TABLE public.special_awards DROP CONSTRAINT "${con.rows[0].conname}"`,
  );

  // Open + published, zero nominees: unscoped validation would refuse to open
  // the six awards ('Legacy Trophy (0/5 nominees)') and unscoped writes would
  // close/hide this row.
  await db.query(
    `INSERT INTO public.special_awards
       (voting_period_id, award_key, title, voting_open, results_visible)
     VALUES ($1, 'legacy_trophy', 'Legacy Trophy', true, true)`,
    [periodId],
  );
  const legacyState = async () => {
    const r = await db.query(
      "SELECT voting_open, results_visible FROM public.special_awards WHERE voting_period_id = $1 AND award_key = 'legacy_trophy'",
      [periodId],
    );
    assert.equal(r.rows.length, 1, "legacy row must survive");
    return r.rows[0];
  };
  const expectLegacy = async (open, visible, after) => {
    const row = await legacyState();
    assert.equal(row.voting_open, open, `${after}: legacy voting_open changed`);
    assert.equal(
      row.results_visible,
      visible,
      `${after}: legacy results_visible changed`,
    );
  };

  // 1. open-all: the 0-nominee unrelated row must not block, and the return
  //    value proves only the six allow-listed rows were written.
  assert.equal(await master(true, null), 6, "exactly six rows updated");
  await expectLegacy(true, true, "after open-all");
  let s = await statuses();
  for (const key of Object.keys(awards)) {
    assert.equal(s[key].open, true, `${key} must be open`);
    assert.equal(s[key].visible, false, `${key} results must stay hidden`);
  }

  // 2. close-all must not close the unrelated row (it is open by design).
  assert.equal(await master(false, null), 6);
  await expectLegacy(true, true, "after close-all");
  s = await statuses();
  for (const key of Object.keys(awards)) {
    assert.equal(s[key].open, false, `${key} must be closed`);
  }

  // 3. hide-all must not hide the unrelated row (it is visible by design).
  assert.equal(await master(null, false), 6);
  await expectLegacy(true, true, "after hide-all");
  s = await statuses();
  for (const key of Object.keys(awards)) {
    assert.equal(s[key].visible, false, `${key} results must be hidden`);
  }

  // 4. publish-all must still only touch the six.
  assert.equal(await master(null, true), 6);
  await expectLegacy(true, true, "after publish-all");

  // The unrelated row is left in place so the completeness check below has to
  // cope with it.
});

test("EXECUTE stays authenticated-only and anon is locked out", async () => {
  const r = await db.query(
    `SELECT has_function_privilege('anon', 'public.admin_set_all_special_award_status(boolean, boolean)', 'EXECUTE') AS anon_exec,
            has_function_privilege('authenticated', 'public.admin_set_all_special_award_status(boolean, boolean)', 'EXECUTE') AS auth_exec`,
  );
  assert.equal(r.rows[0].anon_exec, false, "anon must not execute the RPC");
  assert.equal(r.rows[0].auth_exec, true, "authenticated keeps EXECUTE");
});

test("an incomplete edition aborts the master operation instead of updating a subset", async () => {
  // Final guard: drop one award row and prove the completeness check fires
  // before any write (candidates cascade away with their award) — even though
  // an unrelated row is still sitting in the same period, it neither satisfies
  // nor excuses the six required keys.
  await asUser(adminId);
  await db.query("DELETE FROM public.special_awards WHERE id = $1", [
    awards.socrates,
  ]);
  await assert.rejects(() => master(true, null), /special awards incomplete/);
  const remaining = await db.query(
    `SELECT count(*)::int n
       FROM public.special_awards
      WHERE voting_period_id = $1
        AND award_key IN ('kopa', 'yashin', 'gerd_muller', 'socrates', 'best_midfielder', 'best_defender')`,
    [periodId],
  );
  assert.equal(
    remaining.rows[0].n,
    5,
    "no allow-listed row may have been touched",
  );
  // The aborted transaction must not have written the unrelated row either.
  const legacy = await db.query(
    "SELECT voting_open, results_visible FROM public.special_awards WHERE voting_period_id = $1 AND award_key = 'legacy_trophy'",
    [periodId],
  );
  assert.equal(legacy.rows.length, 1, "unrelated row still present");
  assert.equal(legacy.rows[0].voting_open, true, "unrelated row untouched");
  assert.equal(legacy.rows[0].results_visible, true, "unrelated row untouched");
  // Leave the fixture consistent for any later run of this file.
  await db
    .query("SELECT public.admin_create_special_award_edition(2027)")
    .catch(() => null);
});
