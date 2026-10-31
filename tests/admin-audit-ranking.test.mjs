// Admin vote audit + manual final ranking — guards for
// src/supabase/migrations/20261030120000_admin_vote_audit_and_final_ranking.sql
// plus the two new admin sections and the generated Supabase types.
//
//   * Static: pins the security contract (soft delete only, no hard deletes, no
//     points rewrites, admin-only RPCs, no client write path to votes or
//     final_rankings) and the frontend/type call sites.
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     it never touches Supabase), casts three real ballots through
//     submit_main_ballot, then exercises inspection, removal, restore and the
//     manual final ranking against the real RPCs.
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
const MIGRATION_NAME = "20261030120000_admin_vote_audit_and_final_ranking.sql";
const MAIN_BALLOT_MIGRATION = "20261027120000_secure_main_ballot.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// The frozen 2026 score map (src/lib/points.ts).
const POINTS = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2];

const stripped = readFileSync(MIGRATION, "utf8")
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function bodyOf(name) {
  const start = stripped.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.ok(start >= 0, `function ${name} missing from the migration`);
  const end = stripped.indexOf("REVOKE ALL ON FUNCTION", start);
  return stripped.slice(start, end > 0 ? end : undefined);
}

// The function body only (between the AS $$ ... $$ markers), so assertions are
// never polluted by the privilege section that follows the last function.
function fnBody(name) {
  const start = stripped.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.ok(start >= 0, `function ${name} missing from the migration`);
  const open = stripped.indexOf("AS $$", start);
  assert.ok(open > start, `function ${name} has no AS $$ body`);
  const close = stripped.indexOf("$$;", open);
  assert.ok(close > open, `function ${name} body is not terminated`);
  return stripped.slice(open, close);
}

