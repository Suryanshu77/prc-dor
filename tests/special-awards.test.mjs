// Special Awards (Migration 2, PRC D'or 2027) regression guards.
// - Static: pins the security/invariant contract of the migration and the
//   frontend call sites (nomination -> open -> ballot -> results visibility).
// - Functional: applies the REAL migrations on PGlite (hermetic, never touches
//   Supabase) and exercises the full nomination-to-vote-to-results flow for
//   all four awards, mirroring tests/ballot-integrity.test.mjs.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
// Simulates the live Supabase pg_default_acl rows (scripts/proposal-default-
// privileges.sql Set R): every table/function created afterwards inherits
// ALL/EXECUTE grants for anon+authenticated. Applied between STUB and the
// real migrations so the privilege tests are not vacuous — without the
// migration's explicit REVOKEs, authenticated would genuinely hold INSERT
// and TRUNCATE on the special tables (B1).
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");
const BASE = path.join(
  ROOT,
  "src/supabase/migrations/20260623050414_1338e52f-e1f2-4819-b5f0-ec07f413425a.sql",
);
const MIGRATION = path.join(
  ROOT,
  "src/supabase/migrations/20261025120000_special_awards.sql",
);

const sql = await readFile(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// ==========================================================================
// Static guards
// ==========================================================================
test("migration file name follows the convention and keeps its position in history", () => {
  assert.match(path.basename(MIGRATION), /^\d{14}_special_awards\.sql$/);
  const files = readdirSync(path.join(ROOT, "src/supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  // Ordering is pinned relatively: newer migrations (e.g.
  // 20261027120000_secure_main_ballot.sql) may follow this one, so the
  // original "this file is last" assertion was relaxed when they landed.
  assert.ok(
    files.indexOf("20261023120000_reconcile_permissions.sql") <
      files.indexOf(path.basename(MIGRATION)),
    "special awards must apply after the permission reconciliation",
  );
  assert.ok(
    files.indexOf(path.basename(MIGRATION)) <
      files.indexOf("20261027120000_secure_main_ballot.sql"),
    "the secure main-ballot cutover must apply after special awards",
  );
  assert.match(files[files.length - 1], /^\d{14}_[a-z0-9_]+\.sql$/);
});

test("all three tables are created with per-edition uniqueness scoring and cascade cleanup", () => {
  for (const t of [
    "special_awards",
    "special_award_candidates",
    "special_votes",
  ]) {
    assert.match(
      stripped,
      new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t}\\b`),
    );
  }
  assert.match(
    stripped,
    /UNIQUE \(voting_period_id, award_key\)/,
    "one award row per key per edition",
  );
  assert.match(
    stripped,
    /UNIQUE \(voter_id, award_id, rank_position\)/,
    "one row per rank per voter per award",
  );
  assert.match(
    stripped,
    /UNIQUE \(voter_id, award_id, candidate_id\)/,
    "one vote per candidate per voter per award",
  );
  assert.match(
    stripped,
    /rank_position INT NOT NULL CHECK \(rank_position BETWEEN 1 AND 5\)/,
  );
  assert.match(
    stripped,
    /points INT NOT NULL CHECK \(points = 6 - rank_position\)/,
    "server-derived 5..1 scoring",
  );
  // Player deletion and user deletion must cascade (admin delete flow).
  assert.match(
    stripped,
    /player_id uuid not null references public\.profiles\(id\) on delete cascade/i,
  );
  assert.match(
    stripped,
    /voter_id uuid not null references auth\.users\(id\) on delete cascade/i,
  );
  assert.match(
    stripped,
    /candidate_id uuid not null references public\.special_award_candidates\(id\) on delete cascade/i,
  );
});

test("award config carries configurable eligibility rules, not hardcoded ages", () => {
  assert.match(
    stripped,
    /eligibility_type TEXT NOT NULL DEFAULT 'all'\s+CHECK \(eligibility_type IN \('all', 'by_position', 'max_age'\)\)/,
  );
  assert.match(stripped, /eligibility_position public\.player_position/);
  assert.match(stripped, /eligibility_max_age INT/);
  assert.match(
    stripped,
    /eligibility_type = 'max_age' AND eligibility_max_age IS NOT NULL AND eligibility_max_age > 0/,
  );
});

test("clients read; only RPCs write (no INSERT/UPDATE/DELETE grants on the new tables)", () => {
  assert.match(
    stripped,
    /GRANT SELECT ON TABLE public\.special_awards TO authenticated;/,
  );
  assert.match(
    stripped,
    /GRANT SELECT ON TABLE public\.special_award_candidates TO authenticated;/,
  );
  assert.match(
    stripped,
    /GRANT SELECT ON TABLE public\.special_votes TO authenticated;/,
  );
  assert.ok(
    !/GRANT (INSERT|UPDATE)[^;]*ON TABLE public\.special/i.test(stripped),
    "special-award writes must stay RPC-only",
  );
});

test("tables are REVOKE'd from anon/authenticated before the SELECT grants (live default-ACL defence, B1)", () => {
  for (const t of [
    "special_awards",
    "special_award_candidates",
    "special_votes",
  ]) {
    const revoke = `REVOKE ALL ON TABLE public.${t} FROM anon, authenticated;`;
    const grant = `GRANT SELECT ON TABLE public.${t} TO authenticated;`;
    assert.ok(sql.includes(revoke), `missing ${revoke}`);
    assert.ok(sql.includes(grant), `missing ${grant}`);
    assert.ok(
      sql.indexOf(revoke) < sql.indexOf(grant),
      `${t}: REVOKE must precede the GRANT SELECT`,
    );
  }
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.special_award_eligible_profile(text, public.player_position, int, int, public.player_position) FROM PUBLIC, anon, authenticated;",
    ),
    "eligibility helper must not be callable by API roles (W2)",
  );
});

test("stats RPC is visibility-gated like the results RPC (source-level, W1)", () => {
  const start = stripped.indexOf(
    "CREATE OR REPLACE FUNCTION public.get_special_award_stats",
  );
  const end = stripped.indexOf(
    "REVOKE ALL ON FUNCTION public.get_special_award_stats",
  );
  assert.ok(start >= 0 && end > start, "stats RPC not found in migration");
  const body = stripped.slice(start, end);
  assert.match(body, /sa\.results_visible = true/);
  assert.match(body, /has_role\(auth\.uid\(\), 'admin'/);
  assert.match(body, /EXISTS \(/);
});

test("RLS is enabled with matching policies and never forced", () => {
  for (const t of [
    "special_awards",
    "special_award_candidates",
    "special_votes",
  ]) {
    assert.match(
      stripped,
      new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY;`),
    );
  }
  assert.match(stripped, /CREATE POLICY special_awards_select_all/);
  assert.match(
    stripped,
    /CREATE POLICY special_awards_admin_manage[\s\S]{0,400}?private\.has_role/,
  );
  assert.match(
    stripped,
    /CREATE POLICY special_votes_select_own[\s\S]{0,400}?auth\.uid\(\) = voter_id/,
  );
  assert.match(
    stripped,
    /CREATE POLICY special_votes_insert_own[\s\S]{0,600}?sa\.voting_open = true/,
  );
  assert.ok(!/FORCE ROW LEVEL SECURITY/i.test(sql));
});

test("every new RPC is revoked from PUBLIC/anon and granted to authenticated", () => {
  const rpcs = [
    "admin_create_special_award_edition(int, timestamptz)",
    "admin_nominate_player(uuid, uuid)",
    "admin_remove_nominee(uuid, uuid)",
    "admin_set_special_award_eligibility(uuid, text, int, public.player_position)",
    "admin_set_special_award_status(uuid, boolean, boolean)",
    "admin_reset_special_votes(uuid)",
    "get_special_award_stats(uuid)",
    "submit_special_ballot(uuid, uuid[])",
    "get_special_award_results(uuid)",
    "is_special_award_results_visible(uuid)",
  ];
  for (const sig of rpcs) {
    assert.ok(
      sql.includes(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon;`),
      `missing anon REVOKE for ${sig}`,
    );
    assert.ok(
      sql.includes(`GRANT EXECUTE ON FUNCTION public.${sig} TO authenticated;`),
      `missing authenticated GRANT for ${sig}`,
    );
  }
});

test("the four awards are seeded with the right keys and default rules", () => {
  for (const [key, title] of [
    ["kopa", "Kopa Trophy"],
    ["yashin", "Yashin Trophy"],
    ["gerd_muller", "Gerd Müller Trophy"],
    ["socrates", "Socrates Award"],
  ]) {
    assert.match(stripped, new RegExp(`'${key}',\\s*'${title}'`));
  }
  assert.match(
    stripped,
    /award_key = 'kopa'\s+AND (sa\.)?eligibility_type = 'all'/,
    "kopa defaults to the configurable max-age rule",
  );
  assert.match(
    stripped,
    /award_key = 'yashin'\s+AND (sa\.)?eligibility_type = 'all'/,
    "yashin defaults to the goalkeeper rule",
  );
});

test("results RPC gates visibility via results_visible or admin role", () => {
  const gate = stripped.slice(stripped.indexOf("get_special_award_results"));
  assert.match(gate, /sa\.results_visible = true/);
  assert.match(gate, /has_role\(auth\.uid\(\), 'admin'/);
});

test("ballot submission RPC is atomic, admin-free, five-only and double-vote safe (source-level)", async () => {
  const src = await readFile(
    path.join(ROOT, "src/routes/_authenticated/vote-special.tsx"),
    "utf8",
  );
  assert.match(src, /submit_special_ballot/);
  assert.match(
    src,
    /SPECIAL_POINTS_BY_RANK/,
    "UI must display the shared 5..1 scoring constant",
  );
  assert.match(src, /ranking\.length !== 5/, "UI enforces exactly five picks");
  const admin = await readFile(
    path.join(ROOT, "src/routes/_authenticated/admin.tsx"),
    "utf8",
  );
  assert.match(admin, /SpecialAwardsSection/);
  for (const rpc of [
    "admin_create_special_award_edition",
    "admin_set_special_award_eligibility",
    "admin_nominate_player",
    "admin_remove_nominee",
    "admin_set_special_award_status",
    "admin_reset_special_votes",
  ]) {
    assert.ok(admin.includes(rpc), `admin UI must call ${rpc}`);
  }
  const results = await readFile(
    path.join(ROOT, "src/routes/_authenticated/results.tsx"),
    "utf8",
  );
  assert.match(results, /get_special_award_results/);
  assert.match(results, /is_special_award_results_visible/);
  const shell = await readFile(
    path.join(ROOT, "src/components/AppShell.tsx"),
    "utf8",
  );
  assert.match(shell, /vote-special/);
  const points = await readFile(path.join(ROOT, "src/lib/points.ts"), "utf8");
  for (const [rank, points_] of [
    [1, 5],
    [2, 4],
    [3, 3],
    [4, 2],
    [5, 1],
  ]) {
    assert.match(
      points,
      new RegExp(`SPECIAL_POINTS_BY_RANK[^}]*${rank}: ${points_}`),
    );
  }
});

// ==========================================================================
// Functional tests (PGlite, hermetic: base migration + special awards only)
// ==========================================================================
let db;
const youngPlayers = []; // age 18 — Kopa-eligible
const olderPlayers = []; // age 30 — not Kopa-eligible
const gks = []; // age 40, Goalkeeper — Yashin-eligible, not Kopa
let kopa;
let yashin;
let gerd;
let socrates;
let periodId;

async function baseDb() {
  const pg = new PGlite();
  await pg.exec(await readFile(STUB, "utf8"));
  // Simulate the live default ACLs BEFORE creating anything, so both the
  // base schema objects and the special-awards objects inherit them.
  await pg.exec(await readFile(DEFAULT_ACL, "utf8"));
  await pg.exec(await readFile(BASE, "utf8"));
  await pg.exec(await readFile(MIGRATION, "utf8"));
  return pg;
}

// Every fixture user is created through the real on_auth_user_created
// trigger, which builds the profile row + the default 'user' role.
async function createUserWithProfile(fullName, meta = {}) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/\s+/g, "-").toLowerCase()}@special.test`,
      JSON.stringify({ full_name: fullName, ...meta }),
    ],
  );
  return id;
}

test.before(async () => {
  db = await baseDb();

  // Admin account: the base trigger gives every new user the 'user' role;
  // we add the 'admin' role for the fixture admin.
  db.__adminId = await createUserWithProfile("Admin Proper", {});
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [db.__adminId],
  );

  for (let i = 0; i < 8; i++) {
    youngPlayers.push(await createUserWithProfile(`Young ${i}`, { age: "18" }));
  }
  for (let i = 0; i < 3; i++) {
    olderPlayers.push(await createUserWithProfile(`Older ${i}`, { age: "30" }));
  }
  for (let i = 0; i < 3; i++) {
    gks.push(
      await createUserWithProfile(`Keeper ${i}`, {
        age: "40",
        position: "Goalkeeper",
      }),
    );
  }
});

after(async () => {
  await db.close();
});

test("non-admin cannot create an edition", async () => {
  const voter = youngPlayers[0];
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  await assert.rejects(
    () => db.query("SELECT public.admin_create_special_award_edition(2027)"),
    /not authorized/,
  );
});

test("admin_create_special_award_edition seeds 2027 + the four awards with default rules", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  const res = await db.query(
    "SELECT award_key, award_id, period_id FROM public.admin_create_special_award_edition(2027)",
  );
  const keys = res.rows.map((r) => r.award_key).sort();
  assert.deepEqual(keys, ["gerd_muller", "kopa", "socrates", "yashin"]);
  periodId = res.rows[0].period_id;
  kopa = res.rows.find((r) => r.award_key === "kopa").award_id;
  yashin = res.rows.find((r) => r.award_key === "yashin").award_id;
  gerd = res.rows.find((r) => r.award_key === "gerd_muller").award_id;
  socrates = res.rows.find((r) => r.award_key === "socrates").award_id;

  const period = await db.query(
    "SELECT year, is_active FROM public.voting_periods WHERE id = $1",
    [periodId],
  );
  assert.equal(period.rows[0].year, 2027);
  assert.equal(period.rows[0].is_active, false);

  const rules = await db.query(
    "SELECT award_key, eligibility_type, eligibility_max_age, eligibility_position, voting_open, results_visible FROM public.special_awards ORDER BY award_key",
  );
  const byKey = Object.fromEntries(rules.rows.map((r) => [r.award_key, r]));
  assert.equal(byKey.kopa.eligibility_type, "max_age");
  assert.equal(byKey.kopa.eligibility_max_age, 21);
  assert.equal(byKey.yashin.eligibility_type, "by_position");
  assert.equal(byKey.yashin.eligibility_position, "Goalkeeper");
  assert.equal(byKey.gerd_muller.eligibility_type, "all");
  assert.equal(byKey.socrates.eligibility_type, "all");
  assert.ok(!byKey.kopa.voting_open);
  assert.ok(!byKey.kopa.results_visible);
});

