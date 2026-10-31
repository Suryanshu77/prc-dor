// Secure main Ballon d'Or ballot submission — guards for
// src/supabase/migrations/20261027120000_secure_main_ballot.sql plus the
// vote.tsx cutover and the generated Supabase types.
//
//   * Static: pins the security contract (auth.uid()-derived voter, server-side
//     points, exactly-10 validation, privilege cutover, deferred validator,
//     no data mutation) and the frontend/type call sites.
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     it never touches Supabase), writes a legacy 2026 ballot BEFORE the new
//     migration to prove existing data and historical results survive it, then
//     exercises every rejection path of the RPC and the privilege boundary.
//
// Two harness accommodations are documented where they are applied:
//   1. tests/sql/05-stub-supabase-storage.sql stands in for Supabase's storage
//      schema so the storage-policy migration can apply in PGlite.
//   2. PostgreSQL 18 (PGlite) rejects `position` as a RETURNS TABLE output
//      column, while Supabase's PG15-17 accepts it; the two migrations that
//      use it are loaded with that identifier quoted. Semantics are unchanged.
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
const MIGRATION_NAME = "20261027120000_secure_main_ballot.sql";
// The vote-audit / final-ranking migration lands after this cutover. It is
// applied in the loop below (i.e. before MIGRATION_NAME in this harness, which
// only skips the file under test) and must never depend on anything this file
// creates — see the audit test for its own full-chain coverage.
const AUDIT_MIGRATION_NAME =
  "20261030120000_admin_vote_audit_and_final_ranking.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
// Simulates the live Supabase pg_default_acl so the privilege assertions are
// not vacuous: without the migration's REVOKEs, authenticated would inherit
// INSERT/TRUNCATE on public.votes from this default.
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// The frozen 2026 score map (src/lib/points.ts, tests/points.test.mjs).
const POINTS = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2];

