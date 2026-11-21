// Position-exclusive Special Awards (Best Midfielder + Best Defender) guards.
// - Static: pins the security/invariant contract of
//   src/supabase/migrations/20261120120000_position_group_awards.sql and the
//   frontend wiring for the two new awards.
// - Functional: applies the FULL repo migration chain on PGlite (hermetic,
//   never touches Supabase) and exercises the classifier, the nomination
//   accept/reject matrix, the eligibility lock, the open threshold, the
//   5..1 ballot and the one-ballot rule for the new awards.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");
const MIGRATIONS_DIR = path.join(ROOT, "src/supabase/migrations");
const MIGRATION_NAME = "20261120120000_position_group_awards.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const filesIndexOf = (f) => FILES.indexOf(f);

const sql = await readFile(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
// output column name. Quoting it is a no-op on the Supabase versions these
// migrations already ran on. (Same shim as the other full-chain tests.)
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

const SIX_KEYS = [
  "kopa",
  "yashin",
  "gerd_muller",
  "socrates",
  "best_midfielder",
  "best_defender",
];
// Functions this migration redefines or introduces; no later file may win the
// CREATE OR REPLACE race against them.
const OWNED_FUNCTIONS = [
  "special_award_position_group",
  "special_award_eligible_profile",
  "admin_create_special_award_edition",
  "admin_nominate_player",
  "admin_set_special_award_eligibility",
  "admin_set_all_special_award_status",
];

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
    "must apply after the original master-control migration it replaces",
  );
  assert.equal(
    FILES[FILES.length - 1],
    MIGRATION_NAME,
    "the position-group awards migration must be the newest migration file",
  );
});

test("no later migration may redefine the functions this file owns", () => {
  const later = FILES.slice(filesIndexOf(MIGRATION_NAME) + 1);
  for (const f of later) {
    const body = readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    for (const fn of OWNED_FUNCTIONS) {
      assert.ok(
        !body.includes(`CREATE OR REPLACE FUNCTION public.${fn}`),
        `${f} must not redefine public.${fn} (20261120120000 owns it)`,
      );
    }
    // submit_special_ballot was last redefined by the yashin migration; the
    // new awards fall through its fixed-5 ELSE branch, so nothing after this
    // file may touch it either.
    assert.ok(
      !body.includes("CREATE OR REPLACE FUNCTION public.submit_special_ballot"),
      `${f} must not redefine submit_special_ballot`,
    );
  }
});

test("award_key CHECK grows to exactly the six keys", () => {
  assert.match(
    stripped,
    /CHECK \(award_key IN \('kopa', 'yashin', 'gerd_muller', 'socrates', 'best_midfielder', 'best_defender'\)\)/,
    "the six-key allow-list must be declared on the table",
  );
  assert.match(
    stripped,
    /DROP CONSTRAINT %I.*\n\s+END IF;\nEND \$\$;/,
    "the previous award_key CHECK is found by pattern (re-runnable)",
  );
});

test("eligibility schema gains by_position_group and the position group column", () => {
  assert.match(
    stripped,
    /ADD COLUMN IF NOT EXISTS eligibility_position_group text/,
  );
  assert.match(
    stripped,
    /eligibility_position_group IS NULL\s+OR eligibility_position_group IN \('midfielder', 'defender'\)/,
    "only the two product groups can be stored",
  );
  assert.match(
    stripped,
    /CHECK \(eligibility_type IN \('all', 'by_position', 'max_age', 'by_position_group'\)\)/,
  );
  assert.match(
    stripped,
    /eligibility_type = 'by_position_group'\s+AND eligibility_position_group IS NOT NULL\s+AND eligibility_position_group IN \('midfielder', 'defender'\)/,
    "a typed rule must carry its group (composite rule CHECK)",
  );
});