function loadMigration(file) {
  const name = path.basename(file);
  let text = readFileSync(file, "utf8");
  // PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
  // output column name. Quoting it is a no-op on the Supabase versions these
  // migrations already ran on. The migration under test already quotes it.
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
test("migration follows the naming convention and lands after the ballot cutover", () => {
  assert.match(MIGRATION_NAME, /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(
    FILES.indexOf(MAIN_BALLOT_MIGRATION) < FILES.indexOf(MIGRATION_NAME),
    "the audit migration must apply after the main-ballot cutover",
  );
});

test("ballots are soft-deleted: no hard delete, no points rewrite, no rank rewrite", () => {
  assert.ok(
    !/DELETE\s+FROM\s+public\.votes/i.test(stripped),
    "public.votes rows must never be hard-deleted",
  );
  assert.ok(
    !/TRUNCATE\s+(TABLE\s+)?public\.votes/i.test(stripped),
    "public.votes is never truncated",
  );
  assert.ok(
    !/UPDATE\s+public\.votes\s+SET\s+(?!removed_at)/i.test(stripped),
    "the only UPDATE on public.votes writes the removal columns",
  );
  assert.match(
    stripped,
    /ADD COLUMN IF NOT EXISTS removed_at timestamptz/,
    "removal is a new nullable column, so no existing row is rewritten",
  );
  assert.match(stripped, /ADD COLUMN IF NOT EXISTS removed_by uuid/);
  assert.match(stripped, /ADD COLUMN IF NOT EXISTS removal_reason text/);
  // Every aggregate honours the soft delete.
  for (const fn of ["get_period_vote_stats"]) {
    assert.match(
      fnBody(fn),
      /removed_at IS NULL/,
      `${fn} must ignore removed ballots`,
    );
  }
  for (const view of ["player_results", "player_results_by_period"]) {
    const start = stripped.indexOf(`CREATE OR REPLACE VIEW public.${view}`);
    assert.ok(start >= 0, `view ${view} missing`);
    const end = stripped.indexOf("CREATE OR REPLACE", start + 10);
    const body = stripped.slice(start, end > 0 ? end : undefined);
    assert.match(
      body,
      /removed_at IS NULL/,
      `${view} must ignore removed ballots`,
    );
  }
  const results = fnBody("get_period_results");
  assert.match(results, /player_results_by_period/);
  assert.ok(
    !/FROM public\.votes/i.test(results),
    "the standings read the filtered view, never raw votes",
  );
});

test("every admin RPC is SECURITY DEFINER, admin-gated and anon-revoked", () => {
  const rpcs = [
    ["admin_list_voters", "admin_list_voters(uuid)"],
    ["admin_get_ballot", "admin_get_ballot(uuid, uuid)"],
    ["admin_preview_voter_removal", "admin_preview_voter_removal(uuid, uuid)"],
    ["admin_get_ranking_preview", "admin_get_ranking_preview(uuid)"],
    [
      "admin_remove_voter_ballot",
      "admin_remove_voter_ballot(uuid, uuid, text)",
    ],
    ["admin_restore_voter_ballot", "admin_restore_voter_ballot(uuid, uuid)"],
    ["admin_save_final_ranking", "admin_save_final_ranking(uuid, uuid[])"],
    ["admin_reset_final_ranking", "admin_reset_final_ranking(uuid)"],
  ];
  for (const [name, signature] of rpcs) {
    const body = bodyOf(name);
    assert.match(body, /SECURITY DEFINER/, `${name} must be SECURITY DEFINER`);
    assert.match(
      body,
      /SET search_path = public, pg_temp/,
      `${name} search_path`,
    );
    assert.match(
      body,
      /auth\.uid\(\)/,
      `${name} must derive the caller from auth.uid()`,
    );
    assert.match(
      body,
      /'not authorized: admin only'/,
      `${name} must raise the shared admin error`,
    );
    assert.match(
      stripped,
      new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${signature.replace(/[[\]()]/g, "\\$&")} FROM PUBLIC, anon;`,
      ),
      `${name} must be revoked from anon`,
    );
    assert.match(
      stripped,
      new RegExp(
        `GRANT EXECUTE ON FUNCTION public\\.${signature.replace(/[[\]()]/g, "\\$&")} TO authenticated;`,
      ),
      `${name} must be reachable by signed-in users`,
    );
  }
});

test("moderation tables are admin-read-only and unwritable by API roles", () => {
  for (const table of ["admin_audit_log", "final_rankings"]) {
    assert.match(
      stripped,
      new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`),
      `${table} must enable RLS`,
    );
    assert.match(
      stripped,
      new RegExp(
        `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public\\.${table} FROM authenticated;`,
      ),
      `${table} must be unwritable by authenticated`,
    );
    assert.match(
      stripped,
      new RegExp(
        `CREATE POLICY ${table}_select_admin ON public\\.${table}[\\s\\S]*?has_role\\(auth\\.uid\\(\\), 'admin'`,
      ),
      `${table} reads must be admin-only through RLS`,
    );
  }
});

test("the removal RPC is scoped to one voter, one period, and reversible", () => {
  const body = fnBody("admin_remove_voter_ballot");
  assert.match(body, /you cannot remove your own ballot/);
  assert.match(body, /a reason is required/);
  assert.match(body, /no active ballot found/);
  assert.match(body, /UPDATE public\.votes\s+SET removed_at = now\(\)/);
  assert.match(
    body,
    /WHERE voter_id = _voter_id\s+AND voting_period_id = _period_id/,
  );
  assert.match(body, /INSERT INTO public\.admin_audit_log/);
  assert.match(
    body,
    /ballot_snapshot/,
    "evidence is captured for the audit row",
  );
  const restore = fnBody("admin_restore_voter_ballot");
  assert.match(restore, /SET removed_at = NULL/);
  assert.match(restore, /INSERT INTO public\.admin_audit_log/);
});

test("the final ranking never touches a vote, a point or a period flag", () => {
  const save = fnBody("admin_save_final_ranking");
  assert.ok(
    !/public\.votes/i.test(save),
    "saving a final ranking must not reference public.votes",
  );
  assert.ok(!/total_points\s*=/i.test(save), "points are never rewritten");
  assert.ok(
    !/results_visible|results_published/i.test(save),
    "no visibility writes",
  );
  assert.match(save, /expected exactly % distinct ranked players/);
  assert.match(save, /unknown or unranked player/);
  assert.match(save, /DELETE FROM public\.final_rankings/);
  assert.match(save, /INSERT INTO public\.final_rankings/);
  const reset = fnBody("admin_reset_final_ranking");
  assert.ok(!/public\.votes/i.test(reset));
  assert.match(reset, /DELETE FROM public\.final_rankings/);
});

test("the admin page renders both new sections", async () => {
  const src = await readFile(
    path.join(ROOT, "src/routes/_authenticated/admin.tsx"),
    "utf8",
  );
  assert.match(
    src,
    /import VoteAuditSection from ["']@\/components\/admin\/VoteAuditSection["']/,
  );
  assert.match(
    src,
    /import FinalRankingSection from ["']@\/components\/admin\/FinalRankingSection["']/,
  );
  assert.match(src, /<VoteAuditSection \/>/);
  assert.match(src, /<FinalRankingSection \/>/);
});

test("the audit UI only uses the admin RPCs and never writes votes itself", async () => {
  const src = await readFile(
    path.join(ROOT, "src/components/admin/VoteAuditSection.tsx"),
    "utf8",
  );
  for (const rpc of [
    "admin_list_voters",
    "admin_get_ballot",
    "admin_preview_voter_removal",
    "admin_remove_voter_ballot",
    "admin_restore_voter_ballot",
  ]) {
    assert.match(src, new RegExp(`rpc\\(\\s*"${rpc}"`), `must call ${rpc}`);
  }
  assert.ok(
    !/from\("votes"\)/.test(src),
    "the UI must never read or write public.votes directly",
  );
  assert.ok(
    !/\.(update|insert|upsert)\([\s\S]{0,300}removed_at/i.test(src),
    "the client never sets removal columns itself",
  );
  assert.match(src, /reason/, "a reason is required for removal");
});

test("the ranking UI drives the admin RPCs and publishes through the period", async () => {
  const src = await readFile(
    path.join(ROOT, "src/components/admin/FinalRankingSection.tsx"),
    "utf8",
  );
  for (const rpc of [
    "admin_get_ranking_preview",
    "admin_save_final_ranking",
    "admin_reset_final_ranking",
  ]) {
    assert.match(src, new RegExp(`rpc\\(\\s*"${rpc}"`), `must call ${rpc}`);
  }
  assert.ok(!/from\("votes"\)/.test(src), "no direct vote access");
  assert.ok(
    !/total_points/i.test(src.match(/\.update\([\s\S]*?\)/)?.[0] ?? ""),
    "the client never writes points",
  );
  assert.match(src, /from\("voting_periods"\)\s*\.update\(/);
  assert.match(src, /results_visible/);
  assert.match(src, /results_published/);
  assert.match(src, /DndContext/, "reordering uses the existing dnd-kit stack");
});

test("generated Supabase types expose the new tables and RPCs", async () => {
  const types = await readFile(
    path.join(ROOT, "src/integrations/supabase/types.ts"),
    "utf8",
  );
  for (const table of ["admin_audit_log", "final_rankings"]) {
    assert.match(types, new RegExp(`${table}: \\{`), `${table} table type`);
  }
  for (const rpc of [
    "admin_list_voters",
    "admin_get_ballot",
    "admin_preview_voter_removal",
    "admin_get_ranking_preview",
    "admin_remove_voter_ballot",
    "admin_restore_voter_ballot",
    "admin_save_final_ranking",
    "admin_reset_final_ranking",
  ]) {
    assert.match(types, new RegExp(`${rpc}: \\{`), `${rpc} function type`);
  }
  assert.match(types, /removed_at: string \| null/);
  assert.match(types, /removal_reason: string \| null/);
  assert.match(types, /removed_by: string \| null/);
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;
let period2026;
let period2025;
let adminId;
let voterA;
let voterB;
let voterC;
let selfAdmin;
let awardId;
let candidateId;
const players = [];

const uuidArray = (ids) => `{${ids.join(",")}}`;

async function createUser(fullName) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@audit.test`,
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

// Points + ranks of every row of a voter in a period, ignoring removal state.
async function rawRows(voter, period) {
  const r = await db.query(
    `SELECT ranked_player_id, rank_position, points, removed_at
       FROM public.votes
      WHERE voter_id = $1 AND voting_period_id = $2
      ORDER BY rank_position`,
    [voter, period],
  );
  return r.rows;
}

// The aggregate every public read path is built on.
async function totalsByPlayer(period) {
  const r = await db.query(
    `SELECT p.id, COALESCE(SUM(v.points), 0)::int AS total
       FROM public.profiles p
       LEFT JOIN public.votes v
         ON v.ranked_player_id = p.id
        AND v.voting_period_id = $1
        AND v.removed_at IS NULL
      GROUP BY p.id`,
    [period],
  );
  return new Map(r.rows.map((row) => [row.id, row.total]));
}

// What the public standings look like right now (active votes only, no manual
// order), computed independently of the code under test.
async function expectedOrder(period) {
  const totals = await totalsByPlayer(period);
  return [...totals.entries()]
    .filter(([, total]) => total > 0)
    .map(([id, total]) => ({ id, total }))
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id))
    .map((row) => row.id);
}

// Mirrors public.get_period_results: every player of the edition, a manually
// saved position when one exists (and the player still has points), otherwise
// the calculated row pushed behind every stored player.
async function expectedPublishedOrder(period, manualIds = []) {
  const r = await db.query(
    `SELECT p.id, COALESCE(SUM(v.points), 0)::int AS total,
            COUNT(v.id) FILTER (WHERE v.rank_position = 1)::int AS firsts
       FROM public.profiles p
       LEFT JOIN public.votes v
         ON v.ranked_player_id = p.id
        AND v.voting_period_id = $1
        AND v.removed_at IS NULL
      GROUP BY p.id`,
    [period],
  );
  const calc = r.rows
    .map((row) => ({ ...row }))
    .sort(
      (a, b) =>
        b.total - a.total || a.firsts - b.firsts || a.id.localeCompare(b.id),
    )
    .map((row, i) => ({ ...row, calcRow: i + 1 }));
  const manual = new Map(manualIds.map((id, i) => [id, i + 1]));
  return [...calc]
    .sort((a, b) => {
      const ka =
        a.total > 0 && manual.has(a.id)
          ? manual.get(a.id)
          : 1000000 + a.calcRow;
      const kb =
        b.total > 0 && manual.has(b.id)
          ? manual.get(b.id)
          : 1000000 + b.calcRow;
      return ka - kb || a.calcRow - b.calcRow;
    })
    .map((row) => row.id);
}

// The standings exactly as the public read path returns them. The RPC carries
// its own ORDER BY (that is what results.tsx relies on), so the rows are taken
// in the order PostgreSQL hands them back.
async function publishedOrder(period) {
  const r = await db.query("SELECT * FROM public.get_period_results($1)", [
    period,
  ]);
  return r.rows;
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
  period2025 = (
    await db.query(
      `INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
       VALUES (2025, 'PRC D''or 2025', true, now(), now() + interval '1 day')
       RETURNING id`,
    )
  ).rows[0].id;

  adminId = await createUser("Audit Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );
  for (let i = 0; i < 12; i++) players.push(await createUser(`Player ${i}`));

  voterA = await createUser("Voter A");
  voterB = await createUser("Voter B");
  voterC = await createUser("Voter C");
  selfAdmin = await createUser("Self Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [selfAdmin],
  );

  // Three real ballots, cast through the production RPC:
  //   A: P0..P9   B: P1..P9,P0   C: P2..P9,P0,P1
  // Totals: P0=20 P1=29 P2=37 P3=30 P4=25 P5=21 P6=18 P7=15 P8=12 P9=9
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

  // voterA also voted in the previous edition — removal in 2026 must not
  // touch it.
  await asUser(voterA);
  await db.query("SET ROLE authenticated");
  await submit(period2025, ballotA);
  await resetRole();

  // selfAdmin has a ballot in 2025, so the "cannot remove your own ballot"
  // guard can be exercised against a real ballot.
  await asUser(selfAdmin);
  await db.query("SET ROLE authenticated");
  await submit(period2025, ballotB);
  await resetRole();

  // A special-award ballot for voterA: removal of the main ballot must never
  // touch it.
  awardId = (
    await db.query(
      `INSERT INTO public.special_awards (voting_period_id, award_key, title)
       VALUES ($1, 'kopa', 'Kopa Trophy') RETURNING id`,
      [period2026],
    )
  ).rows[0].id;
  candidateId = (
    await db.query(
      `INSERT INTO public.special_award_candidates (award_id, player_id)
       VALUES ($1, $2) RETURNING id`,
      [awardId, players[0]],
    )
  ).rows[0].id;
  await db.query(
    `INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points)
     VALUES ($1, $2, $3, 1, 5)`,
    [voterA, awardId, candidateId],
  );
});

after(async () => {
  await db.close();
});

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------
test("an admin can inspect voters and ballots without mutating anything", async () => {
  const before = (
    await db.query(
      "SELECT voter_id, ranked_player_id, rank_position, points, removed_at FROM public.votes ORDER BY voter_id, rank_position",
    )
  ).rows;

  await asAdmin();
  try {
    const voters = (
      await db.query("SELECT * FROM public.admin_list_voters($1)", [period2026])
    ).rows;
    assert.equal(voters.length, 3, "three voters cast a ballot in 2026");
    const rowA = voters.find((v) => v.voter_id === voterA);
    assert.equal(rowA.vote_count, 10);
    assert.equal(rowA.total_points, 72);
    assert.equal(rowA.ballot_rows, 10);
    assert.equal(rowA.removed_at, null);
    assert.ok(rowA.display_name, "a display name is resolved");

    const ballot = (
      await db.query("SELECT * FROM public.admin_get_ballot($1, $2)", [
        period2026,
        voterA,
      ])
    ).rows;
    assert.equal(ballot.length, 10);
    assert.deepEqual(
      ballot.map((r) => r.rank_position),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.deepEqual(
      ballot.map((r) => r.points),
      POINTS,
    );
    assert.equal(ballot[0].total_points, 72);

    const preview = (
      await db.query(
        "SELECT * FROM public.admin_preview_voter_removal($1, $2)",
        [period2026, voterA],
      )
    ).rows[0];
    assert.equal(preview.vote_rows, 10);
    assert.equal(preview.total_points, 72);
    assert.equal(preview.special_vote_rows, 1, "reported for reassurance only");
    assert.equal(preview.already_removed, false);
  } finally {
    await resetRole();
  }

  const after = (
    await db.query(
      "SELECT voter_id, ranked_player_id, rank_position, points, removed_at FROM public.votes ORDER BY voter_id, rank_position",
    )
  ).rows;
  assert.deepEqual(after, before, "inspection must not mutate a single row");
});

test("every admin RPC refuses a non-admin and stays invisible to anon", async () => {
  const calls = [
    ["admin_list_voters($1::uuid)", [period2026]],
    ["admin_get_ballot($1::uuid, $2::uuid)", [period2026, voterA]],
    ["admin_preview_voter_removal($1::uuid, $2::uuid)", [period2026, voterA]],
    ["admin_get_ranking_preview($1::uuid)", [period2026]],
    [
      "admin_remove_voter_ballot($1::uuid, $2::uuid, $3::text)",
      [period2026, voterA, "probe"],
    ],
    ["admin_restore_voter_ballot($1::uuid, $2::uuid)", [period2026, voterA]],
    [
      "admin_save_final_ranking($1::uuid, $2::uuid[])",
      [period2026, uuidArray([players[0]])],
    ],
    ["admin_reset_final_ranking($1::uuid)", [period2026]],
  ];

  await asPlain(voterB);
  try {
    for (const [signature, args] of calls) {
      await assert.rejects(
        () => db.query(`SELECT public.${signature}`, args),
        /not authorized: admin only/,
        `${signature.split("(")[0]} must refuse a non-admin`,
      );
    }
  } finally {
    await resetRole();
  }

  // Nothing was written by the probe calls above.
  assert.ok(
    (await rawRows(voterA, period2026)).every((r) => r.removed_at === null),
    "a non-admin probe must not remove anything",
  );

  await db.query("SET ROLE anon");
  try {
    await assert.rejects(
      () => db.query("SELECT public.admin_list_voters($1)", [period2026]),
      /permission denied for function admin_list_voters/,
    );
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_remove_voter_ballot($1, $2, $3)", [
          period2026,
          voterA,
          "probe",
        ]),
      /permission denied for function admin_remove_voter_ballot/,
    );
  } finally {
    await resetRole();
  }
});

test("authenticated cannot write the moderation columns or the ranking table directly", async () => {
  await asPlain(voterB);
  try {
    await assert.rejects(
      () =>
        db.query(
          "UPDATE public.votes SET removed_at = now() WHERE voter_id = $1",
          [voterA],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO public.final_rankings (voting_period_id, player_id, final_position)
           VALUES ($1, $2, 1)`,
          [period2026, players[0]],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query(
          "UPDATE public.final_rankings SET final_position = 2 WHERE voting_period_id = $1",
          [period2026],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query(
          "INSERT INTO public.admin_audit_log (action) VALUES ('forged')",
        ),
      /permission denied/,
    );
  } finally {
    await resetRole();
  }

  const priv = await db.query(
    `SELECT
       has_table_privilege('authenticated', 'public.final_rankings', 'INSERT') AS fr_ins,
       has_table_privilege('authenticated', 'public.final_rankings', 'UPDATE') AS fr_upd,
       has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT') AS log_ins,
       has_table_privilege('authenticated', 'public.votes', 'UPDATE') AS votes_upd`,
  );
  assert.equal(priv.rows[0].fr_ins, false);
  assert.equal(priv.rows[0].fr_upd, false);
  assert.equal(priv.rows[0].log_ins, false);
  assert.equal(priv.rows[0].votes_upd, false);
});

test("a non-admin sees no other voter's data even through RLS-filtered tables", async () => {
  await asPlain(voterB);
  try {
    const votes = await db.query(
      "SELECT count(*)::int AS n FROM public.votes WHERE voter_id = $1",
      [voterA],
    );
    assert.equal(votes.rows[0].n, 0, "RLS hides other ballots");
    const log = await db.query(
      "SELECT count(*)::int AS n FROM public.admin_audit_log",
    );
    assert.equal(log.rows[0].n, 0, "the audit log is admin-only");
    const ranking = await db.query(
      "SELECT count(*)::int AS n FROM public.final_rankings",
    );
    assert.equal(ranking.rows[0].n, 0, "the final ranking is admin-only");
  } finally {
    await resetRole();
  }
});

// ---------------------------------------------------------------------------
// Removal
// ---------------------------------------------------------------------------
test("removal is scoped to one voter in one edition and recalculates the standings", async () => {
  const totalsBefore = await totalsByPlayer(period2026);
  assert.equal(totalsBefore.get(players[0]), 20, "P0: 15+2+3");
  assert.equal(totalsBefore.get(players[2]), 37, "P2: 10+12+15");

  const rawBeforeA = await rawRows(voterA, period2026);
  const rawBeforeB = await rawRows(voterB, period2026);

  await asAdmin();
  try {
    const removed = await db.query(
      "SELECT public.admin_remove_voter_ballot($1, $2, $3) AS n",
      [period2026, voterA, "coordinated account — confirmed by investigation"],
    );
    assert.equal(removed.rows[0].n, 10, "one full ballot is removed");
  } finally {
    await resetRole();
  }

  // The rows survive, annotated — nothing is destroyed.
  const rawAfterA = await rawRows(voterA, period2026);
  assert.equal(rawAfterA.length, 10, "soft delete keeps the rows");
  assert.deepEqual(
    rawAfterA.map((r) => [r.ranked_player_id, r.rank_position, r.points]),
    rawBeforeA.map((r) => [r.ranked_player_id, r.rank_position, r.points]),
    "ranks, players and points are never rewritten",
  );
  for (const row of rawAfterA) {
    assert.ok(row.removed_at, "every row of the ballot is marked removed");
  }

  // Other voters in the same edition are untouched.
  const rawAfterB = await rawRows(voterB, period2026);
  assert.deepEqual(rawAfterB, rawBeforeB, "voter B's ballot is untouched");
  assert.ok(
    rawAfterB.every((r) => r.removed_at === null),
    "voter B's rows stay active",
  );

  // The other edition of the same voter is untouched.
  const otherEdition = await rawRows(voterA, period2025);
  assert.equal(otherEdition.length, 10);
  assert.ok(
    otherEdition.every((r) => r.removed_at === null),
    "removal is scoped to one voting period",
  );

  // Special-award ballots are untouched.
  const special = await db.query(
    "SELECT count(*)::int AS n FROM public.special_votes WHERE voter_id = $1",
    [voterA],
  );
  assert.equal(special.rows[0].n, 1, "special-award ballots are never removed");

  // Aggregates recalculated from the remaining votes only.
  const totalsAfter = await totalsByPlayer(period2026);
  assert.equal(totalsAfter.get(players[0]), 5, "P0: 2+3 after removing A");
  assert.equal(totalsAfter.get(players[2]), 27, "P2: 12+15 after removing A");
  assert.equal(totalsAfter.get(players[11]), 0);

  const view = await db.query(
    `SELECT id, total_points FROM public.player_results_by_period
      WHERE voting_period_id = $1 AND total_points > 0`,
    [period2026],
  );
  const viewTotals = new Map(view.rows.map((r) => [r.id, r.total_points]));
  const positive = new Map([...totalsAfter].filter(([, t]) => t > 0));
  assert.equal(viewTotals.size, positive.size);
  for (const [id, total] of viewTotals) {
    assert.equal(total, positive.get(id), "view and direct aggregate agree");
  }

  // The published order follows the recalculated points.
  const expected = await expectedPublishedOrder(period2026);
  await asAdmin();
  try {
    const rows = await publishedOrder(period2026);
    assert.deepEqual(
      rows.map((r) => r.id),
      expected,
      "the standings re-order themselves without any extra write",
    );
    assert.equal(rows[0].id, players[2], "P2 leads with 27 points");
  } finally {
    await resetRole();
  }

  // The audit trail records who did what, to whom, and why.
  const log = (
    await db.query(
      `SELECT action, admin_user_id, target_user_id, voting_period_id, reason,
              records_affected, details
         FROM public.admin_audit_log
        WHERE action = 'remove_voter_ballot'`,
    )
  ).rows;
  assert.equal(log.length, 1);
  assert.equal(log[0].admin_user_id, adminId);
  assert.equal(log[0].target_user_id, voterA);
  assert.equal(log[0].voting_period_id, period2026);
  assert.equal(log[0].records_affected, 10);
  assert.match(log[0].reason, /coordinated account/);
  assert.equal(log[0].details.points_removed, 72);
  assert.equal(log[0].details.ballot_snapshot.length, 10);

  // The voter cannot simply vote again: has_voted_in_period stays true.
  await asUser(voterA);
  await db.query("SET ROLE authenticated");
  try {
    const voted = await db.query("SELECT public.has_voted_in_period($1) AS v", [
      period2026,
    ]);
    assert.equal(
      voted.rows[0].v,
      true,
      "a removed ballot still blocks re-voting",
    );
    await assert.rejects(
      () => submit(period2026, players.slice(0, 10)),
      /ballot already submitted/,
    );
  } finally {
    await resetRole();
  }

  // The removal is visible to the admin UI.
  await asAdmin();
  try {
    const voters = (
      await db.query("SELECT * FROM public.admin_list_voters($1)", [period2026])
    ).rows;
    const rowA = voters.find((v) => v.voter_id === voterA);
    assert.equal(rowA.vote_count, 0);
    assert.equal(rowA.total_points, 0);
    assert.equal(
      rowA.ballot_rows,
      10,
      "the original ballot size stays visible",
    );
    assert.ok(rowA.removed_at, "the UI can show the removal");
    assert.match(rowA.removal_reason, /coordinated account/);
  } finally {
    await resetRole();
  }
});

test("removal guards: reason, self-removal, missing ballot, unknown edition", async () => {
  await asAdmin();
  try {
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_remove_voter_ballot($1, $2, $3)", [
          period2026,
          voterB,
          "   ",
        ]),
      /a reason is required/,
    );
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_remove_voter_ballot($1, $2, $3)", [
          period2026,
          randomUUID(),
          "no such voter",
        ]),
      /no active ballot found/,
    );
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_remove_voter_ballot($1, $2, $3)", [
          randomUUID(),
          voterB,
          "no such edition",
        ]),
      /voting period does not exist/,
    );
  } finally {
    await resetRole();
  }

  // The admin cannot remove their own ballot.
  await asUser(selfAdmin);
  await db.query("SET ROLE authenticated");
  try {
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_remove_voter_ballot($1, $2, $3)", [
          period2025,
          selfAdmin,
          "testing the guard",
        ]),
      /you cannot remove your own ballot/,
    );
  } finally {
    await resetRole();
  }

  const selfRows = await rawRows(selfAdmin, period2025);
  assert.ok(selfRows.every((r) => r.removed_at === null));
});