test("open voting requires at least five candidates", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  await assert.rejects(
    () =>
      db.query(
        "SELECT public.admin_set_special_award_status($1, true, false)",
        [kopa],
      ),
    /at least 5 candidates/,
  );
});

test("eligibility is enforced at nomination time (server-side rule)", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_nominate_player($1, $2)", [
        kopa,
        olderPlayers[0],
      ]),
    /eligibility rule/,
  );
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_nominate_player($1, $2)", [
        yashin,
        youngPlayers[0],
      ]),
    /eligibility rule/,
  );
  const ok = await db.query("SELECT public.admin_nominate_player($1, $2)", [
    yashin,
    gks[0],
  ]);
  assert.ok(ok.rows[0].admin_nominate_player);
});

test("duplicate nominations are impossible", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  const first = await db.query("SELECT public.admin_nominate_player($1, $2)", [
    yashin,
    gks[1],
  ]);
  const second = await db.query("SELECT public.admin_nominate_player($1, $2)", [
    yashin,
    gks[1],
  ]);
  assert.equal(
    first.rows[0].admin_nominate_player,
    second.rows[0].admin_nominate_player,
  );
  const count = await db.query(
    "SELECT count(*)::int n FROM public.special_award_candidates WHERE award_id = $1 AND player_id = $2",
    [yashin, gks[1]],
  );
  assert.equal(count.rows[0].n, 1);
});