test("the classifier is a single immutable helper revoked from API roles", () => {
  const start = stripped.indexOf(
    "CREATE OR REPLACE FUNCTION public.special_award_position_group",
  );
  assert.ok(start >= 0, "classifier must exist");
  const body = stripped.slice(start, stripped.indexOf("$$;", start));
  assert.match(body, /IMMUTABLE/);
  assert.match(body, /WHEN 'midfielder'\s+THEN 'midfielder'/);
  assert.match(body, /WHEN 'defender'\s+THEN 'defender'/);
  assert.match(body, /WHEN 'cb'\s+THEN 'defender'/);
  assert.match(body, /WHEN 'cm'\s+THEN 'midfielder'/);
  assert.match(
    body,
    /WHEN 'winger'\s+THEN 'forward'/,
    "wingers normalise to forward: excluded from both new awards",
  );
  assert.match(
    body,
    /ELSE NULL/,
    "unknown labels and NULL normalise to NULL (fail-closed)",
  );
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.special_award_position_group(text) FROM PUBLIC, anon, authenticated;",
    ),
    "the classifier must not be callable by API roles (internal helper)",
  );
});

test("the eligibility evaluator takes six arguments and keeps the legacy branches", () => {
  assert.ok(
    sql.includes(
      "DROP FUNCTION IF EXISTS public.special_award_eligible_profile(text, public.player_position, int, int, public.player_position);",
    ),
    "the five-argument form must be dropped so only one overload remains",
  );
  const start = stripped.indexOf(
    "CREATE OR REPLACE FUNCTION public.special_award_eligible_profile(",
  );
  assert.ok(start >= 0);
  const sig = stripped.slice(start, stripped.indexOf("$$", start));
  assert.match(sig, /_eligibility_position_group text\s*\)/);
  assert.match(
    stripped,
    /REVOKE ALL ON FUNCTION public\.special_award_eligible_profile\(text, public\.player_position, int, int, public\.player_position, text\) FROM PUBLIC, anon, authenticated;/,
  );
  const evalStart = stripped.indexOf(
    "CREATE OR REPLACE FUNCTION public.special_award_eligible_profile(",
  );
  const evalBody = stripped.slice(
    evalStart,
    stripped.indexOf("$$;", evalStart),
  );
  assert.match(
    evalBody,
    /WHEN 'by_position_group' THEN\s+_eligibility_position_group IS NOT NULL/,
  );
  assert.match(evalBody, /WHEN 'max_age' THEN/);
  assert.match(evalBody, /WHEN 'by_position' THEN/);
  assert.match(evalBody, /ELSE true\s+END,/);
});

test("edition creation seeds six awards with by_position_group defaults", () => {
  for (const [key, title] of [
    ["best_midfielder", "Best Midfielder Award"],
    ["best_defender", "Best Defender Award"],
  ]) {
    assert.match(stripped, new RegExp(`'${key}',\\s*'${title}'`));
  }
  assert.match(
    stripped,
    /'by_position_group',\s*'midfielder'\)/,
    "Best Midfielder defaults to the midfielder group",
  );
  assert.match(
    stripped,
    /'by_position_group',\s*'defender'\)/,
    "Best Defender defaults to the defender group",
  );
  assert.match(
    stripped,
    /Recognising the finest midfield performance of the season\./,
  );
  assert.match(
    stripped,
    /Recognising the finest defensive performance of the season\./,
  );
  // Legacy seeds must survive untouched in the same function.
  assert.match(
    stripped,
    /award_key = 'kopa'\s+AND\s+sa\.eligibility_type = 'all'/,
    "kopa still starts configurable before the max_age default applies",
  );
});

test("pre-existing editions are topped up with the two missing award rows", () => {
  const topUpAt = stripped.indexOf("CROSS JOIN (VALUES");
  assert.ok(topUpAt >= 0, "the data top-up INSERT must exist");
  const topUp = stripped.slice(topUpAt);
  assert.match(topUp, /'best_midfielder'/);
  assert.match(topUp, /'best_defender'/);
  assert.match(
    topUp,
    /ON CONFLICT \(voting_period_id, award_key\) DO NOTHING/,
    "idempotent: existing rows are never touched",
  );
});

