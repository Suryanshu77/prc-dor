// Admin safety hardening — guards for
// src/supabase/migrations/20261031120000_admin_safety_hardening.sql plus the
// UI/script halves of findings H1, M1, M2, M3, M5, M6.
//
//   * Static: pins the security contract of the new/redefined RPCs (admin
//     gate, anon revoke, advisory locks, soft-delete-preserving H1, the
//     dropped 2-arg admin_get_ballot signature) and the frontend/script call
//     sites (period reset via RPC, declareWinner visibility fix, published-
//     edition removal warning, include-removed inspect, script lock + audit
//     shape).
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     it never touches Supabase), casts real ballots through
//     submit_main_ballot, then exercises admin_reset_votes, include-removed
//     inspection, analytics ordering, vote-stats gating and the locked
//     final-ranking save/reset against the real RPCs.
//
// The companion static contract of the historical audit migration is covered
// by tests/admin-audit-ranking.test.mjs; this file only covers the hardening
// layer on top of it.
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
const MIGRATION_NAME = "20261031120000_admin_safety_hardening.sql";
const AUDIT_MIGRATION = "20261030120000_admin_vote_audit_and_final_ranking.sql";
const FIX_MIGRATION = "20261031090000_fix_player_period_rank_display.sql";
const MAIN_BALLOT_MIGRATION = "20261027120000_secure_main_ballot.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const ADMIN_TSX = path.join(ROOT, "src/routes/_authenticated/admin.tsx");
const AUDIT_SECTION_TSX = path.join(
  ROOT,
  "src/components/admin/VoteAuditSection.tsx",
);
const REMOVE_SCRIPT = path.join(ROOT, "scripts/admin-remove-voter-ballot.sql");
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const stripped = readFileSync(MIGRATION, "utf8")
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const adminSrc = readFileSync(ADMIN_TSX, "utf8");
const auditSectionSrc = readFileSync(AUDIT_SECTION_TSX, "utf8");
const scriptSql = readFileSync(REMOVE_SCRIPT, "utf8");
const scriptStripped = scriptSql
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

// The function body only (between the AS $$ ... $$ markers) of the LAST
// definition of `name` in the hardening migration, so assertions see the
// effective body regardless of how many functions precede it.
function fnBody(name) {
  let start = stripped.lastIndexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.ok(start >= 0, `function ${name} missing from the migration`);
  const open = stripped.indexOf("AS $$", start);
  assert.ok(open > start, `function ${name} has no AS $$ body`);
  const close = stripped.indexOf("$$;", open);
  assert.ok(close > open, `function ${name} body is not terminated`);
  return stripped.slice(open, close);
}

// Everything from the function header up to the next CREATE/REVOKE, so the
// SECURITY DEFINER / signature section is visible too.
function headerOf(name) {
  const start = stripped.lastIndexOf(
    `CREATE OR REPLACE FUNCTION public.${name}`,
  );
  assert.ok(start >= 0, `function ${name} missing from the migration`);
  let end = stripped.indexOf("REVOKE ALL ON FUNCTION", start);
  const nextCreate = stripped.indexOf("CREATE OR REPLACE FUNCTION", start + 10);
  if (nextCreate > start && (end < 0 || nextCreate < end)) end = nextCreate;
  return stripped.slice(start, end > 0 ? end : undefined);
}