test("eligibility rule changes are validated and applied", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  await assert.rejects(
    () =>
      db.query(
        "SELECT public.admin_set_special_award_eligibility($1, 'max_age', NULL, NULL)",
        [gerd],
      ),
    /positive age/,
  );
  await assert.rejects(
    () =>
      db.query(
        "SELECT public.admin_set_special_award_eligibility($1, 'nonsense', NULL, NULL)",
        [gerd],
      ),
    /unknown eligibility type/,
  );
  await db.query(
    "SELECT public.admin_set_special_award_eligibility($1, 'all', NULL, NULL)",
    [yashin],
  );
  const r = await db.query(
    "SELECT eligibility_type FROM public.special_awards WHERE id = $1",
    [yashin],
  );
  assert.equal(r.rows[0].eligibility_type, "all");
  // restore
  await db.query(
    "SELECT public.admin_set_special_award_eligibility($1, 'by_position', NULL, 'Goalkeeper')",
    [yashin],
  );
});

test("nomination after voting opens is locked (checked on socrates)", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  // nominate 5 "all" players and open voting
  for (const p of [...youngPlayers.slice(0, 2), ...olderPlayers, ...gks]) {
    await db.query("SELECT public.admin_nominate_player($1, $2)", [
      socrates,
      p,
    ]);
  }
  await db.query(
    "SELECT public.admin_set_special_award_status($1, true, false)",
    [socrates],
  );
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_nominate_player($1, $2)", [
        socrates,
        youngPlayers[7],
      ]),
    /locked/,
  );
});

