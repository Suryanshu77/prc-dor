// Player period display rank — guards for
// src/supabase/migrations/20261031090000_fix_player_period_rank_display.sql
//
//   * Static: pins the fix contract — the 1000000 sort-key offset may only
//     live inside the ORDER BY of the ordered CTE and must never be selected
//     as the returned rank; the signature, return columns, SECURITY DEFINER,
//     search_path, grants, deterministic tie-breaking and the
//     results_visible/admin gate stay exactly as they were; the fix migration
//     only redefines this one function; the player profile page keeps
//     consuming the same RPC shape.
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     it never touches Supabase), casts three real ballots through
//     submit_main_ballot, then proves: the leader is rank 1, every rank is
//     within 1..N for the period's N players, a saved manual ranking comes
//     back as the approved final position, zero-point players are never
//     promoted, and the single-player filter never moves the window result.
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
const FIX_MIGRATION_NAME = "20261031090000_fix_player_period_rank_display.sql";
const AUDIT_MIGRATION_NAME =
  "20261030120000_admin_vote_audit_and_final_ranking.sql";
const FIX_MIGRATION = path.join(MIGRATIONS_DIR, FIX_MIGRATION_NAME);
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// Comment-stripped view of the fix, so guards can never trip over prose.
const fixSql = readFileSync(FIX_MIGRATION, "utf8")
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

// The function body only (between the AS $$ ... $$ markers).
function fixFnBody() {
  const start = fixSql.indexOf(
    "CREATE OR REPLACE FUNCTION public.get_player_period_rank",
  );
  assert.ok(
    start >= 0,
    "get_player_period_rank missing from the fix migration",
  );
  const open = fixSql.indexOf("AS $$", start);
  assert.ok(open > start, "function has no AS $$ body");
  const close = fixSql.indexOf("$$;", open);
  assert.ok(close > open, "function body is not terminated");
  return fixSql.slice(open, close);
}