function loadMigration(file) {
  const name = path.basename(file);
  let text = readFileSync(file, "utf8");
  // PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
  // output column name. Quoting it is a no-op on the Supabase versions these
  // migrations already ran on.
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
test("migration follows the naming convention and lands after the audit layer", () => {
  assert.match(MIGRATION_NAME, /^\d{14}_[a-z0-9_]+\.sql$/);
  const auditIdx = FILES.indexOf(AUDIT_MIGRATION);
  const fixIdx = FILES.indexOf(FIX_MIGRATION);
  const hardeningIdx = FILES.indexOf(MIGRATION_NAME);
  assert.ok(auditIdx >= 0 && fixIdx >= 0, "predecessor migrations must exist");
  assert.ok(
    auditIdx < hardeningIdx,
    "the hardening migration must apply after the audit migration",
  );
  assert.ok(
    fixIdx < hardeningIdx,
    "the hardening migration must apply after the rank-display fix",
  );
  // The main-ballot test applies the cutover LAST, out of order; the
  // hardening migration must not depend on anything only that cutover
  // creates.
  assert.ok(
    !/submit_main_ballot/i.test(stripped),
    "the hardening migration must not touch the main-ballot RPC",
  );
  assert.ok(
    FILES.indexOf(MAIN_BALLOT_MIGRATION) < hardeningIdx ||
      MAIN_BALLOT_MIGRATION < MIGRATION_NAME,
    "ordering sanity for the cutover file",
  );
});

test("H1: admin_reset_votes is admin-gated, anon-revoked and audited", () => {
  const header = headerOf("admin_reset_votes");
  assert.match(header, /_period_id uuid/);
  assert.match(header, /_reason text DEFAULT NULL/);
  assert.match(header, /SECURITY DEFINER/);
  assert.match(header, /SET search_path = public, pg_temp/);
  const body = fnBody("admin_reset_votes");
  assert.match(body, /auth\.uid\(\)/);
  assert.match(body, /'not authorized: admin only'/);
  assert.match(
    body,
    /DELETE FROM public\.final_rankings/i,
    "H1 must clear the stale final ranking with the votes",
  );
  assert.match(
    body,
    /DELETE FROM public\.votes/i,
    "H1 preserves the original hard-delete reset semantics on purpose",
  );
  assert.match(body, /admin_audit_log/);
  assert.match(body, /'reset_votes'/);
  assert.match(body, /votes_deleted/);
  assert.match(body, /final_rankings_cleared/);
  assert.match(body, /pg_advisory_xact_lock/);
  assert.match(
    stripped,
    /REVOKE ALL ON FUNCTION public\.admin_reset_votes\(uuid, text\) FROM PUBLIC, anon;/,
  );
  assert.match(
    stripped,
    /GRANT EXECUTE ON FUNCTION public\.admin_reset_votes\(uuid, text\) TO authenticated;/,
  );
});

test("M2: admin_get_ballot gained the include-removed signature, not an overload", () => {
  assert.match(
    stripped,
    /DROP FUNCTION IF EXISTS public\.admin_get_ballot\(uuid, uuid\);/,
    "the 2-arg signature must be dropped to avoid ambiguity",
  );
  const header = headerOf("admin_get_ballot");
  assert.match(header, /_include_removed boolean DEFAULT false/);
  assert.match(header, /removed_at timestamptz/);
  assert.match(header, /removal_reason text/);
  assert.match(header, /SECURITY DEFINER/);
  const body = fnBody("admin_get_ballot");
  assert.match(body, /'not authorized: admin only'/);
  assert.match(
    body,
    /coalesce\(_include_removed, false\) OR v\.removed_at IS NULL/i,
    "the default path must still hide removed rows",
  );
  assert.match(
    stripped,
    /REVOKE ALL ON FUNCTION public\.admin_get_ballot\(uuid, uuid, boolean\)\s+FROM PUBLIC, anon;/,
  );
  assert.match(
    stripped,
    /GRANT EXECUTE ON FUNCTION public\.admin_get_ballot\(uuid, uuid, boolean\)\s+TO authenticated;/,
  );
});

test("M4: the analytics RPC now orders by the approved final position", () => {
  const body = fnBody("get_active_period_analytics");
  assert.match(body, /final_rankings/);
  assert.match(body, /fr\.final_position/);
  assert.match(
    body,
    /COALESCE\(\s*CASE WHEN c\.total_points > 0 THEN fr\.final_position END,\s*1000000 \+ c\.calc_row\s*\)/s,
    "the fallback must match get_period_results: calculated rows go last",
  );
  assert.ok(
    !/ORDER BY r\.total_points DESC, r\.first_place_votes DESC;/.test(body),
    "the plain calculated ordering must be gone",
  );
});

test("F8: vote stats are gated on results_visible for non-admins", () => {
  const body = fnBody("get_period_vote_stats");
  assert.match(body, /removed_at IS NULL/);
  assert.match(
    body,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
  );
  assert.match(
    body,
    /vp\.results_visible = true/,
    "non-admins may only count visible periods",
  );
  assert.match(body, /_period_id IS NULL OR v\.voting_period_id = _period_id/);
});

test("F9: final-ranking writes take the per-period advisory lock", () => {
  for (const fn of ["admin_save_final_ranking", "admin_reset_final_ranking"]) {
    const header = headerOf(fn);
    assert.match(
      header,
      /SECURITY DEFINER/,
      `${fn} must stay SECURITY DEFINER`,
    );
    assert.match(header, /SET search_path = public, pg_temp/);
    const body = fnBody(fn);
    assert.match(body, /'not authorized: admin only'/);
    assert.match(
      body,
      /pg_advisory_xact_lock\(\s*hashtextextended\('final_ranking:' \|\| _period_id::text, 0\)\s*\)/s,
      `${fn} must lock the period key shared with its sibling`,
    );
  }
  const save = fnBody("admin_save_final_ranking");
  const lockAt = save.search(/pg_advisory_xact_lock/);
  const countAt = save.search(/SELECT count\(\*\) INTO v_expected/);
  assert.ok(
    lockAt >= 0 && countAt > lockAt,
    "the expected count must be re-read after the lock is taken",
  );
  assert.match(
    save,
    /GET DIAGNOSTICS v_saved = ROW_COUNT;\s*IF v_saved <> v_expected THEN/s,
    "the INSERT must be verified against the locked count",
  );
});

test("M5: declareWinner publishes visibility alongside the announcement", () => {
  assert.match(
    adminSrc,
    /results_visible:\s*true,\s*results_published:\s*true/s,
    "declaring a winner must also make the standings visible (the bug)",
  );
  const declareIdx = adminSrc.indexOf("winner_id: winner.id");
  assert.ok(declareIdx >= 0, "declareWinner update site must exist");
  const window = adminSrc.slice(declareIdx, declareIdx + 200);
  assert.match(window, /results_visible:\s*true/);
});

test("H1 UI: the period reset calls the audited RPC, never a raw delete", () => {
  assert.match(
    adminSrc,
    /rpc\("admin_reset_votes"/,
    "resetVotes must go through the audit-logging RPC",
  );
  assert.ok(
    !/\.from\("votes"\)\s*\.delete\(/.test(adminSrc),
    "no raw votes delete may remain in the admin UI",
  );
  assert.match(adminSrc, /_period_id:/);
});

test("M1 UI: the removal dialog warns when the edition is already public", () => {
  assert.match(auditSectionSrc, /Published edition:/);
  assert.match(auditSectionSrc, /results_visible/);
  assert.match(auditSectionSrc, /results_published/);
  assert.ok(
    !/\.from\("votes"\)/.test(auditSectionSrc),
    "the audit section must never touch votes directly",
  );
  for (const rpc of [
    "admin_list_voters",
    "admin_get_ballot",
    "admin_preview_voter_removal",
    "admin_remove_voter_ballot",
    "admin_restore_voter_ballot",
  ]) {
    assert.ok(
      auditSectionSrc.includes(rpc),
      `the section must keep using ${rpc}`,
    );
  }
});

test("M2 UI: the inspect dialog reads removed rows and marks them", () => {
  const inspectCall = auditSectionSrc.match(
    /useBallotQuery\(\s*periodId,\s*inspectId,\s*true\s*\)/,
  );
  assert.ok(inspectCall, "the inspect query must pass _include_removed=true");
  assert.match(auditSectionSrc, /_include_removed:\s*includeRemoved/);
  assert.match(auditSectionSrc, /removed_at/);
  assert.match(auditSectionSrc, /"removed"|>\s*removed\s*</);
});

test("M3/M6 script: lock, affected-row guard and RPC-shaped audit details", () => {
  assert.match(
    scriptStripped,
    /pg_advisory_xact_lock/,
    "the manual script must take the same lock as the RPC",
  );
  assert.match(
    scriptStripped,
    /hashtextextended\(\s*'remove_ballot:' \|\| v_voter_id::text \|\| ':' \|\| v_period_id::text, 0\s*\)/s,
    "the lock key must match admin_remove_voter_ballot exactly",
  );
  const lockAt = scriptStripped.search(/pg_advisory_xact_lock/);
  const countAt = scriptStripped.search(/SELECT count\(\*\) INTO v_expected/);
  assert.ok(
    lockAt >= 0 && countAt > lockAt,
    "the ballot count must be taken under the lock",
  );
  assert.match(
    scriptStripped,
    /v_updated <> v_expected/,
    "the UPDATE must be verified against the locked count",
  );
  assert.match(scriptStripped, /'ballot_snapshot'/);
  assert.match(scriptStripped, /'points_removed'/);
  assert.ok(
    !/points_removed_from_standing/.test(scriptStripped),
    "the legacy audit key must be gone in favour of the RPC shape",
  );
  assert.match(
    scriptStripped,
    /'source', 'scripts\/admin-remove-voter-ballot\.sql'/,
  );
  assert.ok(
    !/TRUNCATE/i.test(scriptStripped),
    "the script soft-deletes, never truncates",
  );
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;
let period2026;
let adminId;
let voterA;
let voterB;
const players = [];

const uuidArray = (ids) => `{${ids.join(",")}}`;

async function createUser(fullName) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@hardening.test`,
      JSON.stringify({ full_name: fullName }),
    ],
  );
  return id;
}

async function asUser(userId) {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    userId ?? "",
  ]);
}

async function asAdmin() {
  await asUser(adminId);
  await db.query("SET ROLE authenticated");
}

async function asPlain(userId) {
  await asUser(userId);
  await db.query("SET ROLE authenticated");
}

async function resetRole() {
  await db.query("RESET ROLE");
  await asUser(null);
}

function submit(period, ids) {
  return db.query("SELECT public.submit_main_ballot($1, $2::uuid[])", [
    period,
    uuidArray(ids),
  ]);
}

async function raisesAsAdmin(fn, pattern) {
  await asAdmin();
  try {
    await fn();
    assert.fail("expected the call to raise");
  } catch (err) {
    assert.match(String(err.message), pattern);
  } finally {
    await resetRole();
  }
}

async function raisesAsPlain(fn, pattern) {
  await asPlain(voterB);
  try {
    await fn();
    assert.fail("expected the call to raise");
  } catch (err) {
    assert.match(String(err.message), pattern);
  } finally {
    await resetRole();
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(await readFile(STUB, "utf8"));
  await db.exec(await readFile(STORAGE_STUB, "utf8"));
  await db.exec(await readFile(DEFAULT_ACL, "utf8"));
  for (const f of FILES) {
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }

  period2026 = (
    await db.query("SELECT id FROM public.voting_periods WHERE year = 2026")
  ).rows[0].id;

  adminId = await createUser("Hardening Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );
  for (let i = 0; i < 12; i++) players.push(await createUser(`H Player ${i}`));
  voterA = await createUser("H Voter A");
  voterB = await createUser("H Voter B");

  // Two real ballots, cast through the production RPC:
  //   A: P0..P9   B: P1..P9,P0
  // Ranked set: 10 players (every player with at least one point).
  const ballotA = players.slice(0, 10);
  const ballotB = [...players.slice(1, 10), players[0]];
  for (const [voter, ballot] of [
    [voterA, ballotA],
    [voterB, ballotB],
  ]) {
    await asUser(voter);
    await db.query("SET ROLE authenticated");
    await submit(period2026, ballot);
    await resetRole();
  }
});

after(async () => {
  await db.close();
});

// ---------------------------------------------------------------------------
// H1 - audited period reset
// ---------------------------------------------------------------------------
test("admin_reset_votes wipes the edition, clears final_rankings and audits", async () => {
  // A manually approved ranking that must not survive the reset.
  const ranked = (
    await db.query(
      `SELECT id FROM public.player_results_by_period
        WHERE voting_period_id = $1 AND total_points > 0`,
      [period2026],
    )
  ).rows.map((r) => r.id);
  await asAdmin();
  try {
    await db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
      period2026,
      uuidArray(ranked),
    ]);
  } finally {
    await resetRole();
  }

  const votesBefore = (
    await db.query(
      "SELECT count(*)::int AS n FROM public.votes WHERE voting_period_id = $1",
      [period2026],
    )
  ).rows[0].n;
  assert.ok(votesBefore > 0, "fixture must have votes to reset");

  let returned;
  await asAdmin();
  try {
    const r = await db.query("SELECT public.admin_reset_votes($1, $2) AS n", [
      period2026,
      "hardening test reset",
    ]);
    returned = r.rows[0].n;
  } finally {
    await resetRole();
  }

  assert.equal(returned, votesBefore, "the RPC returns the deleted row count");
  const after = (
    await db.query(
      `SELECT
         (SELECT count(*)::int FROM public.votes WHERE voting_period_id = $1) AS votes,
         (SELECT count(*)::int FROM public.final_rankings WHERE voting_period_id = $1) AS rankings`,
      [period2026],
    )
  ).rows[0];
  assert.equal(after.votes, 0, "all ballots are gone");
  assert.equal(after.rankings, 0, "the stale final ranking is gone too");

  const audit = (
    await db.query(
      `SELECT admin_user_id, reason, details, records_affected
         FROM public.admin_audit_log
        WHERE action = 'reset_votes' AND voting_period_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [period2026],
    )
  ).rows[0];
  assert.ok(audit, "the reset must leave an audit row");
  assert.equal(audit.admin_user_id, adminId);
  assert.equal(audit.reason, "hardening test reset");
  assert.equal(audit.records_affected, votesBefore);
  assert.equal(audit.details.votes_deleted, votesBefore);
  assert.ok(audit.details.final_rankings_cleared >= 1);
});

test("admin_reset_votes refuses non-admins and missing periods", async () => {
  await raisesAsPlain(
    () =>
      db.query("SELECT public.admin_reset_votes($1::uuid, $2::text)", [
        period2026,
        "probe",
      ]),
    /not authorized: admin only/,
  );
  await raisesAsAdmin(
    () =>
      db.query("SELECT public.admin_reset_votes($1::uuid, $2::text)", [
        randomUUID(),
        "probe",
      ]),
    /voting period does not exist/,
  );
});

// ---------------------------------------------------------------------------
// M2 - inspecting removed ballots
// ---------------------------------------------------------------------------
test("a removed ballot stays inspectable, but never counts again", async () => {
  // Recast a ballot for voterA (the reset above wiped the fixture votes).
  await asUser(voterA);
  await db.query("SET ROLE authenticated");
  await submit(period2026, players.slice(0, 10));
  await resetRole();

  let removed;
  await asAdmin();
  try {
    const r = await db.query(
      "SELECT public.admin_remove_voter_ballot($1, $2, $3) AS n",
      [period2026, voterA, "hardening test removal"],
    );
    removed = r.rows[0].n;
  } finally {
    await resetRole();
  }
  assert.equal(removed, 10);

  await asAdmin();
  try {
    const active = (
      await db.query("SELECT * FROM public.admin_get_ballot($1, $2)", [
        period2026,
        voterA,
      ])
    ).rows;
    assert.equal(active.length, 0, "the default view still hides removed rows");

    const all = (
      await db.query(
        "SELECT * FROM public.admin_get_ballot($1, $2, $3::boolean)",
        [period2026, voterA, true],
      )
    ).rows;
    assert.equal(all.length, 10, "include_removed reveals the full ballot");
    assert.deepEqual(
      all.map((r) => r.rank_position),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.ok(
      all.every((r) => r.removed_at !== null),
      "every revealed row carries its removal timestamp",
    );
    assert.equal(all[0].removal_reason, "hardening test removal");
    assert.ok(
      all.every((r) => r.total_points === 0),
      "the active total is zero once the ballot is removed",
    );
  } finally {
    await resetRole();
  }

  await raisesAsPlain(
    () =>
      db.query("SELECT * FROM public.admin_get_ballot($1, $2, $3::boolean)", [
        period2026,
        voterA,
        true,
      ]),
    /not authorized: admin only/,
  );

  // Put the fixture back in a clean state for the following tests.
  await asAdmin();
  try {
    await db.query("SELECT public.admin_restore_voter_ballot($1, $2)", [
      period2026,
      voterA,
    ]);
  } finally {
    await resetRole();
  }
});

// ---------------------------------------------------------------------------
// M4 - analytics follows the approved final order
// ---------------------------------------------------------------------------
test("get_active_period_analytics returns the manual order before the calculated one", async () => {
  const ranked = (
    await db.query(
      `SELECT id FROM public.player_results_by_period
        WHERE voting_period_id = $1 AND total_points > 0`,
      [period2026],
    )
  ).rows.map((r) => r.id);
  assert.equal(ranked.length, 10, "fixture must have 10 ranked players");
  const reversed = [...ranked].reverse();

  await asAdmin();
  try {
    await db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
      period2026,
      uuidArray(reversed),
    ]);
  } finally {
    await resetRole();
  }

  await asAdmin();
  try {
    const rows = (
      await db.query("SELECT * FROM public.get_active_period_analytics()")
    ).rows;
    assert.deepEqual(
      rows.slice(0, 10).map((r) => r.id),
      reversed,
      "the approved order must lead the analytics",
    );
  } finally {
    await resetRole();
  }
});