test("kopa opens with five young candidates; ballot rejects every malformed submission", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  for (const p of youngPlayers.slice(0, 5)) {
    await db.query("SELECT public.admin_nominate_player($1, $2)", [kopa, p]);
  }
  const open = await db.query(
    "SELECT public.admin_set_special_award_status($1, true, false)",
    [kopa],
  );
  assert.equal(open.command, "SELECT");

  // socrates is open too; kopa is the malformed-subject.
  const ids = youngPlayers.slice(0, 5);
  const asArray = (xs) => `{${xs.join(",")}}`;
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    youngPlayers[6],
  ]);

  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        kopa,
        asArray(ids.slice(0, 4)),
      ]),
    /exactly 5/,
  );
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        kopa,
        asArray([...ids.slice(0, 4), ids[0]]),
      ]),
    /duplicate candidate/,
  );
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        kopa,
        asArray([...ids.slice(0, 4), randomUUID()]),
      ]),
    /unknown or ineligible candidate/,
  );

  // self-vote: a candidate voting for themself
  // youngPlayers[5] is not nominated; use voter = a nominated candidate by
  // adding them through a second award ballot instead (kopa voter must not
  // be nominated). Use the socrates path: vote for own nomination.
  const socrRows = await db.query(
    "SELECT c.id, c.player_id FROM public.special_award_candidates c WHERE c.award_id = $1",
    [socrates],
  );
  const own = socrRows.rows.find(
    (r) => r.player_id === youngPlayers.slice(0, 2)[0],
  );
  assert.ok(own, "expected a nominated young player on socrates");
  const withoutSelf = socrRows.rows.filter((r) => r.id !== own.id).slice(0, 4);
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    own.player_id,
  ]);
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        socrates,
        asArray([own.id, ...withoutSelf.map((r) => r.id)]),
      ]),
    /cannot vote for yourself/,
  );

  // closed award: yashin is not open yet
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        yashin,
        asArray(ids.slice(0, 5)),
      ]),
    /voting is not open/,
  );

  // wrong award mix: kopa ballot with a socrates candidate id
  const foreign = socrRows.rows[0].id;
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    youngPlayers[6],
  ]);
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        kopa,
        asArray([...ids.slice(0, 4), foreign]),
      ]),
    /unknown or ineligible candidate/,
  );
});

