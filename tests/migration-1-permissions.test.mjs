// Migration 1 (reconcile_permissions) static regression guards.
// The migration is only ever executed by a human in the Supabase SQL Editor;
// these tests pin the security invariants so a future edit cannot silently
// reintroduce excessive grants or drop protections.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "src", "supabase", "migrations");
const migrationName = "20261023120000_reconcile_permissions.sql";
const sql = readFileSync(path.join(migrationsDir, migrationName), "utf8");
// Statement-only view: strip line comments and block comments so the
// forbidden-statement guards cannot trip over documentation prose.
const sqlStatements = sql
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

// Split comment-stripped SQL into top-level statements, respecting
// dollar-quoted function bodies ($$ ... $$) so DML inside
// CREATE FUNCTION ... AS $$ ... $$ is never mistaken for a top-level
// migration statement.
function splitTopLevelStatements(input) {
  const statements = [];
  let current = "";
  let i = 0;
  let dollarTag = null;

  while (i < input.length) {
    const ch = input[i];

    if (dollarTag !== null) {
      if (input.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
      } else {
        current += ch;
        i++;
      }
      continue;
    }

    if (ch === "$") {
      const match = input.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (ch === "'") {
      current += ch;
      i++;
      while (i < input.length) {
        if (input[i] === "'" && input[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (input[i] === "'") {
          current += "'";
          i++;
          break;
        } else {
          current += input[i];
          i++;
        }
      }
      continue;
    }

    if (ch === '"') {
      current += ch;
      i++;
      while (i < input.length && input[i] !== '"') {
        current += input[i];
        i++;
      }
      if (i < input.length) {
        current += '"';
        i++;
      }
      continue;
    }

    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

const topLevelStatements = splitTopLevelStatements(sqlStatements);

function normalizeSql(s) {
  return s.replace(/\s+/g, " ").trim();
}

const SIX_TABLES = [
  "votes",
  "profiles",
  "voting_periods",
  "user_roles",
  "hall_of_fame",
  "admin_notifications",
];

test("migration file name follows the human-named timestamp convention", () => {
  assert.match(migrationName, /^\d{14}_[a-z0-9_]+\.sql$/);
  // NOTE: reconcile_permissions no longer sorts newest on purpose — newer,
  // purely additive migrations (e.g. 20261025120000_special_awards.sql) may
  // follow it. This test only pins the naming convention.
});

test("anon loses all table privileges on all six tables", () => {
  for (const table of SIX_TABLES) {
    const re = new RegExp(
      `REVOKE ALL ON TABLE public\\.${table} FROM anon, authenticated;`,
    );
    assert.match(
      sql,
      re,
      `missing "REVOKE ALL ON TABLE public.${table} FROM anon, authenticated;"`,
    );
  }
});

test("authenticated re-grants are minimal and votes INSERT is retained until Migration 2", () => {
  assert.match(
    sql,
    /GRANT SELECT, INSERT, DELETE ON TABLE public\.votes TO authenticated;/,
    "votes must keep SELECT+INSERT+DELETE (client ballot path still inserts)",
  );
  assert.match(
    sql,
    /GRANT SELECT \(/,
    "profiles must use per-column SELECT grants (so email stays excluded)",
  );
  assert.match(
    sql,
    /GRANT UPDATE \(/,
    "profiles must use per-column UPDATE grants (so email stays excluded)",
  );
  assert.match(
    sql,
    /GRANT SELECT, UPDATE ON TABLE public\.voting_periods TO authenticated;/,
  );
  assert.match(
    sql,
    /GRANT SELECT ON TABLE public\.user_roles TO authenticated;/,
  );
  assert.match(
    sql,
    /GRANT SELECT, INSERT, UPDATE ON TABLE public\.hall_of_fame TO authenticated;/,
  );
  assert.match(
    sql,
    /GRANT SELECT, UPDATE ON TABLE public\.admin_notifications TO authenticated;/,
  );
});

test("no GRANT on public.profiles exposes profiles.email (SELECT or UPDATE, multiline-safe)", () => {
  const profileGrants = topLevelStatements.filter(
    (s) => /^GRANT\s/i.test(s) && /\bpublic\.profiles\b/i.test(s),
  );
  for (const stmt of profileGrants) {
    const normalized = normalizeSql(stmt);

    // Table-level SELECT or UPDATE would re-expose every column including email.
    if (
      /^GRANT\s+(SELECT|UPDATE)\s+ON\s+(?:TABLE\s+)?public\.profiles\b/i.test(
        normalized,
      )
    ) {
      assert.fail(
        `table-level SELECT/UPDATE grant re-exposes profiles.email: ${stmt}`,
      );
    }

    // Column-level: parse the parenthesized column list.
    const colMatch = normalized.match(
      /^GRANT\s+(SELECT|UPDATE)\s*\(([^)]+)\)\s*ON\s+(?:TABLE\s+)?public\.profiles\b/i,
    );
    if (colMatch) {
      const cols = colMatch[2].split(",").map((c) => c.trim().toLowerCase());
      if (cols.includes("email")) {
        assert.fail(`grant includes profiles.email: ${stmt}`);
      }
    }
  }
});

test("profiles grants match exactly the approved per-column set (no table-level or excess grants to authenticated)", () => {
  const approvedSelect = new Set([
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
  ]);
  const approvedUpdate = new Set([
    "full_name",
    "nickname",
    "age",
    "position",
    "jersey_number",
    "profile_image",
    "bio",
    "social_handle",
  ]);

  const profileGrantsToAuth = topLevelStatements.filter(
    (s) =>
      /^GRANT\s/i.test(s) &&
      /\bpublic\.profiles\b/i.test(s) &&
      /\bauthenticated\b/i.test(s),
  );

  let foundSelect = false;
  let foundUpdate = false;

  for (const stmt of profileGrantsToAuth) {
    const normalized = normalizeSql(stmt);

    // Reject table-level grants of any kind (GRANT ALL, GRANT SELECT ON TABLE, etc.).
    if (/\bALL\b/i.test(normalized)) {
      assert.fail(
        `table-level GRANT ALL on public.profiles is forbidden: ${stmt}`,
      );
    }
    if (
      /^GRANT\s+(SELECT|UPDATE|INSERT|DELETE|TRUNCATE)\s+ON\s+(?:TABLE\s+)?public\.profiles\b/i.test(
        normalized,
      )
    ) {
      assert.fail(`unapproved table-level grant on public.profiles: ${stmt}`);
    }

    const colMatch = normalized.match(
      /^GRANT\s+(SELECT|UPDATE)\s*\(([^)]+)\)\s*ON\s+(?:TABLE\s+)?public\.profiles\b/i,
    );
    if (!colMatch) {
      assert.fail(
        `unrecognized GRANT on public.profiles to authenticated: ${stmt}`,
      );
    }

    const priv = colMatch[1].toUpperCase();
    const cols = colMatch[2].split(",").map((c) => c.trim().toLowerCase());

    if (priv === "SELECT") {
      foundSelect = true;
      const expected = [...approvedSelect].sort();
      const actual = [...cols].sort();
      assert.deepEqual(
        actual,
        expected,
        `profiles SELECT grant must be exactly the approved column set; got: ${actual.join(", ")}`,
      );
    } else if (priv === "UPDATE") {
      foundUpdate = true;
      const expected = [...approvedUpdate].sort();
      const actual = [...cols].sort();
      assert.deepEqual(
        actual,
        expected,
        `profiles UPDATE grant must be exactly the approved column set; got: ${actual.join(", ")}`,
      );
    }
  }

  assert.ok(
    foundSelect,
    "missing approved per-column SELECT grant on public.profiles",
  );
  assert.ok(
    foundUpdate,
    "missing approved per-column UPDATE grant on public.profiles",
  );
});

test("broad votes read policy is replaced by an own/admin policy using private.has_role", () => {
  assert.match(sql, /DROP POLICY IF EXISTS votes_select_all ON public\.votes;/);
  assert.match(sql, /CREATE POLICY votes_select_own ON public\.votes/);
  assert.match(sql, /auth\.uid\(\) = voter_id/);
  assert.match(
    sql,
    /private\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/,
  );
});

test("no destructive shortcuts or unexpected top-level data mutations beyond the votes policy swap", () => {
  // Global destructive checks (also cover function bodies for safety).
  assert.ok(!/DROP\s+TABLE\b/i.test(sqlStatements), "must not drop tables");
  assert.ok(!/DROP\s+COLUMN\b/i.test(sqlStatements), "must not drop columns");
  assert.ok(
    !/DROP\s+FUNCTION\b/i.test(sqlStatements),
    "must not drop functions (defensive revokes only)",
  );
  assert.ok(!/TRUNCATE\b/i.test(sqlStatements), "must not truncate anything");

  // Top-level data-mutation checks (skip CREATE FUNCTION bodies).
  for (const stmt of topLevelStatements) {
    const normalized = normalizeSql(stmt);
    if (/^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i.test(normalized)) {
      continue;
    }
    if (/^DELETE\s+FROM\b/i.test(normalized)) {
      assert.fail(`unexpected top-level DELETE FROM: ${normalized}`);
    }
    if (/^UPDATE\s+public\./i.test(normalized)) {
      assert.fail(`unexpected top-level UPDATE on public table: ${normalized}`);
    }
    if (/^INSERT\s+INTO\s+public\./i.test(normalized)) {
      assert.fail(
        `unexpected top-level INSERT into public table: ${normalized}`,
      );
    }
  }

  // DROP POLICY is allowed only for the two votes policies.
  const policyDrops = topLevelStatements.filter((s) =>
    /^DROP\s+POLICY\b/i.test(s),
  );
  const allowedPolicyDrops = new Set([
    "DROP POLICY IF EXISTS votes_select_all ON public.votes",
    "DROP POLICY IF EXISTS votes_select_own ON public.votes",
  ]);
  for (const drop of policyDrops) {
    const normalized = normalizeSql(drop).replace(/;$/, "");
    assert.ok(
      allowedPolicyDrops.has(normalized),
      `unexpected policy drop: ${drop}`,
    );
  }
});

test("RLS is never forced (SECURITY DEFINER RPCs depend on owner bypass)", () => {
  assert.ok(!/FORCE ROW LEVEL SECURITY/i.test(sql));
  assert.ok(
    !/ENABLE ROW LEVEL SECURITY/i.test(sql),
    "RLS stays enabled from prior migrations",
  );
});

test("no ALTER DEFAULT PRIVILEGES without live evidence (deferred to human review)", () => {
  assert.ok(!/ALTER DEFAULT PRIVILEGES/i.test(sqlStatements));
});

test("trigger functions are hardened with pg_temp in search_path and bodies are preserved", () => {
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.set_updated_at\(\)[\s\S]*?SET search_path = public, pg_temp/,
  );
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?SET search_path = public, pg_temp/,
  );
  assert.ok(
    sql.includes("INSERT INTO public.admin_notifications"),
    "handle_new_user must keep the admin notification insert",
  );
  assert.ok(
    sql.includes("ON CONFLICT (type, user_id) DO NOTHING"),
    "handle_new_user must keep the duplicate-registration guard",
  );
});

test("every frontend RPC is explicitly revoked from anon and granted to authenticated", () => {
  const rpcs = [
    ["get_period_results", "uuid"],
    ["is_period_results_visible", "uuid"],
    ["get_player_period_rank", "uuid, uuid"],
    ["get_period_vote_stats", "uuid"],
    ["has_voted_in_period", "uuid"],
    ["get_active_period_analytics", ""],
    ["admin_list_player_emails", ""],
  ];
  for (const [name, args] of rpcs) {
    assert.ok(
      sql.includes(
        `REVOKE ALL ON FUNCTION public.${name}(${args}) FROM PUBLIC, anon;`,
      ),
      `missing anon REVOKE for ${name}(${args})`,
    );
    assert.ok(
      sql.includes(
        `GRANT EXECUTE ON FUNCTION public.${name}(${args}) TO authenticated;`,
      ),
      `missing authenticated GRANT for ${name}(${args})`,
    );
  }
});

test("private.has_role is ensured before policies use it and locked away from anon", () => {
  const ensureIdx = sql.indexOf("CREATE OR REPLACE FUNCTION private.has_role");
  const policyIdx = sql.indexOf("CREATE POLICY votes_select_own");
  assert.ok(ensureIdx !== -1, "private.has_role must be created/replaced");
  assert.ok(policyIdx !== -1);
  assert.ok(
    ensureIdx < policyIdx,
    "private.has_role must be defined before the policy that calls it",
  );
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION private\.has_role\(uuid, public\.app_role\) FROM PUBLIC, anon;/,
  );
});