// ---------------------------------------------------------------------------
// F8 - vote stats respect results_visible
// ---------------------------------------------------------------------------
test("vote stats hide a hidden edition from non-admins and show it to admins", async () => {
  await db.query(
    "UPDATE public.voting_periods SET results_visible = false WHERE id = $1",
    [period2026],
  );

  await asAdmin();
  let adminStats;
  try {
    adminStats = (
      await db.query("SELECT * FROM public.get_period_vote_stats($1)", [
        period2026,
      ])
    ).rows[0];
  } finally {
    await resetRole();
  }
  assert.equal(adminStats.voter_count, 1, "only voterB's ballot is active");

  await asPlain(voterB);
  let plainStats;
  try {
    plainStats = (
      await db.query("SELECT * FROM public.get_period_vote_stats($1)", [
        period2026,
      ])
    ).rows[0];
  } finally {
    await resetRole();
  }
  assert.deepEqual(
    plainStats,
    { vote_count: 0, voter_count: 0 },
    "a hidden edition must read as empty to a non-admin",
  );

  await asPlain(voterB);
  let nullStats;
  try {
    nullStats = (await db.query("SELECT * FROM public.get_period_vote_stats()"))
      .rows[0];
  } finally {
    await resetRole();
  }
  assert.deepEqual(
    nullStats,
    { vote_count: 0, voter_count: 0 },
    "the unscoped call must not leak counts of hidden editions either",
  );

  await db.query(
    "UPDATE public.voting_periods SET results_visible = true WHERE id = $1",
    [period2026],
  );
  await asPlain(voterB);
  try {
    plainStats = (
      await db.query("SELECT * FROM public.get_period_vote_stats($1)", [
        period2026,
      ])
    ).rows[0];
    assert.equal(plainStats.voter_count, 1, "visible editions count again");
    assert.equal(plainStats.vote_count, 10);
  } finally {
    await resetRole();
  }
});