test("if the audit row cannot be written, the removal is rolled back entirely", async () => {
  const before = await rawRows(voterC, period2026);
  const logBefore = (
    await db.query("SELECT count(*)::int AS n FROM public.admin_audit_log")
  ).rows[0].n;

  await db.exec(`
    CREATE OR REPLACE FUNCTION public.test_fail_audit_insert()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'forced audit failure';
    END $$;
    CREATE TRIGGER test_fail_audit_insert
      BEFORE INSERT ON public.admin_audit_log
      FOR EACH ROW EXECUTE FUNCTION public.test_fail_audit_insert();
  `);

  await asAdmin();
  try {
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_remove_voter_ballot($1, $2, $3)", [
          period2026,
          voterC,
          "will be rolled back",
        ]),
      /forced audit failure/,
    );
  } finally {
    await resetRole();
    await db.exec(
      "DROP TRIGGER test_fail_audit_insert ON public.admin_audit_log",
    );
  }

  const after = await rawRows(voterC, period2026);
  assert.deepEqual(after, before, "no vote row may survive a failed removal");
  assert.ok(
    after.every((r) => r.removed_at === null),
    "the ballot stays fully active",
  );
  const logAfter = (
    await db.query("SELECT count(*)::int AS n FROM public.admin_audit_log")
  ).rows[0].n;
  assert.equal(logAfter, logBefore, "no audit row is written either");
});