const kopaCandidatesByPlayer = async () => {
  const rows = await db.query(
    "SELECT c.id, c.player_id FROM public.special_award_candidates c WHERE c.award_id = $1",
    [kopa],
  );
  return new Map(rows.rows.map((r) => [r.player_id, r.id]));
};

test("a complete five-row ballot commits with server-derived 5..1 points", async () => {
  const candidates = await kopaCandidatesByPlayer();
  const ids = youngPlayers.slice(0, 5).map((p) => candidates.get(p));
  const voter = youngPlayers[6];
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  const order = [ids[1], ids[0], ids[2], ids[3], ids[4]];
  await db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
    kopa,
    `{${order.join(",")}}`,
  ]);
  const rows = await db.query(
    "SELECT rank_position, points, candidate_id FROM public.special_votes WHERE voter_id = $1 AND award_id = $2 ORDER BY rank_position",
    [voter, kopa],
  );
  assert.equal(rows.rows.length, 5);
  assert.deepEqual(
    rows.rows.map((r) => [r.rank_position, r.points]),
    [
      [1, 5],
      [2, 4],
      [3, 3],
      [4, 2],
      [5, 1],
    ],
  );
  assert.equal(rows.rows[0].candidate_id, order[0]);
});

test("one final ballot per user per award: second submission rejected", async () => {
  const candidates = await kopaCandidatesByPlayer();
  const ids = youngPlayers.slice(0, 5).map((p) => candidates.get(p));
  const voter = youngPlayers[6];
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        kopa,
        `{${[...ids].reverse().join(",")}}`,
      ]),
    /already submitted/,
  );
});