const sql = readFileSync(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

function bodyOf(name) {
  const start = stripped.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.ok(start >= 0, `function ${name} missing from the migration`);
  const end = stripped.indexOf("REVOKE ALL ON FUNCTION", start);
  return stripped.slice(start, end > 0 ? end : undefined);
}

function loadMigration(file) {
  const name = path.basename(file);
  let text = readFileSync(file, "utf8");
  // Accommodation 2: PGlite runs PostgreSQL 18, where POSITION is not usable
  // as a RETURNS TABLE output column name. Quoting it is a no-op on the
  // Supabase versions these migrations already ran on.
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
test("migration follows the naming convention and keeps its place in history", () => {
  assert.match(MIGRATION_NAME, /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(
    FILES.indexOf("20261023120000_reconcile_permissions.sql") <
      FILES.indexOf("20261025120000_special_awards.sql"),
  );
  assert.ok(
    FILES.indexOf("20261025120000_special_awards.sql") <
      FILES.indexOf(MIGRATION_NAME),
    "the cutover must be applied after every earlier migration",
  );
  // Ordering is pinned relatively (the same relaxation special-awards applies):
  // newer migrations may follow this one, they must not precede it.
  assert.ok(
    FILES.indexOf(MIGRATION_NAME) < FILES.indexOf(AUDIT_MIGRATION_NAME),
    "the vote-audit migration must apply after the main-ballot cutover",
  );
  assert.match(AUDIT_MIGRATION_NAME, /^\d{14}_[a-z0-9_]+\.sql$/);
});

test("submit_main_ballot: two args only, SECURITY DEFINER, hardened search_path", () => {
  const m = stripped.match(
    /CREATE OR REPLACE FUNCTION public\.submit_main_ballot\(([^)]*)\)/,
  );
  assert.ok(m, "RPC definition not found");
  const params = m[1].replace(/\s+/g, " ").trim();
  assert.equal(params, "_period_id uuid, _player_ids uuid[]");
  const body = bodyOf("submit_main_ballot");
  assert.match(body, /LANGUAGE plpgsql/);
  assert.match(body, /SECURITY DEFINER/);
  assert.match(body, /SET search_path = public, pg_temp/);
  // No voter, rank or points argument exists to tamper with.
  assert.ok(
    !/(_voter|voter_id|rank_position|points)\s+uuid|points\s+int/i.test(params),
  );
});

test("identity, ballot shape and points are all derived server-side", () => {
  const body = bodyOf("submit_main_ballot");
  assert.match(
    body,
    /v_voter uuid := auth\.uid\(\)/,
    "voter comes from auth.uid()",
  );
  assert.match(body, /v_n <> 10/, "ballot size is the existing rule of 10");
  assert.match(body, /count\(DISTINCT t\.pid\).*<> 10/, "distinct players");
  assert.match(
    body,
    /public\.ballot_points_for_rank\(t\.ord::int\)/,
    "server points",
  );
  assert.match(body, /WITH ORDINALITY/, "ranks follow the submitted order");
  assert.match(body, /unknown player in ballot/);
  assert.match(body, /you cannot vote for yourself/);
  assert.match(body, /voting period does not exist/);
  assert.match(body, /voting period is not open/);
  assert.match(body, /ballot already submitted/);
  // The score map itself matches the frozen frontend constants.
  const map = bodyOf("ballot_points_for_rank");
  assert.match(map, /WHEN 1\s+THEN 15/);
  assert.match(map, /WHEN 10\s+THEN 2/);
});

test("concurrency: the advisory lock is taken before the duplicate check", () => {
  const body = bodyOf("submit_main_ballot");
  const lock = body.indexOf("pg_advisory_xact_lock");
  const dup = body.indexOf("ballot already submitted");
  assert.ok(lock > 0 && dup > lock, "lock must precede the duplicate check");
  assert.match(
    body,
    /pg_advisory_xact_lock\(\s*hashtextextended\(v_voter::text \|\| ':' \|\| _period_id::text, 0\)\s*\)/,
  );
});

test("direct writes are revoked while SELECT and the admin DELETE survive", () => {
  assert.match(stripped, /REVOKE ALL ON TABLE public\.votes FROM anon;/);
  assert.match(
    stripped,
    /REVOKE INSERT, UPDATE, TRUNCATE ON TABLE public\.votes FROM authenticated;/,
  );
  assert.match(
    stripped,
    /GRANT SELECT, DELETE ON TABLE public\.votes TO authenticated;/,
  );
  assert.ok(
    !/GRANT[^;]*\bINSERT\b[^;]*ON TABLE public\.votes/i.test(stripped),
    "no INSERT grant may remain on votes",
  );
  // The RLS insert guard keeps working for a hypothetical future re-grant.
  const policy = stripped.slice(
    stripped.indexOf("CREATE POLICY votes_insert_own"),
  );
  assert.match(
    policy.slice(0, 500),
    /public\.ballot_points_for_rank\(rank_position\)/,
  );
  assert.match(policy.slice(0, 500), /auth\.uid\(\) = voter_id/);
});

test("completeness is enforced by a deferred, INSERT-only constraint trigger", () => {
  assert.match(
    stripped,
    /CREATE CONSTRAINT TRIGGER trg_main_ballot_complete\s+AFTER INSERT ON public\.votes\s+DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.ok(
    !/CREATE (OR REPLACE )?TRIGGER[^\n]*\b(BEFORE|AFTER)\s+(DELETE|UPDATE)\s+ON public\.votes/i.test(
      stripped,
    ),
    "no row trigger may fire on deletes (admin reset + player deletion must keep working)",
  );
  assert.match(bodyOf("fn_validate_main_ballot"), /v_rows <> 10/);
  assert.match(
    bodyOf("fn_validate_main_ballot"),
    /IS DISTINCT FROM public\.ballot_points_for_rank/,
  );
  // SECURITY DEFINER keeps validation complete and callable from any writer
  // while EXECUTE stays revoked from the API roles.
  assert.match(bodyOf("fn_validate_main_ballot"), /SECURITY DEFINER/);
  assert.match(bodyOf("fn_trg_main_ballot_complete"), /SECURITY DEFINER/);
});

test("the migration mutates no data and no voting-period state", () => {
  assert.ok(!/UPDATE\s+public\./i.test(stripped), "no UPDATE of public tables");
  assert.ok(
    !/DELETE\s+FROM\s+public\./i.test(stripped),
    "no DELETE of public tables",
  );
  assert.ok(
    !/INSERT\s+INTO\s+public\.voting_periods/i.test(stripped),
    "no period is created or seeded",
  );
  assert.ok(!/TRUNCATE\s+(TABLE\s+)?public\./i.test(stripped), "no TRUNCATE");
  assert.ok(
    !/DROP TABLE|ALTER TABLE public\.votes\s*(ADD|DROP|RENAME)/i.test(stripped),
  );
  assert.ok(
    !/results_visible|is_active\s*=/i.test(bodyOf("submit_main_ballot")),
    "the RPC never writes period state",
  );
});

test("vote.tsx submits through the RPC and never builds rows itself", async () => {
  const src = await readFile(
    path.join(ROOT, "src/routes/_authenticated/vote.tsx"),
    "utf8",
  );
  assert.match(src, /supabase\.rpc\("submit_main_ballot"/);
  assert.match(src, /_period_id:\s*periodQ\.data!\.id/);
  assert.match(src, /_player_ids:\s*ranking\.map\(\(p\) => p\.id\)/);
  assert.ok(
    !/from\("votes"\)\s*\.insert/.test(src),
    "the vote page must not insert into votes directly",
  );
  assert.ok(
    !/points:\s*POINTS_BY_RANK/.test(src),
    "the client never sends points",
  );
  assert.match(
    src,
    /ranking\.length !== 10/,
    "UI still enforces a full ballot",
  );
  assert.match(
    src,
    /ballotErrorMessage/,
    "server rejections are surfaced clearly",
  );
});

test("generated Supabase types match the SQL parameter names", async () => {
  const types = await readFile(
    path.join(ROOT, "src/integrations/supabase/types.ts"),
    "utf8",
  );
  assert.match(
    types,
    /submit_main_ballot:\s*\{\s*Args:\s*\{\s*_period_id:\s*string;\s*_player_ids:\s*string\[\]\s*\};\s*Returns:\s*undefined;\s*\};/,
  );
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;
let periodId;
let adminId;
let legacyVoter;
const legacyBallot = [];
const players = [];
let legacyRowsBefore;
let periodsBefore;

async function createUser(fullName) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@main-ballot.test`,
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

const uuidArray = (ids) => `{${ids.join(",")}}`;

function submit(period, ids) {
  return db.query("SELECT public.submit_main_ballot($1, $2::uuid[])", [
    period,
    uuidArray(ids),
  ]);
}

async function ballotRows(voter) {
  const r = await db.query(
    "SELECT rank_position, points, ranked_player_id FROM public.votes WHERE voter_id = $1 ORDER BY rank_position",
    [voter],
  );
  return r.rows;
}

async function insertRows(voter, ids, period = periodId, points = POINTS) {
  for (let i = 0; i < ids.length; i++) {
    await db.query(
      `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [voter, ids[i], i + 1, points[i], period],
    );
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(await readFile(STUB, "utf8"));
  await db.exec(await readFile(STORAGE_STUB, "utf8"));
  await db.exec(await readFile(DEFAULT_ACL, "utf8"));
  for (const f of FILES) {
    if (f === MIGRATION_NAME) continue;
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }

  periodId = (
    await db.query("SELECT id FROM public.voting_periods WHERE year = 2026")
  ).rows[0].id;

  adminId = await createUser("Admin Proper");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );
  for (let i = 0; i < 12; i++) players.push(await createUser(`Player ${i}`));
  legacyVoter = await createUser("Legacy Voter");
  legacyBallot.push(...players.slice(0, 10));

  // Legacy ballot written by the OLD client path (direct INSERT, browser-side
  // points), i.e. genuinely pre-existing data, before the migration under test.
  await insertRows(legacyVoter, legacyBallot);

  legacyRowsBefore = (
    await db.query(
      "SELECT voter_id, ranked_player_id, rank_position, points, voting_period_id, created_at FROM public.votes ORDER BY created_at, rank_position",
    )
  ).rows;
  periodsBefore = (
    await db.query(
      "SELECT id, year, is_active, results_visible, starts_at, ends_at, winner_id FROM public.voting_periods ORDER BY year, id",
    )
  ).rows;

  await db.exec(await readFile(MIGRATION, "utf8"));
});

after(async () => {
  await db.close();
});

test("privilege matrix after the cutover", async () => {
  const r = await db.query(
    `SELECT
       has_table_privilege('authenticated', 'public.votes', 'INSERT')  AS a_ins,
       has_table_privilege('authenticated', 'public.votes', 'UPDATE')  AS a_upd,
       has_table_privilege('authenticated', 'public.votes', 'TRUNCATE') AS a_trunc,
       has_table_privilege('authenticated', 'public.votes', 'SELECT')  AS a_sel,
       has_table_privilege('authenticated', 'public.votes', 'DELETE')  AS a_del,
       has_table_privilege('anon', 'public.votes', 'INSERT')           AS n_ins,
       has_table_privilege('anon', 'public.votes', 'SELECT')           AS n_sel,
       has_function_privilege('anon', 'public.submit_main_ballot(uuid, uuid[])', 'EXECUTE') AS n_rpc,
       has_function_privilege('authenticated', 'public.submit_main_ballot(uuid, uuid[])', 'EXECUTE') AS a_rpc,
       has_function_privilege('authenticated', 'public.fn_validate_main_ballot(uuid, uuid)', 'EXECUTE') AS a_helper`,
  );
  const row = r.rows[0];
  assert.equal(row.a_ins, false, "authenticated INSERT must be revoked");
  assert.equal(
    row.a_upd,
    false,
    "authenticated UPDATE must be revoked (points are immutable)",
  );
  assert.equal(row.a_trunc, false, "authenticated TRUNCATE must be revoked");
  assert.equal(row.a_sel, true, "own-ballot read must survive");
  assert.equal(row.a_del, true, "admin reset must survive");
  assert.equal(row.n_ins, false);
  assert.equal(row.n_sel, false);
  assert.equal(row.n_rpc, false, "anon must not reach the RPC");
  assert.equal(row.a_rpc, true, "authenticated must be able to submit");
  assert.equal(
    row.a_helper,
    false,
    "internal helpers stay out of the RPC surface",
  );
});

test("an authenticated user cannot insert forged points (or insert at all)", async () => {
  const voter = await createUser("Forged Points");
  await asUser(voter);
  await db.query("SET ROLE authenticated");
  try {
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
           VALUES ($1, $2, 1, 1000, $3)`,
          [voter, players[10], periodId],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query("UPDATE public.votes SET points = 1000 WHERE voter_id = $1", [
          legacyVoter,
        ]),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("TRUNCATE public.votes"),
      /permission denied/,
    );
    // Own-ballot read still works (RLS votes_select_own).
    const own = await db.query(
      "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
      [voter],
    );
    assert.equal(own.rows[0].n, 0);
    const others = await db.query(
      "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
      [legacyVoter],
    );
    assert.equal(others.rows[0].n, 0, "RLS must hide other voters' ballots");
  } finally {
    await db.query("RESET ROLE");
  }
});

test("anon has no EXECUTE on the submission RPC", async () => {
  const voter = await createUser("Anon Caller");
  await asUser(voter);
  await db.query("SET ROLE anon");
  try {
    await assert.rejects(
      () => submit(periodId, legacyBallot),
      /permission denied for function submit_main_ballot/,
    );
  } finally {
    await db.query("RESET ROLE");
  }
});

test("legacy 2026 ballot and voting-period state survive the migration untouched", async () => {
  const rowsAfter = (
    await db.query(
      "SELECT voter_id, ranked_player_id, rank_position, points, voting_period_id, created_at FROM public.votes ORDER BY created_at, rank_position",
    )
  ).rows;
  assert.deepEqual(
    rowsAfter,
    legacyRowsBefore,
    "existing ballot rows must not change",
  );

  const periodsAfter = (
    await db.query(
      "SELECT id, year, is_active, results_visible, starts_at, ends_at, winner_id FROM public.voting_periods ORDER BY year, id",
    )
  ).rows;
  assert.deepEqual(
    periodsAfter,
    periodsBefore,
    "no period may be opened, closed or re-dated",
  );

  const legacy = await ballotRows(legacyVoter);
  assert.equal(legacy.length, 10);
  assert.deepEqual(
    legacy.map((r) => r.points),
    POINTS,
  );
});

test("historical results stay readable and visibility-gated", async () => {
  // Non-admin while results are hidden: nothing.
  await asUser(players[11]);
  await db.query("SET ROLE authenticated");
  try {
    const hidden = await db.query(
      "SELECT * FROM public.get_period_results($1)",
      [periodId],
    );
    assert.equal(hidden.rows.length, 0, "hidden results must stay hidden");
  } finally {
    await db.query("RESET ROLE");
  }

  // Admin always sees them, including the legacy ballot's totals.
  await asUser(adminId);
  await db.query("SET ROLE authenticated");
  try {
    const rows = (
      await db.query("SELECT * FROM public.get_period_results($1)", [periodId])
    ).rows;
    assert.ok(rows.length > 0, "admin must still read historical results");
    const total = rows.reduce((sum, r) => sum + r.total_points, 0);
    assert.equal(
      total,
      72,
      "the legacy ballot's 72 points must still be there",
    );
    const voted = await db.query("SELECT public.has_voted_in_period($1) AS v", [
      periodId,
    ]);
    assert.equal(voted.rows[0].v, false, "the admin has not voted");
  } finally {
    await db.query("RESET ROLE");
  }

  // The legacy voter still sees their own locked-in ballot.
  await asUser(legacyVoter);
  await db.query("SET ROLE authenticated");
  try {
    const mine = await db.query(
      "SELECT count(*)::int AS n FROM public.votes WHERE voting_period_id = $1",
      [periodId],
    );
    assert.equal(mine.rows[0].n, 10);
    const voted = await db.query("SELECT public.has_voted_in_period($1) AS v", [
      periodId,
    ]);
    assert.equal(voted.rows[0].v, true);
  } finally {
    await db.query("RESET ROLE");
  }

  // Opening visibility still unlocks results for everyone, then it is restored.
  await db.query(
    "UPDATE public.voting_periods SET results_visible = true WHERE id = $1",
    [periodId],
  );
  await asUser(players[11]);
  await db.query("SET ROLE authenticated");
  try {
    const open = await db.query("SELECT * FROM public.get_period_results($1)", [
      periodId,
    ]);
    assert.ok(open.rows.length > 0, "visibility toggle must still work");
  } finally {
    await db.query("RESET ROLE");
  }
  await db.query(
    "UPDATE public.voting_periods SET results_visible = false WHERE id = $1",
    [periodId],
  );
});

test("happy path: 10 rows, ranks by order, server-derived points, auth.uid() voter", async () => {
  const voter = await createUser("Honest Voter");
  await asUser(voter);
  const order = [
    players[3],
    players[0],
    players[7],
    players[1],
    players[9],
    players[2],
    players[8],
    players[4],
    players[6],
    players[5],
  ];
  await db.query("SET ROLE authenticated");
  try {
    await submit(periodId, order);
  } finally {
    await db.query("RESET ROLE");
  }
  const rows = await ballotRows(voter);
  assert.equal(rows.length, 10);
  assert.deepEqual(
    rows.map((r) => r.rank_position),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.deepEqual(
    rows.map((r) => r.points),
    POINTS,
  );
  assert.equal(
    rows.reduce((s, r) => s + r.points, 0),
    72,
  );
  assert.deepEqual(
    rows.map((r) => r.ranked_player_id),
    order,
    "submitted order becomes the ranking",
  );
});

test("there is no points/rank argument: a forged third argument is rejected", async () => {
  const voter = await createUser("Third Arg");
  await asUser(voter);
  await assert.rejects(
    () =>
      // Cast the two real parameters so PostgreSQL reports the attempted
      // overload with concrete types (untyped $1/$2 surface as `unknown`).
      db.query("SELECT public.submit_main_ballot($1::uuid, $2::uuid[], 1000)", [
        periodId,
        uuidArray(legacyBallot),
      ]),
    /function public\.submit_main_ballot\(uuid, uuid\[\], integer\) does not exist/,
  );
  const rows = await ballotRows(voter);
  assert.equal(rows.length, 0);
});

test("forged points on a direct write are rejected at COMMIT by the validator", async () => {
  const voter = await createUser("Direct Forged");
  const forged = new Array(10).fill(1000);
  await db.exec("BEGIN");
  try {
    await insertRows(voter, players.slice(0, 10), periodId, forged);
    await assert.rejects(
      () => db.exec("COMMIT"),
      /main_ballot_integrity: points do not match rank map/,
    );
  } finally {
    await db.exec("ROLLBACK").catch(() => null);
  }
  assert.equal(
    (await ballotRows(voter)).length,
    0,
    "the forged ballot must not persist",
  );
});

test("a partial direct write is rejected at COMMIT (deferred completeness check)", async () => {
  const voter = await createUser("Partial Direct");
  await db.exec("BEGIN");
  try {
    await insertRows(voter, players.slice(0, 5));
    await assert.rejects(
      () => db.exec("COMMIT"),
      /main_ballot_integrity: incomplete ballot/,
    );
  } finally {
    await db.exec("ROLLBACK").catch(() => null);
  }
  assert.equal((await ballotRows(voter)).length, 0);
});

test("a complete direct write with correct points still commits, and full-ballot deletes still work", async () => {
  const voter = await createUser("Direct Complete");
  await db.exec("BEGIN");
  await insertRows(voter, players.slice(2, 12));
  await db.exec("COMMIT");
  assert.equal((await ballotRows(voter)).length, 10);

  // Deleting a whole ballot (admin reset shape) is still allowed.
  await db.exec("BEGIN");
  await db.query("DELETE FROM public.votes WHERE voter_id = $1", [voter]);
  await db.exec("COMMIT");
  assert.equal((await ballotRows(voter)).length, 0);
});

test("ballot size is exactly 10: too few and too many are rejected before any insert", async () => {
  for (const ids of [
    legacyBallot.slice(0, 5),
    [...legacyBallot, players[10]],
  ]) {
    const voter = await createUser(`Size ${ids.length}`);
    await asUser(voter);
    await assert.rejects(() => submit(periodId, ids), /exactly 10/);
    assert.equal((await ballotRows(voter)).length, 0, "nothing may be written");
  }

  const nullVoter = await createUser("Null Id");
  await asUser(nullVoter);
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_main_ballot($1, $2::uuid[])", [
        periodId,
        `{${legacyBallot.slice(0, 9).join(",")},NULL}`,
      ]),
    /invalid player id/,
  );
  assert.equal((await ballotRows(nullVoter)).length, 0);
});

test("duplicate candidates are rejected before any insert", async () => {
  const voter = await createUser("Duplicate Candidate");
  await asUser(voter);
  const dup = [...legacyBallot.slice(0, 9), legacyBallot[0]];
  await assert.rejects(() => submit(periodId, dup), /duplicate player/);
  assert.equal((await ballotRows(voter)).length, 0);
});

test("unknown candidates are rejected before any insert", async () => {
  const voter = await createUser("Unknown Candidate");
  await asUser(voter);
  const unknown = [...legacyBallot.slice(0, 9), randomUUID()];
  await assert.rejects(() => submit(periodId, unknown), /unknown player/);
  assert.equal((await ballotRows(voter)).length, 0);
});

test("voting for yourself is rejected before any insert", async () => {
  const self = await createUser("Self Voter");
  await asUser(self);
  // The voter's own profile id must appear in the ballot: every other
  // candidate is a different, valid player.
  const ballot = [self, ...legacyBallot.slice(1, 10)];
  await assert.rejects(
    () => submit(periodId, ballot),
    /cannot vote for yourself/,
  );
  assert.equal((await ballotRows(self)).length, 0);
});

test("ranks are server-derived: out-of-range and duplicate ranks fail at the schema", async () => {
  const voter = await createUser("Bad Ranks");
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
         VALUES ($1, $2, 11, 2, $3)`,
        [voter, players[10], periodId],
      ),
    /check/i,
    "rank_position must stay inside 1..10",
  );
  await db.exec("BEGIN");
  try {
    await insertRows(voter, legacyBallot);
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
           VALUES ($1, $2, 1, 15, $3)`,
          [voter, players[11], periodId],
        ),
      /duplicate|unique/i,
      "one row per rank per voter per period",
    );
  } finally {
    await db.exec("ROLLBACK");
  }
  assert.equal((await ballotRows(voter)).length, 0);
});

test("closed and missing voting periods are rejected without touching period state", async () => {
  const voter = await createUser("Closed Period Voter");
  await asUser(voter);
  await db.query(
    "UPDATE public.voting_periods SET is_active = false WHERE id = $1",
    [periodId],
  );
  try {
    await assert.rejects(() => submit(periodId, legacyBallot), /not open/);
    assert.equal((await ballotRows(voter)).length, 0);
    await assert.rejects(
      () => submit(randomUUID(), legacyBallot),
      /does not exist/,
    );
  } finally {
    await db.query(
      "UPDATE public.voting_periods SET is_active = true WHERE id = $1",
      [periodId],
    );
  }
  const period = await db.query(
    "SELECT is_active FROM public.voting_periods WHERE id = $1",
    [periodId],
  );
  assert.equal(
    period.rows[0].is_active,
    true,
    "the test must leave the period open",
  );
});

test("unauthenticated callers are rejected", async () => {
  await asUser(null);
  await assert.rejects(
    () => submit(periodId, legacyBallot),
    /not authenticated/,
  );
});

test("repeat submission is rejected and the first ballot is unchanged", async () => {
  const voter = await createUser("Double Voter");
  await asUser(voter);
  await submit(periodId, legacyBallot);
  const before = await ballotRows(voter);
  await assert.rejects(
    () => submit(periodId, [...legacyBallot].reverse()),
    /already submitted/,
  );
  assert.deepEqual(
    await ballotRows(voter),
    before,
    "the first ballot must be intact",
  );
});

test("concurrent submissions: the advisory lock is held for the transaction, and the UNIQUE constraint is the backstop", async () => {
  const voter = await createUser("Racer");
  await asUser(voter);
  // PGlite has a single session, so a real two-session race cannot be run here.
  // What is proven instead: (a) the RPC itself takes the per-voter advisory
  // transaction lock before it can observe a duplicate, so a second session
  // would block instead of racing the check, and (b) even a writer that
  // bypasses the RPC cannot commit a second full ballot.
  await db.exec("BEGIN");
  try {
    await submit(periodId, legacyBallot);
    const locks = await db.query(
      "SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()",
    );
    assert.ok(
      locks.rows[0].n >= 1,
      "the submission must hold an advisory lock",
    );
    // Same-session stand-in for the loser of the race: the duplicate is seen
    // and rejected with a clean message instead of a UNIQUE violation.
    await assert.rejects(
      () => submit(periodId, legacyBallot),
      /already submitted/,
    );
  } finally {
    await db.exec("ROLLBACK");
  }
  assert.equal(
    (await ballotRows(voter)).length,
    0,
    "the failed attempt rolls back",
  );
  const released = await db.query(
    "SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()",
  );
  assert.equal(released.rows[0].n, 0, "the lock is transaction-scoped");

  // Hard backstop: once one ballot exists, a writer that bypasses the RPC
  // (an owner-level maintenance script, say) still cannot commit a second one.
  // The pre-existing UNIQUE(voter_id, rank_position, voting_period_id) rejects
  // the first colliding row inside the open transaction, so the whole attempt
  // aborts before anything can be committed.
  await submit(periodId, legacyBallot);
  assert.equal((await ballotRows(voter)).length, 10);
  await db.exec("BEGIN");
  try {
    await assert.rejects(
      () => insertRows(voter, [...legacyBallot].reverse()),
      /duplicate|unique/i,
    );
  } finally {
    await db.exec("ROLLBACK").catch(() => null);
  }
  assert.equal(
    (await ballotRows(voter)).length,
    10,
    "only the first ballot remains",
  );
});

test("admin reset (DELETE) keeps working; voters cannot delete ballots", async () => {
  const scratch = (
    await db.query(
      "INSERT INTO public.voting_periods (year, title, is_active) VALUES (2031, 'Scratch period', false) RETURNING id",
    )
  ).rows[0].id;
  const voter = await createUser("Scratch Voter");
  await db.exec("BEGIN");
  await insertRows(voter, legacyBallot, scratch);
  await db.exec("COMMIT");
  assert.equal((await ballotRows(voter)).length, 10);

  // A non-admin can neither reset the period nor delete their own rows.
  await asUser(voter);
  await db.query("SET ROLE authenticated");
  try {
    await db.query("DELETE FROM public.votes WHERE voting_period_id = $1", [
      scratch,
    ]);
    assert.equal(
      (await ballotRows(voter)).length,
      10,
      "voters cannot delete ballots",
    );
  } finally {
    await db.query("RESET ROLE");
  }

  // The admin reset path (admin.tsx resetVotes) still deletes every ballot.
  await asUser(adminId);
  await db.query("SET ROLE authenticated");
  try {
    await db.query("DELETE FROM public.votes WHERE voting_period_id = $1", [
      scratch,
    ]);
  } finally {
    await db.query("RESET ROLE");
  }
  const left = await db.query(
    "SELECT count(*)::int AS n FROM public.votes WHERE voting_period_id = $1",
    [scratch],
  );
  assert.equal(left.rows[0].n, 0, "admin reset must clear the period");

  await db.query("DELETE FROM public.voting_periods WHERE id = $1", [scratch]);
});

test("internal validators stay out of the API surface", async () => {
  const voter = await createUser("Curious Caller");
  await asUser(voter);
  await db.query("SET ROLE authenticated");
  try {
    await assert.rejects(
      () =>
        db.query("SELECT public.fn_validate_main_ballot($1, $2)", [
          voter,
          periodId,
        ]),
      /permission denied for function/,
    );
    await assert.rejects(
      () => db.query("SELECT public.fn_trg_main_ballot_complete()"),
      /permission denied for function/,
    );
  } finally {
    await db.query("RESET ROLE");
  }
});