test("restore brings the ballot and the standings back", async () => {
  await asAdmin();
  try {
    const restored = await db.query(
      "SELECT public.admin_restore_voter_ballot($1, $2) AS n",
      [period2026, voterA],
    );
    assert.equal(restored.rows[0].n, 10);

    const totals = await totalsByPlayer(period2026);
    assert.equal(totals.get(players[0]), 20, "P0 back to 15+2+3");
    assert.equal(totals.get(players[2]), 37);

    const rows = await publishedOrder(period2026);
    assert.deepEqual(
      rows.map((r) => r.id),
      await expectedPublishedOrder(period2026),
    );

    // Restoring twice is refused rather than duplicating anything.
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_restore_voter_ballot($1, $2)", [
          period2026,
          voterA,
        ]),
      /already has an active ballot/,
    );
  } finally {
    await resetRole();
  }

  const log = (
    await db.query(
      `SELECT records_affected FROM public.admin_audit_log
        WHERE action = 'restore_voter_ballot'`,
    )
  ).rows;
  assert.equal(log.length, 1);
  assert.equal(log[0].records_affected, 10);

  const rows = await rawRows(voterA, period2026);
  assert.ok(rows.every((r) => r.removed_at === null));
});

// ---------------------------------------------------------------------------
// Manual final ranking
// ---------------------------------------------------------------------------
test("an admin can save a manual final order without changing a single vote", async () => {
  const votesBefore = (
    await db.query(
      "SELECT voter_id, ranked_player_id, rank_position, points, removed_at FROM public.votes WHERE voting_period_id = $1 ORDER BY voter_id, rank_position",
      [period2026],
    )
  ).rows;
  const totals = await totalsByPlayer(period2026);
  const calculated = await expectedOrder(period2026);

  await asAdmin();
  try {
    const preview = (
      await db.query("SELECT * FROM public.admin_get_ranking_preview($1)", [
        period2026,
      ])
    ).rows;
    assert.equal(preview.length, 10, "only players with points are ranked");
    assert.deepEqual(
      preview.map((r) => r.player_id),
      calculated,
      "the preview is the calculated order",
    );
    assert.equal(preview[0].final_position, null, "no manual order yet");
    assert.equal(preview[0].calculated_rank, 1);

    // The manual order is the calculated order reversed.
    const manual = [...calculated].reverse();
    const saved = await db.query(
      "SELECT public.admin_save_final_ranking($1, $2::uuid[]) AS n",
      [period2026, uuidArray(manual)],
    );
    assert.equal(saved.rows[0].n, 10);

    const rows = await publishedOrder(period2026);
    assert.deepEqual(
      rows.map((r) => r.id),
      await expectedPublishedOrder(period2026, manual),
      "the published order follows the manual ranking",
    );
    for (const row of rows.slice(0, manual.length)) {
      assert.equal(
        row.total_points,
        totals.get(row.id),
        "points are unchanged — only the order moved",
      );
    }
    assert.ok(
      rows.slice(manual.length).every((row) => row.total_points === 0),
      "players without points stay behind the manual order",
    );

    // A player with zero points is never promoted into the manual order.
    const zero = await db.query(
      "SELECT * FROM public.get_player_period_rank($1, $2)",
      [players[11], period2026],
    );
    assert.ok(
      zero.rows[0].rank > 10,
      "a zero-point player stays behind every ranked player",
    );
  } finally {
    await resetRole();
  }

  const votesAfter = (
    await db.query(
      "SELECT voter_id, ranked_player_id, rank_position, points, removed_at FROM public.votes WHERE voting_period_id = $1 ORDER BY voter_id, rank_position",
      [period2026],
    )
  ).rows;
  assert.deepEqual(
    votesAfter,
    votesBefore,
    "saving a ranking never writes votes",
  );

  const ranking = (
    await db.query(
      "SELECT * FROM public.final_rankings WHERE voting_period_id = $1 ORDER BY final_position",
      [period2026],
    )
  ).rows;
  assert.equal(ranking.length, 10);
  assert.equal(ranking[0].approved_by, adminId);
  assert.equal(
    ranking[0].calculated_position,
    10,
    "the calculated position is kept for the audit trail",
  );
});