function loadMigration(file) {
  const name = path.basename(file);
  let text = readFileSync(file, "utf8");
  // PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
  // output column. Quoting it is a no-op on the Supabase versions these
  // migrations already ran on. The fix migration itself does not touch it.
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
test("the fix migration follows the naming convention and lands after the audit migration", () => {
  assert.match(FIX_MIGRATION_NAME, /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(
    FILES.indexOf(AUDIT_MIGRATION_NAME) < FILES.indexOf(FIX_MIGRATION_NAME),
    "the fix must apply after the migration that introduced the bug",
  );
});

test("the fix migration only redefines the rank function — no schema or data changes", () => {
  assert.equal(
    (fixSql.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length,
    1,
    "exactly one function is redefined",
  );
  assert.match(
    fixSql,
    /CREATE OR REPLACE FUNCTION public\.get_player_period_rank\(/,
    "and it is get_player_period_rank",
  );
  assert.ok(
    !/\b(CREATE TABLE|CREATE POLICY|ALTER TABLE|ALTER COLUMN|INSERT INTO|UPDATE |DELETE FROM|TRUNCATE|DROP )\b/i.test(
      fixSql,
    ),
    "the fix touches neither schema objects nor data rows",
  );
});

test("static regression guard: the returned rank never exposes the 1000000 offset", () => {
  const body = fixFnBody();
  const hits = body.match(/1000000/g) ?? [];
  assert.equal(
    hits.length,
    1,
    "the offset survives exactly once, as an ORDER BY sort key",
  );
  // Everything the function returns is projected after `FROM ordered`, so the
  // offset must be gone before the projection starts.
  const fromOrdered = body.indexOf("FROM ordered");
  assert.ok(fromOrdered > 0, "the period must be ranked in an ordered CTE");
  assert.ok(
    !body.slice(fromOrdered).includes("1000000"),
    "the sort-key offset must never reach the projection returned as rank",
  );
  const projection = body.slice(
    body.lastIndexOf("SELECT", fromOrdered),
    fromOrdered,
  );
  assert.match(
    projection,
    /display_rank::int/,
    "rank is the ROW_NUMBER display position, not the COALESCE sort key",
  );
  assert.ok(
    !projection.includes("1000000"),
    "the final projection contains no offset",
  );
  assert.ok(
    !/AS\s+final_rank/.test(body),
    "the pre-fix projection alias that leaked the offset is gone",
  );
  // The display rank is a ROW_NUMBER over the complete period ...
  assert.match(
    body,
    /ROW_NUMBER\(\)\s+OVER\s*\(\s*ORDER BY\s+COALESCE\(/,
    "display_rank is a ROW_NUMBER over the manual-order sort key",
  );
  // ... computed before the single-player filter is applied.
  assert.match(
    body,
    /FROM ordered\s+WHERE id = _player_id/,
    "the player filter narrows the finished ranking, it never builds it",
  );
});

test("static: signature, security, tie-breaking, grants and the visibility gate are preserved", () => {
  assert.match(
    fixSql,
    /RETURNS TABLE \(\s*rank int,\s*total_points int,\s*first_place_votes int,\s*total_rankings int\s*\)/,
    "return columns and types are unchanged",
  );
  assert.match(
    fixSql,
    /LANGUAGE sql\s+STABLE\s+SECURITY DEFINER\s+SET search_path = public, pg_temp/,
    "security attributes are unchanged",
  );
  // Deterministic calculated order: points, then first-place votes, then id.
  assert.match(
    fixSql,
    /ORDER BY r\.total_points DESC, r\.first_place_votes DESC, r\.id/,
    "the calculated tie-breaking order is unchanged",
  );
  // Manual position wins, zero-point players fall back behind it, ties broken
  // by the calculated row.
  assert.match(
    fixSql,
    /CASE WHEN c\.total_points > 0 THEN fr\.final_position END,\s*1000000 \+ c\.calc_row\s*\),\s*c\.calc_row/,
    "the stored-position override and its fallback order are unchanged",
  );
  // The pre-existing results_visible/admin gate stays byte-identical.
  assert.match(
    fixSql,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
    "admins keep their gate",
  );
  assert.match(
    fixSql,
    /vp\.results_visible = true/,
    "published periods keep their gate",
  );
  assert.match(
    fixSql,
    /REVOKE ALL ON FUNCTION public\.get_player_period_rank\(uuid, uuid\) FROM PUBLIC, anon;/,
    "anon stays revoked",
  );
  assert.match(
    fixSql,
    /GRANT EXECUTE ON FUNCTION public\.get_player_period_rank\(uuid, uuid\) TO authenticated;/,
    "authenticated keeps its grant",
  );
});

test("static: the player profile page keeps consuming the same RPC shape", () => {
  const page = readFileSync(
    path.join(ROOT, "src/routes/_authenticated/players.$id.tsx"),
    "utf8",
  );
  assert.match(page, /supabase\.rpc\("get_player_period_rank", \{/);
  assert.match(page, /_player_id: id,/);
  assert.match(page, /_period_id: activePeriodQ\.data!\.id,/);
  assert.match(page, /return \(data \?\? \[\]\)\[0\] \?\? null;/);
  assert.match(page, /rankData\?\.rank \? `#\$\{rankData\.rank\}`/);
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;
let period2026;
let adminId;
let viewerId;
// Independent oracle: one window over the COMPLETE period, computed straight
// from the aggregate view as superuser before any manual ranking exists —
// never through the function under test.
let oracle;
const players = [];

const uuidArray = (ids) => `{${ids.join(",")}}`;

async function createUser(fullName) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@rank.test`,
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

// The RPC exactly as players.$id.tsx calls it, first row only. Callers must
// have selected a session user (admin for hidden periods).
async function periodRank(player, period = period2026) {
  const r = await db.query(
    "SELECT * FROM public.get_player_period_rank($1, $2)",
    [player, period],
  );
  return r.rows[0] ?? null;
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

  adminId = await createUser("Rank Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );
  for (let i = 0; i < 12; i++)
    players.push(await createUser(`Rank Player ${i}`));
  viewerId = await createUser("Rank Viewer");
  const voterA = await createUser("Rank Voter A");
  const voterB = await createUser("Rank Voter B");
  const voterC = await createUser("Rank Voter C");

  // Same fixture as the audit suite:
  //   A: P0..P9   B: P1..P9,P0   C: P2..P9,P0,P1
  // Totals: P0=20 P1=29 P2=37 P3=30 P4=25 P5=21 P6=18 P7=15 P8=12 P9=9
  // P10, P11 and every non-player profile stay on zero points.
  const ballotA = players.slice(0, 10);
  const ballotB = [...players.slice(1, 10), players[0]];
  const ballotC = [...players.slice(2, 10), players[0], players[1]];
  for (const [voter, ballot] of [
    [voterA, ballotA],
    [voterB, ballotB],
    [voterC, ballotC],
  ]) {
    await asUser(voter);
    await db.query("SET ROLE authenticated");
    await submit(period2026, ballot);
    await resetRole();
  }

  // The oracle runs as superuser (no role selected) over the complete period.
  oracle = (
    await db.query(
      `SELECT id, total_points,
              ROW_NUMBER() OVER (
                ORDER BY total_points DESC, first_place_votes DESC, id
              )::int AS rn
         FROM public.player_results_by_period
        WHERE voting_period_id = $1
        ORDER BY rn`,
      [period2026],
    )
  ).rows;
});

after(async () => {
  await db.close();
});

// ---------------------------------------------------------------------------
// Calculated order (no manual ranking yet)
// ---------------------------------------------------------------------------
test("without a manual ranking the highest-ranked player is rank 1", async () => {
  assert.equal(
    oracle[0].id,
    players[2],
    "fixture sanity: the 37-point player leads the calculated order",
  );
  await asAdmin();
  try {
    const leader = await periodRank(oracle[0].id);
    assert.ok(leader, "the period leader has a displayed rank");
    assert.equal(leader.rank, 1, "the highest-ranked player is #1");
    assert.equal(leader.total_points, 37, "and holds the fixture's 37 points");
  } finally {
    await resetRole();
  }
});

test("every returned rank is within 1..N for a period with N players", async () => {
  const n = oracle.length;
  assert.ok(n >= 12, "every fixture player has a row in the period");
  for (const p of players) {
    assert.ok(
      oracle.some((row) => row.id === p),
      "every fixture player appears in the period ranking",
    );
  }

  await asAdmin();
  try {
    const ranks = [];
    for (const row of oracle) {
      const r = await periodRank(row.id);
      assert.ok(r, `every player of the period has a rank row (${row.id})`);
      ranks.push(r.rank);
      assert.ok(
        r.rank >= 1 && r.rank <= n,
        `#${r.rank} must fall inside 1..${n}`,
      );
    }
    assert.deepEqual(
      [...ranks].sort((a, b) => a - b),
      Array.from({ length: n }, (_, i) => i + 1),
      "the period's ranks are exactly 1..N — no gaps, duplicates or offsets",
    );
  } finally {
    await resetRole();
  }
});

test("filtering for one player never changes the ROW_NUMBER calculation", async () => {
  const points = new Map(oracle.map((row) => [row.id, row.total_points]));
  await asAdmin();
  try {
    for (const row of oracle) {
      const r = await periodRank(row.id);
      assert.equal(
        r.rank,
        row.rn,
        "the per-player rank equals the window computed over the complete period",
      );
      assert.equal(
        r.total_points,
        points.get(row.id),
        "per-player points equal the full-period aggregate",
      );
    }
  } finally {
    await resetRole();
  }
});

test("the results_visible/admin gate is preserved", async () => {
  const original = (
    await db.query(
      "SELECT results_visible FROM public.voting_periods WHERE id = $1",
      [period2026],
    )
  ).rows[0].results_visible;
  try {
    // Hidden: a signed-in non-admin learns nothing.
    await asPlain(viewerId);
    assert.equal(
      await periodRank(players[2]),
      null,
      "a hidden period leaks no rank to ordinary users",
    );

    // Admins always see it, hidden or not.
    await resetRole();
    await asAdmin();
    const adminRow = await periodRank(players[2]);
    assert.equal(adminRow.rank, 1, "an admin sees the rank even while hidden");

    // Once published, the same ordinary user gets the row.
    await resetRole();
    await db.query(
      "UPDATE public.voting_periods SET results_visible = true WHERE id = $1",
      [period2026],
    );
    await asPlain(viewerId);
    const visibleRow = await periodRank(players[2]);
    assert.ok(visibleRow, "a published period returns the rank");
    assert.equal(visibleRow.rank, 1);
  } finally {
    await resetRole();
    await db.query(
      "UPDATE public.voting_periods SET results_visible = $1 WHERE id = $2",
      [original, period2026],
    );
  }
});

// ---------------------------------------------------------------------------
// Manual final ranking
// ---------------------------------------------------------------------------
test("a saved manual ranking is returned as the approved final position", async () => {
  const points = new Map(oracle.map((row) => [row.id, row.total_points]));
  await asAdmin();
  try {
    const preview = (
      await db.query("SELECT * FROM public.admin_get_ranking_preview($1)", [
        period2026,
      ])
    ).rows;
    assert.equal(
      preview.length,
      10,
      "only positive-point players are rankable",
    );
    assert.equal(preview[0].final_position, null, "no manual order yet");

    const calculated = preview.map((r) => r.player_id);
    const manual = [...calculated].reverse();
    const saved = await db.query(
      "SELECT public.admin_save_final_ranking($1, $2::uuid[]) AS n",
      [period2026, uuidArray(manual)],
    );
    assert.equal(saved.rows[0].n, 10);

    const stored = (
      await db.query(
        "SELECT player_id, final_position FROM public.final_rankings WHERE voting_period_id = $1 ORDER BY final_position",
        [period2026],
      )
    ).rows;
    assert.deepEqual(
      stored.map((r) => r.player_id),
      manual,
      "the approval record holds exactly the submitted order",
    );

    const byPlayer = new Map(
      stored.map((r) => [r.player_id, r.final_position]),
    );
    for (const id of manual) {
      const row = await periodRank(id);
      assert.equal(
        row.rank,
        byPlayer.get(id),
        "the returned rank matches the approved final position",
      );
      assert.equal(
        row.total_points,
        points.get(id),
        "saving an order never rewrites points",
      );
    }

    const formerLeader = await periodRank(calculated[0]);
    assert.equal(
      formerLeader.rank,
      manual.indexOf(calculated[0]) + 1,
      "the calculated leader moved to its approved position",
    );
    assert.equal(formerLeader.rank, 10, "and sits last in the reversed order");
  } finally {
    await resetRole();
  }
});

test("zero-point players cannot be promoted through the manual ranking", async () => {
  await asAdmin();
  try {
    const stored = (
      await db.query(
        "SELECT player_id, final_position FROM public.final_rankings WHERE voting_period_id = $1",
        [period2026],
      )
    ).rows;
    assert.equal(stored.length, 10, "the saved order covers the ranked set");
    const storedIds = new Set(stored.map((r) => r.player_id));

    for (const id of [players[10], players[11]]) {
      assert.ok(
        !storedIds.has(id),
        "a zero-point player is never part of the saved order",
      );
      const row = await periodRank(id);
      assert.ok(row, "zero-point players still get a displayed rank");
      assert.equal(row.total_points, 0);
      assert.ok(
        row.rank > 10,
        `a zero-point player must sit behind all stored positions (got #${row.rank})`,
      );
    }
    for (const row of oracle) {
      if (storedIds.has(row.id)) continue;
      const r = await periodRank(row.id);
      assert.ok(
        r.rank > 10,
        `an unranked profile (#${r.rank}) must sit behind the saved order`,
      );
    }

    // The save path itself refuses to place a zero-point player.
    const order = [...stored]
      .sort((a, b) => a.final_position - b.final_position)
      .map((r) => r.player_id);
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          period2026,
          uuidArray([...order.slice(0, 9), players[11]]),
        ]),
      /the ranking contains an unknown or unranked player/,
    );
    const after = (
      await db.query(
        "SELECT count(*)::int AS n FROM public.final_rankings WHERE voting_period_id = $1",
        [period2026],
      )
    ).rows;
    assert.equal(after[0].n, 10, "the rejected save changed nothing");
  } finally {
    await resetRole();
  }
});

test("the RPC keeps its exact shape and access control for existing consumers", async () => {
  const priv = (
    await db.query(`SELECT
        has_function_privilege('anon', 'public.get_player_period_rank(uuid, uuid)', 'EXECUTE') AS anon,
        has_function_privilege('authenticated', 'public.get_player_period_rank(uuid, uuid)', 'EXECUTE') AS authenticated
      `)
  ).rows[0];
  assert.equal(priv.anon, false, "anon must never execute the rank function");
  assert.equal(
    priv.authenticated,
    true,
    "authenticated consumers keep their grant",
  );

  await asAdmin();
  try {
    const r = await db.query(
      "SELECT * FROM public.get_player_period_rank($1, $2)",
      [players[2], period2026],
    );
    assert.equal(r.rows.length, 1, "the profile page reads rows[0]");
    const row = r.rows[0];
    assert.deepEqual(
      [...Object.keys(row)].sort(),
      ["rank", "total_points", "first_place_votes", "total_rankings"].sort(),
      "the consumer-facing columns are unchanged",
    );
    assert.ok(Number.isInteger(row.rank), "rank is an int");
    assert.ok(
      row.rank >= 1 && row.rank < 1000000,
      `#${row.rank} must be a sane display rank, never the internal sort key`,
    );
  } finally {
    await resetRole();
  }
});
