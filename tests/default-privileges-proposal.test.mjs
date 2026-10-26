// Static guards for scripts/proposal-default-privileges.sql.
//
// The proposal is only ever executed by a human in the Supabase SQL Editor,
// so these tests pin its blast radius. Structure under test (2026-10-23
// revision, driven by the live verification CSVs of that date):
//
//   V0, M1..M3  four read-only catalog SELECTs (capability check, full
//               function audit, default-ACL inventory incl. global rows,
//               supabase_admin ownership inventory)
//   Set R       R1+R2: FOR ROLE postgres, IN SCHEMA public, TABLES and
//               SEQUENCES (sequences are in scope on live evidence)
//   Track F     F1+F2: postgres FUNCTIONS - one per-schema, one global
//               (gated on a branch probe; F2 is the only unscoped statement
//               besides P4)
//   Set P       P1..P4: the same four shapes FOR ROLE supabase_admin -
//               parked, not executable from the current session
//   Track D2    no SQL at all (policy + M1 enforcement)
//
// Invariants: statements only ever SELECT catalog data or alter DEFAULT
// privileges; scope only ever `public` or the two documented global function
// revokes; grantees only ever anon/authenticated/PUBLIC; the file must never
// leak into the migrations directory (where it would silently become "the
// newest migration").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "src", "supabase", "migrations");
const scriptsDir = path.join(root, "scripts");
const proposalPath = path.join(scriptsDir, "proposal-default-privileges.sql");

const proposal = readFileSync(proposalPath, "utf8");

// Statement-only view: drop line comments and block comments so documentation
// prose (which quotes example SQL, forbidden words, and gated/parked
// statements) can never trip the guards.
const stripped = proposal
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

// Comment text with markers removed, whitespace collapsed - used to assert
// on documentation claims that wrap across lines.
const prose = proposal.replace(/--/g, " ").replace(/\s+/g, " ");