test("the final ranking validates its input and stays admin-only", async () => {
  await asAdmin();
  try {
    // Too few / too many entries.
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          period2026,
          uuidArray(players.slice(0, 9)),
        ]),
      /expected exactly 10 distinct ranked players, got 9 entries/,
    );
    // Duplicates shrink the distinct count below the required size.
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          period2026,
          uuidArray([...players.slice(0, 9), players[0]]),
        ]),
      /expected exactly 10 distinct ranked players, got 10 entries/,
    );
    // An unranked player (zero points) is rejected even if the length matches.
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          period2026,
          uuidArray([...players.slice(0, 9), players[11]]),
        ]),
      /unknown or unranked player/,
    );
    // An empty order.
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          period2026,
          "{}",
        ]),
      /expected exactly 10 distinct ranked players, got 0 entries/,
    );
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          randomUUID(),
          uuidArray(players.slice(0, 10)),
        ]),
      /voting period does not exist/,
    );
  } finally {
    await resetRole();
  }

  // A non-admin cannot save, reset or read the stored order.
  const calculated = await (async () => {
    const r = await db.query(
      `SELECT id FROM public.player_results_by_period
        WHERE voting_period_id = $1 AND total_points > 0
        ORDER BY total_points DESC, first_place_votes DESC, id`,
      [period2026],
    );
    return r.rows.map((row) => row.id);
  })();

  await asPlain(voterB);
  try {
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
          period2026,
          uuidArray(calculated),
        ]),
      /not authorized: admin only/,
    );
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_reset_final_ranking($1)", [period2026]),
      /not authorized: admin only/,
    );
    // The stored order is invisible to them, and the public standings stay
    // hidden while the edition is not published.
    const stored = await db.query(
      "SELECT count(*)::int AS n FROM public.final_rankings WHERE voting_period_id = $1",
      [period2026],
    );
    assert.equal(
      stored.rows[0].n,
      0,
      "RLS hides the admin's stored order from a non-admin",
    );
    const standings = await db.query(
      "SELECT * FROM public.get_period_results($1)",
      [period2026],
    );
    assert.equal(
      standings.rows.length,
      0,
      "results stay hidden until an admin publishes them",
    );
  } finally {
    await resetRole();
  }
});