test("row-level guards reject bad points and self-votes even on direct writes", async () => {
  const candidate = await db.query(
    "SELECT id, player_id FROM public.special_award_candidates WHERE award_id = $1 LIMIT 1",
    [kopa],
  );
  const c = candidate.rows[0];
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points) VALUES ($1, $2, $3, 1, 7)",
        [youngPlayers[7], kopa, c.id],
      ),
    /check/i,
  );
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points) VALUES ($1, $2, $3, 1, 5)",
        [c.player_id, kopa, c.id],
      ),
    /cannot vote for yourself/,
  );
  // candidate of another award cannot be used
  const foreign = await db.query(
    "SELECT id FROM public.special_award_candidates WHERE award_id = $1 LIMIT 1",
    [socrates],
  );
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points) VALUES ($1, $2, $3, 1, 5)",
        [randomUUID(), kopa, foreign.rows[0].id],
      ),
    /does not belong to the voted award/,
  );
});

test("authenticated has no direct INSERT on special_votes (RPC-only writes)", async () => {
  const voter = youngPlayers[7].toString();
  await db.query("SELECT set_config('test.user_id', $1, false)", [voter]);
  await db.query("SET ROLE authenticated");
  try {
    const cand = await db.query(
      "SELECT id FROM public.special_award_candidates WHERE award_id = $1 LIMIT 1",
      [kopa],
    );
    await assert.rejects(
      () =>
        db.query(
          "INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points) VALUES ($1, $2, $3, 1, 5)",
          [voter, kopa, cand.rows[0].id],
        ),
      /permission denied/,
    );
    // RLS: a user reading special_votes sees only their own rows.
    const mine = await db.query(
      "SELECT count(*)::int n FROM public.special_votes",
    );
    assert.equal(mine.rows[0].n, 0, "voter has no rows -> sees none");
    await db.query("RESET ROLE");
    const all = await db.query(
      "SELECT count(*)::int n FROM public.special_votes",
    );
    assert.equal(all.rows[0].n, 5, "owner path sees the submitted ballot");
  } finally {
    await db.query("RESET ROLE").catch(() => null);
  }
});

// ==========================================================================
// Privilege-boundary tests (B1/W1/W2): these exercise the REVOKEs against a
// harness that genuinely models the live Supabase default ACLs
// (tests/sql/10-supabase-default-acl.sql). Without that file, PGlite starts
// with an empty pg_default_acl and the REVOKEs would be no-ops — the
// privilege assertions below would pass vacuously. The negative-control
// probe table proves the simulation is active.
// ==========================================================================
test("default-ACL simulation is active (negative control) and special tables hold no write privileges for anon/authenticated", async () => {
  // Negative control: a table created after the default-ACL sim must inherit
  // ALL privileges for anon/authenticated. If this fails, the privilege
  // assertions below prove nothing.
  const probe = await db.query(
    "SELECT has_table_privilege('authenticated', 'public.privilege_probe', 'INSERT') AS a_ins, has_table_privilege('anon', 'public.privilege_probe', 'INSERT') AS n_ins",
  );
  assert.equal(
    probe.rows[0].a_ins,
    true,
    "authenticated must inherit INSERT on new tables (default-ACL sim inactive?)",
  );
  assert.equal(
    probe.rows[0].n_ins,
    true,
    "anon must inherit INSERT on new tables (default-ACL sim inactive?)",
  );

  for (const t of [
    "special_awards",
    "special_award_candidates",
    "special_votes",
  ]) {
    const r = await db.query(
      `SELECT
         has_table_privilege('authenticated', 'public.${t}', 'INSERT') AS a_ins,
         has_table_privilege('authenticated', 'public.${t}', 'UPDATE') AS a_upd,
         has_table_privilege('authenticated', 'public.${t}', 'DELETE') AS a_del,
         has_table_privilege('authenticated', 'public.${t}', 'TRUNCATE') AS a_trunc,
         has_table_privilege('authenticated', 'public.${t}', 'SELECT') AS a_sel,
         has_table_privilege('anon', 'public.${t}', 'INSERT') AS n_ins,
         has_table_privilege('anon', 'public.${t}', 'TRUNCATE') AS n_trunc`,
    );
    const row = r.rows[0];
    assert.equal(
      row.a_ins,
      false,
      `${t}: authenticated INSERT must be revoked`,
    );
    assert.equal(
      row.a_upd,
      false,
      `${t}: authenticated UPDATE must be revoked`,
    );
    assert.equal(
      row.a_del,
      false,
      `${t}: authenticated DELETE must be revoked`,
    );
    assert.equal(
      row.a_trunc,
      false,
      `${t}: authenticated TRUNCATE must be revoked (TRUNCATE is privilege-gated, not RLS-gated)`,
    );
    assert.equal(row.a_sel, true, `${t}: authenticated SELECT must remain`);
    assert.equal(row.n_ins, false, `${t}: anon INSERT must be revoked`);
    assert.equal(row.n_trunc, false, `${t}: anon TRUNCATE must be revoked`);
  }
});