test("nomination passes the award's position group to the six-arg evaluator", () => {
  const start = stripped.indexOf(
    "CREATE OR REPLACE FUNCTION public.admin_nominate_player",
  );
  assert.ok(start >= 0);
  const body = stripped.slice(start, stripped.indexOf("$$;", start));
  assert.match(
    body,
    /public\.special_award_eligible_profile\(\s*_award\.eligibility_type,\s*_award\.eligibility_position,\s*_award\.eligibility_max_age,\s*\(SELECT age FROM public\.profiles WHERE id = _player_id\),\s*\(SELECT position FROM public\.profiles WHERE id = _player_id\),\s*_award\.eligibility_position_group\s*\)/,
    "server-side re-check on every nomination, group included",
  );
  assert.match(body, /has_role\(auth\.uid\(\), 'admin'/);
  assert.match(body, /does not meet the eligibility rule/);
});

test("the two new awards are locked against eligibility changes; legacy stays open", () => {
  const start = stripped.indexOf(
    "CREATE OR REPLACE FUNCTION public.admin_set_special_award_eligibility",
  );
  assert.ok(start >= 0);
  const body = stripped.slice(start, stripped.indexOf("$$;", start));
  assert.match(
    body,
    /IF _key IN \('best_midfielder', 'best_defender'\) THEN\s+RAISE EXCEPTION 'eligibility is fixed for this award/,
    "position exclusivity cannot be loosened through the RPC",
  );
  assert.match(
    body,
    /_eligibility_type NOT IN \('all', 'by_position', 'max_age'\)/,
    "the RPC keeps its legacy three-type vocabulary",
  );
  assert.match(body, /votes already exist: eligibility is locked/);
});

test("frontend wires the position-group awards through the shared helpers", async () => {
  const pg = await readFile(
    path.join(ROOT, "src/lib/position-group.ts"),
    "utf8",
  );
  assert.match(pg, /export function positionGroup\(/);
  assert.match(pg, /export function positionGroupPlural\(/);
  assert.match(
    pg,
    /winger.*forward/s,
    "the TS classifier must agree with the SQL one on wingers",
  );

  const lib = await readFile(
    path.join(ROOT, "src/lib/special-awards.ts"),
    "utf8",
  );
  assert.match(
    lib,
    /"best_midfielder",\s*"best_defender",?\s*\]/,
    "display order must end with the two new awards",
  );

  const admin = await readFile(
    path.join(ROOT, "src/routes/_authenticated/admin.tsx"),
    "utf8",
  );
  assert.match(
    admin,
    /eligType === "by_position_group"[\s\S]{0,200}positionGroup\(p\.position\) === award\.eligibility_position_group/,
    "the eligible-player preview honours the position group",
  );
  assert.match(
    admin,
    /award\.eligibility_type === "by_position_group"/,
    "the editor must recognise the locked rule",
  );
  assert.match(
    admin,
    /positionGroupPlural\(award\.eligibility_position_group\)/,
    "describeEligibility renders the locked rule",
  );

  const vote = await readFile(
    path.join(ROOT, "src/routes/_authenticated/vote-special.tsx"),
    "utf8",
  );
  assert.match(vote, /case "by_position_group"/);
  assert.match(vote, /compareSpecialAwardKeys/);
  const intro = vote.match(/function AwardIntro\([\s\S]*?\n\}$/m)?.[0];
  assert.ok(intro, "AwardIntro must exist");
  assert.ok(
    /Award className="animate-fade-up/.test(intro),
    "missing trophy artwork must fall back to the gold Award icon",
  );

  const results = await readFile(
    path.join(ROOT, "src/routes/_authenticated/results.tsx"),
    "utf8",
  );
  assert.match(results, /compareSpecialAwardKeys/);

  const types = await readFile(
    path.join(ROOT, "src/integrations/supabase/types.ts"),
    "utf8",
  );
  assert.match(types, /eligibility_position_group: string \| null/);
});

test("trophy artwork ships and compact headers use the gold Medal icon", async () => {
  const lib = await readFile(
    path.join(ROOT, "src/lib/special-awards.ts"),
    "utf8",
  );
  const vote = await readFile(
    path.join(ROOT, "src/routes/_authenticated/vote-special.tsx"),
    "utf8",
  );
  const admin = await readFile(
    path.join(ROOT, "src/routes/_authenticated/admin.tsx"),
    "utf8",
  );
  const results = await readFile(
    path.join(ROOT, "src/routes/_authenticated/results.tsx"),
    "utf8",
  );

  // The shared artwork map keeps exactly the two position-exclusive awards —
  // the four legacy trophies are never listed, so AwardIntro keeps its own
  // literals for them.
  const mapAt = lib.indexOf("export const POSITION_GROUP_TROPHY_IMAGES");
  assert.ok(mapAt >= 0, "the shared artwork map must exist");
  const mapBlock = lib.slice(mapAt, lib.indexOf("};", mapAt));
  for (const key of ["best_midfielder", "best_defender"]) {
    assert.ok(
      mapBlock.includes(`${key}: "/images/special-awards/${key}.png"`),
      `the shared map must pin "${key}" to its PNG path`,
    );
  }
  assert.strictEqual(
    (mapBlock.match(/\/images\/special-awards\//g) ?? []).length,
    2,
    "only the two position-exclusive awards may appear in the shared map",
  );

  // The award-key predicate drives the compact-header icon and pins exactly
  // the two position-exclusive keys (mirrors the SQL eligibility lock).
  assert.match(lib, /export function isPositionGroupAward\(/);
  const keysAt = lib.indexOf("POSITION_GROUP_AWARD_KEYS");
  assert.ok(keysAt >= 0, "the position-group key set must exist");
  const keysBlock = lib.slice(keysAt, lib.indexOf("];", keysAt));
  assert.deepStrictEqual(
    [...keysBlock.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]),
    ["best_midfielder", "best_defender"],
    "the predicate must cover exactly the two new awards",
  );
  assert.ok(
    !keysBlock.includes("kopa") && !keysBlock.includes("yashin"),
    "the four legacy awards must stay out of the predicate",
  );

  // The PNGs exist on disk and carry real artwork, not placeholders.
  for (const key of ["best_midfielder", "best_defender"]) {
    const bytes = readFileSync(
      path.join(ROOT, "public/images/special-awards", `${key}.png`),
    );
    assert.ok(bytes.length > 100_000, `${key}.png must not be a placeholder`);
  }

  // Vote page: AwardIntro still spreads the shared map into its full-size
  // artwork (exactly one image, looked up by award_key).
  assert.ok(
    vote.includes("...POSITION_GROUP_TROPHY_IMAGES"),
    "AwardIntro must pick up the two new trophies from the shared map",
  );
  const intro = vote.match(/function AwardIntro\([\s\S]*?\n\}$/m)?.[0];
  assert.ok(intro, "AwardIntro must exist");
  assert.strictEqual(
    (intro.match(/<img/g) ?? []).length,
    1,
    "AwardIntro must show exactly one trophy image",
  );
  assert.ok(
    intro.includes("AWARD_TROPHY_IMAGES[award.award_key]"),
    "AwardIntro must keep looking the artwork up by award_key",
  );
  assert.ok(
    intro.includes("max-h-[460px]"),
    "AwardIntro must keep the full-size trophy layout",
  );

  // Compact headers render no trophy thumbnail: the two new awards show the
  // existing gold Medal icon, while the legacy four keep the gold Award icon
  // (vote page + results) or stay title-only (admin).
  const blockOf = (src, name) => {
    const block = src.match(
      new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}$`, "m"),
    )?.[0];
    assert.ok(block, `${name} must exist`);
    assert.ok(
      !/<img/.test(block),
      `${name} must not render a trophy thumbnail`,
    );
    return block;
  };

  for (const [name, src, fn] of [
    ["vote-special", vote, "AwardHeader"],
    ["results", results, "AwardResultsCard"],
  ]) {
    const block = blockOf(src, fn);
    assert.match(
      block,
      /isPositionGroupAward\(award\.award_key\)/,
      `${name} must gate the header icon on the award key`,
    );
    assert.match(
      block,
      /<Medal className="h-5 w-5 shrink-0 text-gold" \/>/,
      `${name} must show the gold Medal icon for the two new awards`,
    );
    assert.match(
      block,
      /<Award className="h-5 w-5 text-gold" \/>/,
      `${name} must keep the gold Award icon for the legacy four`,
    );
  }

  // Admin cards: the medal is conditional, so legacy rows stay title-only.
  const adminCard = blockOf(admin, "AwardManageCard");
  assert.match(
    adminCard,
    /isPositionGroupAward\(award\.award_key\) &&/,
    "admin must render the medal only for the two new awards",
  );
  assert.match(
    adminCard,
    /<Medal className="h-5 w-5 shrink-0 text-gold" \/>/,
    "admin must show the gold Medal icon for the two new awards",
  );

  // The helper that served the removed thumbnails is gone everywhere.
  for (const [name, src] of [
    ["vote-special", vote],
    ["results", results],
    ["admin", admin],
  ]) {
    assert.ok(
      !src.includes("specialAwardHeaderTrophy"),
      `${name} must not reference the removed thumbnail helper`,
    );
  }
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain)
// ==========================================================================
let db;
let adminId;
let voterId;
let midId;
let defId;
let gkId;
let strikerId;
let wingerId;
let noPosId;
let periodId;
let midAward;
let defAward;
const mids = []; // 6 Midfielders -> nominees + spare
const defs = []; // 6 Defenders -> nominees + spare

async function createUser(fullName, meta = {}) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      id,
      `${fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id.slice(0, 8)}@position.test`,
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

before(async () => {
  db = new PGlite();
  await db.exec(await readFile(STUB, "utf8"));
  await db.exec(await readFile(STORAGE_STUB, "utf8"));
  await db.exec(await readFile(DEFAULT_ACL, "utf8"));
  for (const f of FILES) {
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }

  adminId = await createUser("Position Admin");
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [adminId],
  );
  voterId = await createUser("Position Voter");
  for (let i = 0; i < 6; i++) {
    mids.push(
      await createUser(`Mid ${i}`, { age: "26", position: "Midfielder" }),
    );
  }
  for (let i = 0; i < 6; i++) {
    defs.push(
      await createUser(`Def ${i}`, { age: "27", position: "Defender" }),
    );
  }
  gkId = await createUser("Keeper Solo", {
    age: "30",
    position: "Goalkeeper",
  });
  strikerId = await createUser("Striker Solo", {
    age: "25",
    position: "Striker",
  });
  wingerId = await createUser("Winger Solo", {
    age: "24",
    position: "Winger",
  });
  noPosId = await createUser("No Position", { age: "25" });

  await asUser(adminId);
  const edition = await db.query(
    "SELECT award_key, award_id, period_id FROM public.admin_create_special_award_edition(2027)",
  );
  periodId = edition.rows[0].period_id;
  midAward = edition.rows.find(
    (r) => r.award_key === "best_midfielder",
  ).award_id;
  defAward = edition.rows.find((r) => r.award_key === "best_defender").award_id;
});

after(async () => {
  await db.close();
});

test("classifier normalises stored positions, abbreviations and unknowns", async () => {
  const cases = [
    ["Midfielder", "midfielder"],
    ["Defender", "defender"],
    ["Goalkeeper", "goalkeeper"],
    ["Striker", "forward"],
    ["Winger", "forward"],
    ["cm", "midfielder"],
    ["cdm", "midfielder"],
    ["cam", "midfielder"],
    ["lm", "midfielder"],
    ["rm", "midfielder"],
    ["cb", "defender"],
    ["lb", "defender"],
    ["rb", "defender"],
    ["lwb", "defender"],
    ["rwb", "defender"],
    ["gk", "goalkeeper"],
    ["st", "forward"],
    ["cf", "forward"],
    ["lw", "forward"],
    ["rw", "forward"],
    ["centre-back", "defender"],
    ["Playmaker", null],
    ["", null],
    [null, null],
  ];
  for (const [input, expected] of cases) {
    const r = await db.query(
      "SELECT public.special_award_position_group($1) AS g",
      [input],
    );
    assert.equal(
      r.rows[0].g,
      expected,
      `special_award_position_group(${JSON.stringify(input)})`,
    );
  }
});

test("edition seeds six awards with the right keys, rules and descriptions", async () => {
  await asUser(adminId);
  const rules = await db.query(
    `SELECT award_key, title, description, eligibility_type,
            eligibility_position_group, eligibility_max_age, eligibility_position,
            voting_open, results_visible
       FROM public.special_awards
      WHERE voting_period_id = $1
      ORDER BY award_key`,
    [periodId],
  );
  const byKey = Object.fromEntries(rules.rows.map((r) => [r.award_key, r]));
  assert.deepEqual(Object.keys(byKey), [...SIX_KEYS].sort());

  const mid = byKey.best_midfielder;
  assert.equal(mid.eligibility_type, "by_position_group");
  assert.equal(mid.eligibility_position_group, "midfielder");
  assert.equal(
    mid.description,
    "Recognising the finest midfield performance of the season.",
  );
  assert.ok(mid.voting_open === false);

  const def = byKey.best_defender;
  assert.equal(def.eligibility_type, "by_position_group");
  assert.equal(def.eligibility_position_group, "defender");
  assert.equal(
    def.description,
    "Recognising the finest defensive performance of the season.",
  );

  // Legacy awards keep their defaults.
  assert.equal(byKey.kopa.eligibility_type, "max_age");
  assert.equal(byKey.kopa.eligibility_max_age, 21);
  assert.equal(byKey.yashin.eligibility_type, "by_position");
  assert.equal(byKey.yashin.eligibility_position, "Goalkeeper");
  assert.equal(byKey.gerd_muller.eligibility_type, "all");
  assert.equal(byKey.socrates.eligibility_type, "all");
});

test("only admins may nominate to the new awards", async () => {
  await asUser(voterId);
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_nominate_player($1, $2)", [
        midAward,
        mids[5],
      ]),
    /not authorized/,
  );
  await asUser(null);
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_nominate_player($1, $2)", [
        midAward,
        mids[5],
      ]),
    /not authorized/,
  );
});

test("nomination matrix: midfielders-only and defenders-only, server-side", async () => {
  await asUser(adminId);

  // Best Midfielder: accept the midfielder group.
  for (const p of mids.slice(0, 5)) {
    const r = await db.query("SELECT public.admin_nominate_player($1, $2)", [
      midAward,
      p,
    ]);
    assert.ok(r.rows[0].admin_nominate_player, "midfielder must be accepted");
  }
  // Reject every other group, including wingers (forward) and unknowns.
  for (const [label, p] of [
    ["goalkeeper", gkId],
    ["striker", strikerId],
    ["winger", wingerId],
    ["no position", noPosId],
    ["defender", defs[0]],
  ]) {
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_nominate_player($1, $2)", [midAward, p]),
      /eligibility rule/,
      `${label} must be rejected for Best Midfielder`,
    );
  }

  // Best Defender: accept the defender group.
  for (const p of defs.slice(0, 5)) {
    const r = await db.query("SELECT public.admin_nominate_player($1, $2)", [
      defAward,
      p,
    ]);
    assert.ok(r.rows[0].admin_nominate_player, "defender must be accepted");
  }
  for (const [label, p] of [
    ["goalkeeper", gkId],
    ["striker", strikerId],
    ["winger", wingerId],
    ["no position", noPosId],
    ["midfielder", mids[0]],
  ]) {
    await assert.rejects(
      () =>
        db.query("SELECT public.admin_nominate_player($1, $2)", [defAward, p]),
      /eligibility rule/,
      `${label} must be rejected for Best Defender`,
    );
  }

  const counts = await db.query(
    `SELECT sa.award_key, count(*)::int n
       FROM public.special_award_candidates c
       JOIN public.special_awards sa ON sa.id = c.award_id
      WHERE sa.award_key IN ('best_midfielder', 'best_defender')
      GROUP BY sa.award_key`,
  );
  assert.deepEqual(
    Object.fromEntries(counts.rows.map((r) => [r.award_key, r.n])),
    { best_midfielder: 5, best_defender: 5 },
  );
});

test("eligibility of the new awards is locked; legacy awards stay configurable", async () => {
  await asUser(adminId);
  // The lock fires before any argument validation or write.
  await assert.rejects(
    () =>
      db.query(
        "SELECT public.admin_set_special_award_eligibility($1, 'all', NULL, NULL)",
        [midAward],
      ),
    /eligibility is fixed for this award/,
  );
  await assert.rejects(
    () =>
      db.query(
        "SELECT public.admin_set_special_award_eligibility($1, 'by_position', NULL, 'Defender')",
        [defAward],
      ),
    /eligibility is fixed for this award/,
  );
  const unchanged = await db.query(
    "SELECT eligibility_type, eligibility_position_group FROM public.special_awards WHERE id = $1",
    [midAward],
  );
  assert.equal(unchanged.rows[0].eligibility_type, "by_position_group");
  assert.equal(unchanged.rows[0].eligibility_position_group, "midfielder");

  // Legacy path still works (gerd_muller: all -> max_age 21 -> restore).
  const gerd = await db.query(
    "SELECT id FROM public.special_awards WHERE voting_period_id = $1 AND award_key = 'gerd_muller'",
    [periodId],
  );
  const gerdId = gerd.rows[0].id;
  await db.query(
    "SELECT public.admin_set_special_award_eligibility($1, 'max_age', 21, NULL)",
    [gerdId],
  );
  const configured = await db.query(
    "SELECT eligibility_type, eligibility_max_age FROM public.special_awards WHERE id = $1",
    [gerdId],
  );
  assert.equal(configured.rows[0].eligibility_type, "max_age");
  assert.equal(configured.rows[0].eligibility_max_age, 21);
  await db.query(
    "SELECT public.admin_set_special_award_eligibility($1, 'all', NULL, NULL)",
    [gerdId],
  );
});

test("open threshold: two nominees block the open; three unlock it", async () => {
  await asUser(adminId);
  // Currently 5 nominees (from the nomination matrix test).
  // Remove three -> 2/3, below the new threshold of 3.
  await db.query("SELECT public.admin_remove_nominee($1, $2)", [
    midAward,
    mids[2],
  ]);
  await db.query("SELECT public.admin_remove_nominee($1, $2)", [
    midAward,
    mids[3],
  ]);
  await db.query("SELECT public.admin_remove_nominee($1, $2)", [
    midAward,
    mids[4],
  ]);
  await assert.rejects(
    () =>
      db.query(
        "SELECT public.admin_set_special_award_status($1, true, false)",
        [midAward],
      ),
    /at least 3 candidates/,
  );
  const closed = await db.query(
    "SELECT voting_open FROM public.special_awards WHERE id = $1",
    [midAward],
  );
  assert.equal(closed.rows[0].voting_open, false, "award must stay closed");

  // Restore one nominee -> 3/3, which meets the threshold -> open.
  await db.query("SELECT public.admin_nominate_player($1, $2)", [
    midAward,
    mids[4],
  ]);
  await db.query(
    "SELECT public.admin_set_special_award_status($1, true, false)",
    [midAward],
  );
  const opened = await db.query(
    "SELECT voting_open FROM public.special_awards WHERE id = $1",
    [midAward],
  );
  assert.equal(
    opened.rows[0].voting_open,
    true,
    "award must open at 3 nominees",
  );

  // Close voting so we can restore the remaining nominees for downstream tests.
  await db.query(
    "SELECT public.admin_set_special_award_status($1, false, false)",
    [midAward],
  );
  await db.query("SELECT public.admin_nominate_player($1, $2)", [
    midAward,
    mids[3],
  ]);
  await db.query("SELECT public.admin_nominate_player($1, $2)", [
    midAward,
    mids[2],
  ]);
  await db.query(
    "SELECT public.admin_set_special_award_status($1, true, false)",
    [midAward],
  );
  const final = await db.query(
    "SELECT voting_open FROM public.special_awards WHERE id = $1",
    [midAward],
  );
  assert.equal(final.rows[0].voting_open, true, "voting must be open again");
});

test("nominations are locked while voting is open", async () => {
  await asUser(adminId);
  await assert.rejects(
    () =>
      db.query("SELECT public.admin_nominate_player($1, $2)", [
        midAward,
        defs[5],
      ]),
    /locked/,
  );
});

test("a complete five-row ballot commits with 5..1 points; a second one is rejected", async () => {
  const candidates = await db.query(
    "SELECT id FROM public.special_award_candidates WHERE award_id = $1 ORDER BY id",
    [midAward],
  );
  const ids = candidates.rows.map((r) => r.id);
  assert.equal(ids.length, 5);
  await asUser(voterId);

  // Malformed: fewer than five picks.
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        midAward,
        `{${ids.slice(0, 4).join(",")}}`,
      ]),
    /exactly 5/,
  );

  const order = [ids[1], ids[0], ids[2], ids[3], ids[4]];
  await db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
    midAward,
    `{${order.join(",")}}`,
  ]);
  const rows = await db.query(
    "SELECT rank_position, points, candidate_id FROM public.special_votes WHERE voter_id = $1 AND award_id = $2 ORDER BY rank_position",
    [voterId, midAward],
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
    "server-derived 5..1 scoring for the new award",
  );
  assert.equal(rows.rows[0].candidate_id, order[0]);

  // One final ballot per voter per award per edition.
  await assert.rejects(
    () =>
      db.query("SELECT public.submit_special_ballot($1, $2::uuid[])", [
        midAward,
        `{${[...ids].reverse().join(",")}}`,
      ]),
    /already submitted/,
  );
});

test("results stay hidden from users until published; the ranking is 5..1", async () => {
  await asUser(voterId);
  const hidden = await db.query(
    "SELECT * FROM public.get_special_award_results($1)",
    [midAward],
  );
  assert.equal(hidden.rows.length, 0, "results must be hidden pre-publication");

  await asUser(adminId);
  await db.query(
    "SELECT public.admin_set_special_award_status($1, true, true)",
    [midAward],
  );
  await asUser(voterId);
  const visible = await db.query(
    "SELECT * FROM public.get_special_award_results($1)",
    [midAward],
  );
  assert.equal(visible.rows.length, 5);
  assert.deepEqual(
    visible.rows.map((r) => r.total_points),
    [5, 4, 3, 2, 1],
  );
});

test("function EXECUTE matrix: RPCs open to authenticated, internals closed", async () => {
  const rpcs = [
    "admin_create_special_award_edition",
    "admin_nominate_player",
    "admin_remove_nominee",
    "admin_set_special_award_eligibility",
    "admin_set_special_award_status",
    "submit_special_ballot",
    "get_special_award_results",
    "admin_set_all_special_award_status",
  ];
  const internals = [
    "special_award_position_group",
    "special_award_eligible_profile",
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