test("reset restores the calculated order, and a later removal still recalculates", async () => {
  await asAdmin();
  try {
    const deleted = await db.query(
      "SELECT public.admin_reset_final_ranking($1) AS n",
      [period2026],
    );
    assert.equal(deleted.rows[0].n, 10, "the stored order is removed");

    const rows = await publishedOrder(period2026);
    assert.deepEqual(
      rows.map((r) => r.id),
      await expectedPublishedOrder(period2026),
      "the calculated order is back",
    );

    // Save the calculated order again, then remove a voter: the stored
    // positions survive while the points underneath them change.
    const calculated = await expectedOrder(period2026);
    await db.query("SELECT public.admin_save_final_ranking($1, $2::uuid[])", [
      period2026,
      uuidArray(calculated),
    ]);

    const removed = await db.query(
      "SELECT public.admin_remove_voter_ballot($1, $2, $3) AS n",
      [period2026, voterB, "second fraudulent account"],
    );
    assert.equal(removed.rows[0].n, 10);

    const afterRows = await publishedOrder(period2026);
    assert.deepEqual(
      afterRows.map((r) => r.id),
      await expectedPublishedOrder(period2026, calculated),
      "the stored order still covers every remaining ranked player",
    );
    assert.deepEqual(
      afterRows.slice(0, calculated.length).map((r) => r.id),
      calculated,
      "every ranked player still has points, so the order is unchanged",
    );
    assert.equal(afterRows[0].id, players[2]);

    const totals = await totalsByPlayer(period2026);
    for (const row of afterRows.slice(0, calculated.length)) {
      assert.equal(
        row.total_points,
        totals.get(row.id),
        "stored positions never change a point total",
      );
    }
    assert.ok(
      afterRows.slice(0, calculated.length).every((r) => r.total_points > 0),
    );

    // Resetting after the removal still works and stays audited.
    await db.query("SELECT public.admin_reset_final_ranking($1)", [period2026]);
  } finally {
    await resetRole();
  }

  const log = (
    await db.query(
      `SELECT action, records_affected FROM public.admin_audit_log
        WHERE action IN ('save_final_ranking', 'reset_final_ranking')
        ORDER BY created_at`,
    )
  ).rows;
  assert.ok(
    log.some((r) => r.action === "save_final_ranking"),
    "saves are audited",
  );
  assert.ok(
    log.some((r) => r.action === "reset_final_ranking"),
    "resets are audited",
  );
  assert.equal(
    log.filter((r) => r.action === "remove_voter_ballot").length,
    0,
    "filtered out — removals have their own action",
  );
});