test("TRUNCATE and anon writes are denied at the privilege layer (SET ROLE)", async () => {
  const cand = await db.query(
    "SELECT id FROM public.special_award_candidates WHERE award_id = $1 LIMIT 1",
    [kopa],
  );
  await db.query("SET ROLE authenticated");
  try {
    for (const t of [
      "special_awards",
      "special_award_candidates",
      "special_votes",
    ]) {
      await assert.rejects(
        () => db.query(`TRUNCATE public.${t}`),
        /permission denied/,
        `authenticated must not TRUNCATE ${t}`,
      );
    }
  } finally {
    await db.query("RESET ROLE");
  }
  await db.query("SET ROLE anon");
  try {
    await assert.rejects(
      () =>
        db.query(
          "INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points) VALUES ($1, $2, $3, 1, 5)",
          [randomUUID(), kopa, cand.rows[0].id],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("TRUNCATE public.special_votes"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("SELECT id FROM public.special_votes LIMIT 1"),
      /permission denied/,
    );
  } finally {
    await db.query("RESET ROLE");
  }
});

test("function EXECUTE matrix: RPCs open to authenticated, internal helpers closed (W2)", async () => {
  const rpcs = [
    "admin_create_special_award_edition",
    "admin_nominate_player",
    "admin_remove_nominee",
    "admin_set_special_award_eligibility",
    "admin_set_special_award_status",
    "admin_reset_special_votes",
    "get_special_award_stats",
    "submit_special_ballot",
    "get_special_award_results",
    "is_special_award_results_visible",
  ];
  const internals = [
    "special_award_eligible_profile",
    "special_votes_guard_row",
  ];
  const r = await db.query(
    `SELECT p.proname,
            has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY($1::text[])`,
    [`{${[...rpcs, ...internals].join(",")}}`],
  );
  const byName = new Map(r.rows.map((row) => [row.proname, row]));
  for (const name of rpcs) {
    const row = byName.get(name);
    assert.ok(row, `missing function ${name} in pg_proc`);
    assert.equal(row.anon_exec, false, `${name}: anon EXECUTE must be revoked`);
    assert.equal(
      row.auth_exec,
      true,
      `${name}: authenticated must retain EXECUTE`,
    );
  }
  for (const name of internals) {
    const row = byName.get(name);
    assert.ok(row, `missing helper ${name} in pg_proc`);
    assert.equal(row.anon_exec, false, `${name}: anon EXECUTE must be revoked`);
    assert.equal(
      row.auth_exec,
      false,
      `${name}: authenticated EXECUTE must be revoked (internal helper)`,
    );
  }
});

test("stats are visibility-gated: non-admin sees nothing pre-publication, admin sees {5,1} (W1)", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    youngPlayers[7],
  ]);
  const userStats = await db.query(
    "SELECT * FROM public.get_special_award_stats($1)",
    [kopa],
  );
  assert.equal(
    userStats.rows.length,
    0,
    "non-admin must get zero stats rows while results are hidden",
  );
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  const adminStats = await db.query(
    "SELECT * FROM public.get_special_award_stats($1)",
    [kopa],
  );
  assert.deepEqual(
    {
      vote_count: adminStats.rows[0].vote_count,
      voter_count: adminStats.rows[0].voter_count,
    },
    { vote_count: 5, voter_count: 1 },
    "admin always sees stats",
  );
});