// ---------------------------------------------------------------------------
// F9 - locked final-ranking save/reset
// ---------------------------------------------------------------------------
test("admin_save_final_ranking still saves, audits and refuses non-admins", async () => {
  await db.query(
    "DELETE FROM public.final_rankings WHERE voting_period_id = $1",
    [period2026],
  );
  const ranked = (
    await db.query(
      `SELECT id FROM public.player_results_by_period
        WHERE voting_period_id = $1 AND total_points > 0`,
      [period2026],
    )
  ).rows.map((r) => r.id);

  let saved;
  await asAdmin();
  try {
    const r = await db.query(
      "SELECT public.admin_save_final_ranking($1, $2::uuid[]) AS n",
      [period2026, uuidArray(ranked)],
    );
    saved = r.rows[0].n;
  } finally {
    await resetRole();
  }
  assert.equal(saved, ranked.length);

  const audit = (
    await db.query(
      `SELECT details, records_affected FROM public.admin_audit_log
        WHERE action = 'save_final_ranking' AND voting_period_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [period2026],
    )
  ).rows[0];
  assert.ok(audit, "a save must be audited");
  assert.equal(audit.records_affected, ranked.length);

  await raisesAsPlain(
    () =>
      db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
        period2026,
        uuidArray(ranked),
      ]),
    /not authorized: admin only/,
  );

  let reset;
  await asAdmin();
  try {
    const r = await db.query(
      "SELECT public.admin_reset_final_ranking($1) AS n",
      [period2026],
    );
    reset = r.rows[0].n;
  } finally {
    await resetRole();
  }
  assert.equal(reset, ranked.length, "reset reports the cleared rows");
  const left = (
    await db.query(
      "SELECT count(*)::int AS n FROM public.final_rankings WHERE voting_period_id = $1",
      [period2026],
    )
  ).rows[0].n;
  assert.equal(left, 0);

  await raisesAsPlain(
    () => db.query("SELECT public.admin_reset_final_ranking($1)", [period2026]),
    /not authorized: admin only/,
  );
});
