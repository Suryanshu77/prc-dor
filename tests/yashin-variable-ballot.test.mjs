// Yashin Trophy — variable nomination threshold + variable-length ballots.
//
// Guards for src/supabase/migrations/20261113090000_yashin_variable_ballot.sql
//
//   * Static: the new migration keeps the award-specific rule (yashin -> 3,
//     everyone else -> 5), reproduces the full production security body of
//     submit_special_ballot and leaves scoring as `6 - rank_position`.
//   * Functional: applies the FULL repo migration chain on PGlite (hermetic —
//     never Supabase), so submit_special_ballot is the real production body
//     including private.assert_voter_approved. Yashin is then opened with 3,
//     4 and 5 nominees and every 3/4/5-length ballot, plus each malformed
//     variant, is exercised against the live RPC.
//
// Kopa / Socrates / Gerd Muller are deliberately re-checked at the end so the
// variable rule can never leak onto the fixed top-5 awards.
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
const MIGRATION_NAME = "20261113090000_yashin_variable_ballot.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const stripped = readFileSync(MIGRATION, "utf8")
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function fnBody(text, name) {
  const start = text.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.ok(start >= 0, `function ${name} missing`);
  const open = text.indexOf("AS $$", start);
  assert.ok(open > start, `function ${name} has no AS $$ body`);
  const close = text.indexOf("$$;", open);
  assert.ok(close > open, `function ${name} body is not terminated`);
  return text.slice(open, close);
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
test("migration file name follows the convention and lands last in history", () => {
  assert.match(path.basename(MIGRATION), /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(
    !/password|recover|reset/i.test(path.basename(MIGRATION)),
    "must not look like a password-reset migration",
  );
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.equal(
    files[files.length - 1],
    MIGRATION_NAME,
    "the variable-ballot migration must be the newest so it wins the CREATE OR REPLACE race",
  );
});

test("only Yashin gets the variable rule; every other award stays at five", () => {
  const status = fnBody(stripped, "admin_set_special_award_status");
  assert.match(
    status,
    /_min := CASE WHEN _key = 'yashin' THEN 3 ELSE 5 END/,
    "open threshold must be award-specific (yashin 3, others 5)",
  );
  assert.match(status, /_awards < _min/, "threshold must be applied");

  const ballot = fnBody(stripped, "submit_special_ballot");
  assert.match(
    ballot,
    /WHEN _key = 'yashin' THEN GREATEST\(LEAST\(_available, 5\), 3\)/,
    "yashin required length must be derived from its nominee pool",
  );
  assert.match(
    ballot,
    /ELSE 5\s*END/,
    "every other award must keep a fixed five-pick ballot",
  );
});

test("the production security body of submit_special_ballot is preserved", () => {
  const ballot = fnBody(stripped, "submit_special_ballot");
  for (const guard of [
    /IF auth\.uid\(\) IS NULL THEN/,
    /PERFORM private\.assert_voter_approved\(auth\.uid\(\)\)/,
    /voting is not open for this award/,
    /ballot already submitted for this award/,
    /duplicate candidate in ballot/,
    /ballot contains an unknown or ineligible candidate/,
    /you cannot vote for yourself/,
    /6 - ord/,
  ]) {
    assert.match(ballot, guard, `missing guard: ${guard}`);
  }
  assert.match(
    stripped,
    /REVOKE ALL ON FUNCTION public\.submit_special_ballot/,
  );
  assert.match(
    stripped,
    /GRANT EXECUTE ON FUNCTION public\.submit_special_ballot\(uuid, uuid\[\]\) TO authenticated/,
  );
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain)
// ==========================================================================
let db;
let adminId;
let yashin;
let kopa;
let socrates;
let gerd;
const gks = []; // 6 goalkeepers -> Yashin nominees
const young = []; // 5 under-21 -> Kopa nominees
const filler = []; // 5 plain players -> Socrates / Gerd Muller nominees
const voters = []; // approved, never nominated anywhere

const uuidArray = (ids) => `{${ids.join(",")}}`;

async function createUser(fullName, meta = {}) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@yashin.test`,
      JSON.stringify({ full_name: fullName, ...meta }),
    ],
  );
  // The full chain includes the voter-approval migration: the signup trigger
  // leaves new users pending, which would fail the approval gate.
  await db.query(
    "UPDATE public.voter_approvals SET status = 'approved', decided_at = now() WHERE user_id = $1",
    [id],
  );
  return id;
}

async function asUser(id) {
  await db.query("SELECT set_config('test.user_id', $1, false)", [id ?? ""]);
}

async function nominate(awardId, playerId) {
  await asUser(adminId);
  return db.query("SELECT public.admin_nominate_player($1, $2)", [
    awardId,
    playerId,
  ]);
}

async function setStatus(awardId, open) {
  await asUser(adminId);
  return db.query(
    "SELECT public.admin_set_special_award_status($1, $2, false)",
    [awardId, open],
  );
}

async function submit(voterId, awardId, ids) {
  await asUser(voterId);
  return db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
    awardId,
    uuidArray(ids),
  ]);
}

async function candidatesOf(awardId) {
  const r = await db.query(
    "SELECT id, player_id FROM public.special_award_candidates WHERE award_id = $1 ORDER BY id",
    [awardId],
  );
  return r.rows;
}

async function ballotRows(voterId, awardId) {
  const r = await db.query(
    `SELECT rank_position, points FROM public.special_votes
      WHERE voter_id = $1 AND award_id = $2
      ORDER BY rank_position`,
    [voterId, awardId],
  );
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

  adminId = await createUser("Yashin Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );

  for (let i = 0; i < 6; i++) {
    gks.push(
      await createUser(`Keeper ${i}`, { age: "30", position: "Goalkeeper" }),
    );
  }
  for (let i = 0; i < 5; i++) {
    young.push(await createUser(`Young ${i}`, { age: "18" }));
  }
  for (let i = 0; i < 5; i++) {
    filler.push(await createUser(`Filler ${i}`, { age: "40" }));
  }
  for (let i = 0; i < 6; i++) {
    voters.push(
      await createUser(`Voter ${i}`, { age: "40", position: "Forward" }),
    );
  }

  await asUser(adminId);
  const edition = await db.query(
    "SELECT award_key, award_id FROM public.admin_create_special_award_edition(2027)",
  );
  const byKey = Object.fromEntries(
    edition.rows.map((r) => [r.award_key, r.award_id]),
  );
  yashin = byKey.yashin;
  kopa = byKey.kopa;
  socrates = byKey.socrates;
  gerd = byKey.gerd_muller;
  assert.ok(yashin && kopa && socrates && gerd, "all four awards seeded");
});

after(async () => {
  await db.close();
});

test("Yashin nomination threshold: 2 rejected, 3 accepted", async () => {
  // Empty pool.
  await assert.rejects(() => setStatus(yashin, true), /at least 3 candidates/);

  await nominate(yashin, gks[0]);
  await nominate(yashin, gks[1]);
  await assert.rejects(
    () => setStatus(yashin, true),
    /at least 3 candidates are required before voting can open \(have 2\)/,
  );

  await nominate(yashin, gks[2]);

  // Goalkeeper eligibility still applies to every Yashin nomination — checked
  // while voting is still closed, before the lock kicks in.
  await assert.rejects(
    () => nominate(yashin, filler[0]),
    /eligibility rule/,
    "non-goalkeepers must stay ineligible for Yashin",
  );

  const opened = await setStatus(yashin, true);
  assert.equal(opened.command, "SELECT", "3 nominees must open Yashin voting");
});

test("Yashin ballot with 3 nominees scores 5-4-3 and rejects malformed input", async () => {
  const c = await candidatesOf(yashin);
  assert.equal(c.length, 3);
  const [a, b, d] = c.map((r) => r.id);

  // Incomplete 3-candidate ballot.
  await assert.rejects(
    () => submit(voters[1], yashin, [a, b]),
    /exactly 3 candidates are required/,
  );
  // Duplicate candidate.
  await assert.rejects(
    () => submit(voters[1], yashin, [a, a, b]),
    /duplicate candidate in ballot/,
  );
  // Unknown / invalid candidate id.
  await assert.rejects(
    () => submit(voters[1], yashin, [a, b, randomUUID()]),
    /ballot contains an unknown or ineligible candidate/,
  );
  // The rejected attempts must not have written anything.
  assert.deepEqual(await ballotRows(voters[1], yashin), []);

  // Complete 3-candidate ballot commits 5, 4, 3.
  await submit(voters[0], yashin, [a, b, d]);
  assert.deepEqual(await ballotRows(voters[0], yashin), [
    { rank_position: 1, points: 5 },
    { rank_position: 2, points: 4 },
    { rank_position: 3, points: 3 },
  ]);
});

test("Yashin ballot with 4 nominees scores 5-4-3-2", async () => {
  await setStatus(yashin, false); // nominations are locked while voting is open
  await nominate(yashin, gks[3]);
  await setStatus(yashin, true);

  const c = await candidatesOf(yashin);
  assert.equal(c.length, 4);
  const ids = c.map((r) => r.id);

  await assert.rejects(
    () => submit(voters[2], yashin, ids.slice(0, 3)),
    /exactly 4 candidates are required/,
    "a 4-nominee pool must demand all four picks",
  );

  await submit(voters[2], yashin, ids);
  assert.deepEqual(await ballotRows(voters[2], yashin), [
    { rank_position: 1, points: 5 },
    { rank_position: 2, points: 4 },
    { rank_position: 3, points: 3 },
    { rank_position: 4, points: 2 },
  ]);
});

test("Yashin ballot with 5 nominees scores 5-4-3-2-1", async () => {
  await setStatus(yashin, false);
  await nominate(yashin, gks[4]);
  await setStatus(yashin, true);

  const c = await candidatesOf(yashin);
  assert.equal(c.length, 5);
  const ids = c.map((r) => r.id);

  // A 5-nominee pool is back to a strict top-5 ballot.
  await assert.rejects(
    () => submit(voters[3], yashin, ids.slice(0, 4)),
    /exactly 5 candidates are required/,
  );

  await submit(voters[3], yashin, ids);
  assert.deepEqual(await ballotRows(voters[3], yashin), [
    { rank_position: 1, points: 5 },
    { rank_position: 2, points: 4 },
    { rank_position: 3, points: 3 },
    { rank_position: 4, points: 2 },
    { rank_position: 5, points: 1 },
  ]);
});

test("a 6th nominee still ranks only the top five", async () => {
  await setStatus(yashin, false);
  await nominate(yashin, gks[5]);
  await setStatus(yashin, true);

  const c = await candidatesOf(yashin);
  assert.equal(c.length, 6);
  const ids = c.map((r) => r.id);

  // Six picks are refused: the pool may exceed five, the ballot may not.
  await assert.rejects(
    () => submit(voters[4], yashin, ids),
    /exactly 5 candidates are required/,
  );

  await submit(voters[4], yashin, ids.slice(0, 5));
  assert.equal((await ballotRows(voters[4], yashin)).length, 5);
});

test("variable-length Yashin ballots aggregate correctly", async () => {
  await asUser(adminId);
  const raw = await db.query(
    `SELECT candidate_id, COALESCE(SUM(points), 0)::int AS total,
            COUNT(*) FILTER (WHERE rank_position = 1)::int AS firsts
       FROM public.special_votes
      WHERE award_id = $1
      GROUP BY candidate_id`,
    [yashin],
  );
  const expected = new Map(raw.rows.map((r) => [r.candidate_id, r]));

  const results = await db.query(
    "SELECT * FROM public.get_special_award_results($1)",
    [yashin],
  );
  assert.ok(results.rows.length > 0);
  for (const row of results.rows) {
    const exp = expected.get(row.candidate_id);
    assert.equal(
      row.total_points,
      exp ? exp.total : 0,
      "total_points must equal SUM(special_votes.points)",
    );
    assert.equal(row.first_place_votes, exp ? exp.firsts : 0);
  }

  // Every stored score must come from the unchanged 5..1 scale, whatever the
  // length of the ballot that produced it.
  const scale = await db.query(
    "SELECT DISTINCT points FROM public.special_votes WHERE award_id = $1 ORDER BY points",
    [yashin],
  );
  assert.deepEqual(
    scale.rows.map((r) => r.points),
    [1, 2, 3, 4, 5],
    "Yashin scores must stay on the 5,4,3,2,1 scale",
  );

  // Every ballot of this award is exactly the length its pool demanded.
  const lengths = await db.query(
    `SELECT COUNT(*)::int AS n, COUNT(DISTINCT voter_id)::int AS voters
       FROM public.special_votes WHERE award_id = $1`,
    [yashin],
  );
  assert.equal(
    lengths.rows[0].voters,
    4,
    "four voters cast a Yashin ballot (3-, 4-, 5- and 5-pick stages)",
  );
});

test("Kopa, Socrates and Gerd Muller still require exactly five", async () => {
  const cases = [
    [kopa, young, voters[5]],
    [socrates, filler, voters[5]],
    [gerd, filler, voters[5]],
  ];

  for (const [awardId, pool] of cases) {
    // Four nominees must not open a fixed top-5 award.
    for (const p of pool.slice(0, 4)) await nominate(awardId, p);
    await assert.rejects(
      () => setStatus(awardId, true),
      /at least 5 candidates are required before voting can open \(have 4\)/,
      "non-Yashin awards keep the five-nominee threshold",
    );

    await nominate(awardId, pool[4]);
    await setStatus(awardId, true);

    const c = await candidatesOf(awardId);
    assert.equal(c.length, 5);
    const ids = c.map((r) => r.id);

    await assert.rejects(
      () => submit(voters[5], awardId, ids.slice(0, 4)),
      /exactly 5 candidates are required/,
      "non-Yashin awards must reject a 4-pick ballot",
    );

    await submit(voters[5], awardId, ids);
    assert.equal((await ballotRows(voters[5], awardId)).length, 5);
  }
});

test("one final ballot per user per award is still enforced", async () => {
  const c = await candidatesOf(yashin);
  const ids = c.map((r) => r.id);

  // voters[0] already submitted a Yashin ballot in the 3-nominee stage.
  await assert.rejects(
    () => submit(voters[0], yashin, ids),
    /ballot already submitted for this award/,
  );

  // ...and the same voter may still vote once on a *different* award.
  const kopaIds = (await candidatesOf(kopa)).map((r) => r.id);
  await submit(voters[0], kopa, kopaIds);
  assert.equal((await ballotRows(voters[0], kopa)).length, 5);
});