// Drop string literals (handling the '' escape) so a literal containing a
// semicolon or keyword cannot be mistaken for executable SQL.
function stripStrings(input) {
  let out = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === "'") {
      i++;
      while (i < input.length) {
        if (input[i] === "'" && input[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (input[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      out += "''";
      continue;
    }
    out += input[i];
    i++;
  }
  return out;
}

const executable = stripStrings(stripped);
const topLevelStatements = executable
  .split(";")
  .map((s) => s.replace(/\s+/g, " ").trim())
  .filter(Boolean);

const selectStatements = topLevelStatements.filter((s) => /^SELECT\b/i.test(s));
const alterStatements = topLevelStatements.filter((s) =>
  /^ALTER\s+DEFAULT\s+PRIVILEGES\b/i.test(s),
);

const hasRole = (s, role) =>
  new RegExp(`FOR\\s+ROLE\\s+${role}\\b`, "i").test(s);
const isPublicScoped = (s) => /IN\s+SCHEMA\s+public\b/i.test(s);
const objectTypes = (stmts) =>
  stmts.map((s) => /ON\s+(TABLES|SEQUENCES|FUNCTIONS)\b/i.exec(s)?.[1]);
const pgStatements = alterStatements.filter((s) => hasRole(s, "postgres"));
const saStatements = alterStatements.filter((s) =>
  hasRole(s, "supabase_admin"),
);

test("proposal exists in scripts/ and never leaks into the migrations directory", () => {
  assert.ok(existsSync(proposalPath), "proposal file must exist");
  assert.ok(
    !existsSync(path.join(migrationsDir, "proposal-default-privileges.sql")),
    "proposal must not be placed in src/supabase/migrations",
  );
  // Guard the naming convention: migration files stay human-named
  // timestamp-prefixed (newest-migration pinning was relaxed when the purely
  // additive 20261025120000_special_awards.sql was added).
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  const sorted = [...files].sort();
  assert.match(sorted[sorted.length - 1], /^\d{14}_[a-z0-9_]+\.sql$/);
});

test("statement census: 4 read-only SELECTs, 8 ALTER DEFAULT PRIVILEGES, nothing else", () => {
  assert.ok(topLevelStatements.length > 0);
  for (const stmt of topLevelStatements) {
    const allowed =
      /^SELECT\b/i.test(stmt) || /^ALTER\s+DEFAULT\s+PRIVILEGES\b/i.test(stmt);
    assert.ok(allowed, `unexpected executable statement: ${stmt}`);
  }
  assert.equal(
    selectStatements.length,
    4,
    "exactly V0 + M1 + M2 + M3 must be the read-only checks",
  );
  assert.equal(
    alterStatements.length,
    8,
    "exactly R1, R2, F1, F2, P1..P4 - nothing added, nothing dropped",
  );
});

test("no data access or destructive SQL anywhere executable", () => {
  assert.ok(
    !/\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|TRUNCATE)\b/i.test(executable),
    "proposal must not touch data",
  );
  assert.ok(!/\bDROP\s+\w/i.test(executable), "proposal must not drop objects");
  assert.ok(
    !/\bALTER\s+TABLE\b/i.test(executable),
    "proposal must not alter existing tables",
  );
  assert.ok(
    !/\bCREATE\s+\w/i.test(executable),
    "proposal must not create objects",
  );
  assert.ok(
    !/\bGRANT\b/i.test(executable),
    "proposal must only revoke, never grant",
  );
  assert.ok(
    !/\bANALYZE\s+public\.|\bVACUUM\b/i.test(executable),
    "no maintenance statements",
  );
});

test("role targets: exactly four statements per role, postgres and supabase_admin only", () => {
  assert.equal(pgStatements.length, 4, "Set R (2) + Track F (2) for postgres");
  assert.equal(saStatements.length, 4, "Set P mirrors R+F for supabase_admin");
  for (const s of alterStatements) {
    assert.doesNotMatch(
      s,
      /FOR\s+ROLE\s+(?!postgres\b|supabase_admin\b)\w+/i,
      `unexpected default-owner role: ${s}`,
    );
  }
  const census = objectTypes(alterStatements).map((t) =>
    (t ?? "MISSING").toUpperCase(),
  );
  census.sort();
  assert.deepEqual(
    census,
    [
      "FUNCTIONS",
      "FUNCTIONS",
      "FUNCTIONS",
      "FUNCTIONS",
      "SEQUENCES",
      "SEQUENCES",
      "TABLES",
      "TABLES",
    ],
    "2 TABLES + 2 SEQUENCES + 4 FUNCTIONS (per-schema and global, per role)",
  );
});

test("Set R: postgres scoped statements are exactly tables and sequences, anon + authenticated", () => {
  const setR = pgStatements.filter(
    (s) => isPublicScoped(s) && /ON\s+(TABLES|SEQUENCES)\b/i.test(s),
  );
  assert.deepEqual(
    objectTypes(setR).sort(),
    ["SEQUENCES", "TABLES"],
    "Set R covers tables/views and sequences - the live-evidence scope",
  );
  assert.equal(
    pgStatements.filter((s) => !isPublicScoped(s)).length,
    1,
    "only Track F's global statement may be unscoped on the postgres side",
  );
  for (const s of setR) {
    assert.match(s, /IN\s+SCHEMA\s+public\b/i, s);
    assert.match(s, /\bREVOKE\s+ALL\b/i, s);
    assert.match(
      s,
      /FROM\s+anon\s*,\s*authenticated\s*$/i,
      `Set R drops anon + authenticated only: ${s}`,
    );
    assert.doesNotMatch(
      s,
      /\bPUBLIC\b/,
      `PUBLIC carries no table/sequence defaults (case-sensitive: must not match "IN SCHEMA public"): ${s}`,
    );
  }
});

test("Track F: postgres function statements are one exact per-schema revoke and one exact global revoke", () => {
  const fnPg = pgStatements.filter((s) => /ON\s+FUNCTIONS\b/i.test(s));
  assert.equal(fnPg.length, 2, "F1 per-schema + F2 global");
  const scoped = fnPg.filter(isPublicScoped);
  const global = fnPg.filter((s) => !isPublicScoped(s));
  assert.equal(scoped.length, 1, "F1 stays scoped to public");
  assert.equal(
    scoped[0],
    "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public " +
      "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated",
    "F1 exact form (PUBLIC kept only as the documented no-op/future-proofing)",
  );
  assert.equal(
    global.length,
    1,
    "F2 is the single unscoped postgres statement",
  );
  assert.equal(
    global[0],
    "ALTER DEFAULT PRIVILEGES FOR ROLE postgres " +
      "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC",
    "F2 exact form - the documented global removal of built-in PUBLIC EXECUTE",
  );
});

test("Set P: supabase_admin statements mirror R+F exactly and stay structurally identifiable as parked", () => {
  assert.deepEqual(
    [...objectTypes(saStatements)].sort(),
    ["FUNCTIONS", "FUNCTIONS", "SEQUENCES", "TABLES"],
    "Set P mirrors Set R + Track F for supabase_admin",
  );
  const expected = [
    "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public " +
      "REVOKE ALL ON TABLES FROM anon, authenticated",
    "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public " +
      "REVOKE ALL ON SEQUENCES FROM anon, authenticated",
    "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public " +
      "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated",
    "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin " +
      "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC",
  ];
  assert.deepEqual(
    [...saStatements].sort(),
    [...expected].sort(),
    "Set P is verbatim payload for a platform path - exact forms pinned",
  );
  assert.equal(
    saStatements.filter((s) => !isPublicScoped(s)).length,
    1,
    "only P4 (global function revoke) may be unscoped",
  );
});

test("scope discipline: only schema public is ever named; only F2 and P4 are global", () => {
  const schemaClauses = [...executable.matchAll(/IN\s+SCHEMA\s+(\w+)/g)].map(
    (m) => m[1],
  );
  assert.equal(schemaClauses.length, 6, "R1, R2, F1, P1, P2, P3 are scoped");
  for (const s of schemaClauses) {
    assert.equal(s, "public", `unexpected IN SCHEMA ${s}`);
  }
  const unscoped = alterStatements.filter((s) => !isPublicScoped(s));
  assert.equal(unscoped.length, 2, "exactly F2 and P4 are database-wide");
  for (const s of unscoped) {
    assert.match(
      s,
      /^ALTER\s+DEFAULT\s+PRIVILEGES\s+FOR\s+ROLE\s+(postgres|supabase_admin)\s+REVOKE\s+EXECUTE\s+ON\s+FUNCTIONS\s+FROM\s+PUBLIC$/i,
      `the only permitted global form is the documented PUBLIC function revoke: ${s}`,
    );
  }
  const sequenceCount = (executable.match(/\bON\s+SEQUENCES\b/gi) ?? []).length;
  assert.equal(
    sequenceCount,
    2,
    "sequences are in scope (live evidence): one statement per role",
  );
  assert.ok(
    !/\bON\s+SCHEMAS\b/i.test(executable),
    "schema-level defaults stay out of scope (database-wide by nature)",
  );
});

test("grantee discipline per statement category; service_role and postgres never revoked", () => {
  const tables = alterStatements.filter((s) => /\bON\s+TABLES\b/i.test(s));
  const sequences = alterStatements.filter((s) =>
    /\bON\s+SEQUENCES\b/i.test(s),
  );
  const fnScoped = alterStatements.filter(
    (s) => /\bON\s+FUNCTIONS\b/i.test(s) && isPublicScoped(s),
  );
  const fnGlobal = alterStatements.filter(
    (s) => /\bON\s+FUNCTIONS\b/i.test(s) && !isPublicScoped(s),
  );
  assert.equal(tables.length, 2, "R1 + P1");
  assert.equal(sequences.length, 2, "R2 + P2");
  assert.equal(fnScoped.length, 2, "F1 + P3");
  assert.equal(fnGlobal.length, 2, "F2 + P4");
  for (const s of [...tables, ...sequences]) {
    assert.match(
      s,
      /FROM\s+anon\s*,\s*authenticated\s*$/i,
      `anon + authenticated exactly: ${s}`,
    );
    assert.doesNotMatch(s, /\bPUBLIC\b/, s);
    assert.match(s, /\bREVOKE\s+ALL\b/i, s);
  }
  for (const s of fnScoped) {
    assert.match(
      s,
      /FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*$/i,
      `PUBLIC, anon, authenticated (PUBLIC contains anon): ${s}`,
    );
    assert.match(s, /\bREVOKE\s+EXECUTE\b/i, s);
  }
  for (const s of fnGlobal) {
    assert.match(s, /FROM\s+PUBLIC\s*$/i, `global revoke is PUBLIC only: ${s}`);
    assert.match(s, /\bREVOKE\s+EXECUTE\b/i, s);
  }
  for (const s of alterStatements) {
    assert.doesNotMatch(s, /\bservice_role\b/i, s);
    assert.doesNotMatch(
      s,
      /FROM[^;]*\bpostgres\b/i,
      `postgres must stay in its own template: ${s}`,
    );
  }
});

test("verification sections: V0 capability, M1 full audit (any proacl), M2 inventory, M3 ownership", () => {
  // V0: runner capability - proves Set R runnable, Set P not.
  assert.ok(
    /pg_catalog\.pg_auth_members/.test(stripped),
    "V0 must probe role membership",
  );
  assert.ok(/rolsuper/.test(stripped), "V0 must report superuser status");
  assert.ok(/pg_has_role/.test(stripped), "V0 must report membership");
  // M1: FULL function audit - filter is anon's effective EXECUTE, never
  // proacl nullity; proacl state is reported as columns, not filtered on.
  assert.ok(
    /has_function_privilege\('anon', p\.oid, 'EXECUTE'\)/.test(stripped),
    "M1 must filter on anon's effective EXECUTE",
  );
  assert.ok(
    /has_function_privilege\('authenticated', p\.oid, 'EXECUTE'\)/.test(
      stripped,
    ),
    "M1 must report authenticated's effective EXECUTE",
  );
  assert.ok(
    /has_function_privilege\('service_role', p\.oid, 'EXECUTE'\)/.test(
      stripped,
    ),
    "M1 must report service_role's effective EXECUTE",
  );
  assert.ok(
    /p\.proacl IS NULL AS proacl_is_null/.test(stripped),
    "M1 must report proacl nullity as a column (live: all 8 were non-null)",
  );
  assert.ok(/p\.prosecdef/.test(stripped), "M1 must flag SECURITY DEFINER");
  assert.ok(
    !/WHERE[^;]*proacl\s+IS\s+NULL/i.test(stripped),
    "M1 must never narrow the audit to proacl IS NULL rows",
  );
  // M2: default-ACL inventory including global rows and all grantees.
  assert.ok(
    /FROM\s+pg_catalog\.pg_default_acl\s+d/.test(stripped),
    "M2 must inventory pg_default_acl",
  );
  assert.ok(/aclexplode/.test(stripped), "M2 must explode stored ACLs");
  assert.ok(
    /defaclnamespace/.test(stripped),
    "M2 must LEFT JOIN the namespace so global rows survive",
  );
  assert.ok(/'\(global\)'/.test(stripped), "M2 must surface global rows");
  for (const flag of [
    "includes_public",
    "includes_anon",
    "includes_authenticated",
    "includes_service_role",
  ]) {
    assert.ok(
      new RegExp(`AS\\s+${flag}\\b`).test(stripped),
      `M2 must expose ${flag}`,
    );
  }
  assert.ok(
    /editable_by_current_session/.test(stripped),
    "M2 must separate runnable (own) rows from parked rows",
  );
  // M3: does supabase_admin own anything in public today?
  assert.ok(/pg_catalog\.pg_proc/.test(stripped), "M3 must scan functions");
  assert.ok(/pg_catalog\.pg_class/.test(stripped), "M3 must scan relations");
  assert.ok(
    /= 'supabase_admin'/.test(stripped),
    "M3 must filter on supabase_admin ownership",
  );
});

test("documentation guarantees: nothing approved, PUBLIC correction, probe gate, sequences in scope", () => {
  assert.ok(
    proposal.includes("NO SQL IN THIS FILE IS APPROVED TO RUN YET"),
    "no statement may be presented as approved to run",
  );
  assert.ok(
    proposal.includes(
      "PARKED - NOT EXECUTABLE FROM THE CURRENT SQL EDITOR SESSION",
    ),
    "Set P must be labelled as not executable from this session",
  );
  // The corrected per-schema explanation, quoted from PG 17 docs (phrases
  // wrap across comment lines, hence the whitespace-collapsed prose view).
  assert.ok(
    prose.includes(
      "This command has no effect, unless it is undoing a matching GRANT",
    ),
    "must quote the documented per-schema no-op rule",
  );
  assert.ok(
    prose.includes(
      "you cannot revoke privileges per-schema if they are granted globally",
    ),
    "must state that per-schema cannot undo globally/built-in grants",
  );
  assert.ok(
    prose.includes("IN SCOPE because live evidence"),
    "sequences must be justified by the live S-row evidence",
  );
  assert.ok(
    proposal.includes("BRANCH-ONLY COMPATIBILITY PROBE"),
    "Track F must stay gated on the branch probe",
  );
  assert.ok(
    proposal.includes("scripts/proposal-default-privileges.sql"),
    "proposal must name its own file so review threads are unambiguous",
  );
});

test("the proposal explicitly excludes itself from Migration 1 and does not edit it", () => {
  const migration = readFileSync(
    path.join(migrationsDir, "20261023120000_reconcile_permissions.sql"),
    "utf8",
  );
  assert.ok(
    !/ALTER\s+DEFAULT\s+PRIVILEGES/i.test(
      migration.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""),
    ),
    "Migration 1 must remain free of ALTER DEFAULT PRIVILEGES until approved",
  );
});