test("results are hidden from users until the admin opens them; admins always see them", async () => {
  const userView = async () => {
    await db.query("SELECT set_config('test.user_id', $1, false)", [
      youngPlayers[7],
    ]);
    return (
      await db.query("SELECT * FROM public.get_special_award_results($1)", [
        kopa,
      ])
    ).rows;
  };
  const adminView = async () => {
    await db.query("SELECT set_config('test.user_id', $1, false)", [
      db.__adminId,
    ]);
    return (
      await db.query("SELECT * FROM public.get_special_award_results($1)", [
        kopa,
      ])
    ).rows;
  };

  assert.equal((await userView()).length, 0, "hidden while voting open");
  const visibility = await db.query(
    "SELECT public.is_special_award_results_visible($1)",
    [kopa],
  );
  assert.equal(visibility.rows[0].is_special_award_results_visible, false);

  const adminRows = await adminView();
  assert.equal(adminRows.length, 5);
  // Ranking: points desc, first-place desc
  assert.deepEqual(
    adminRows.map((r) => r.total_points),
    [5, 4, 3, 2, 1],
  );
  assert.ok(
    adminRows[0].full_name.startsWith("Young 1"),
    "rank 1 is the top pick",
  );
  assert.equal(adminRows[0].first_place_votes, 1);
  assert.equal(adminRows[0].total_rankings, 1);

  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  await db.query(
    "SELECT public.admin_set_special_award_status($1, true, true)",
    [kopa],
  );
  assert.equal((await userView()).length, 5);
  assert.equal(
    (
      await db.query("SELECT public.is_special_award_results_visible($1)", [
        kopa,
      ])
    ).rows[0].is_special_award_results_visible,
    true,
  );
  // Stats unlock with the same visibility flip (W1 gate).
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    youngPlayers[7],
  ]);
  const userStats = await db.query(
    "SELECT * FROM public.get_special_award_stats($1)",
    [kopa],
  );
  assert.equal(userStats.rows.length, 1);
  assert.deepEqual(
    {
      vote_count: userStats.rows[0].vote_count,
      voter_count: userStats.rows[0].voter_count,
    },
    { vote_count: 5, voter_count: 1 },
  );
});

test("nominees with votes cannot be removed; eligible ones can", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  const voted = await db.query(
    "SELECT player_id FROM public.special_award_candidates WHERE award_id = $1 LIMIT 1",
    [kopa],
  );
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_remove_nominee($1, $2)", [
        kopa,
        voted.rows[0].player_id,
      ]),
    /already received votes/,
  );
  await db.query("SELECT public.admin_nominate_player($1, $2)", [
    gerd,
    youngPlayers[7],
  ]);
  await db.query("SELECT public.admin_remove_nominee($1, $2)", [
    gerd,
    youngPlayers[7],
  ]);
  const r = await db.query(
    "SELECT count(*)::int n FROM public.special_award_candidates WHERE award_id = $1 AND player_id = $2",
    [gerd, youngPlayers[7]],
  );
  assert.equal(r.rows[0].n, 0);
});

test("stats and admin reset work per award", async () => {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    db.__adminId,
  ]);
  const stats = await db.query(
    "SELECT * FROM public.get_special_award_stats($1)",
    [kopa],
  );
  assert.deepEqual(
    {
      vote_count: stats.rows[0].vote_count,
      voter_count: stats.rows[0].voter_count,
    },
    { vote_count: 5, voter_count: 1 },
  );
  await db.query("SELECT public.admin_reset_special_votes($1)", [kopa]);
  const after = await db.query(
    "SELECT count(*)::int n FROM public.special_votes WHERE award_id = $1",
    [kopa],
  );
  assert.equal(after.rows[0].n, 0);
  const stats2 = await db.query(
    "SELECT * FROM public.get_special_award_stats($1)",
    [kopa],
  );
  assert.equal(stats2.rows[0].vote_count, 0);
});
