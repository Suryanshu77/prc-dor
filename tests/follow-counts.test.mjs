// Guards for src/supabase/migrations/20261115000000_follow_counts.sql
//   * Static: filename convention + history position, SECURITY DEFINER
//     shape, fixed search_path, revoke/grant pair, approved-only counting,
//     aggregate-only return signature, no table grants, no policy changes.
//   * Functional: PGlite, hermetic - full migration chain, never Supabase.
//     Covers the 0/0 baselines, pending and declined requests never
//     counting, accept/unfollow deltas in both directions, identical counts
//     however they are read, refusal of unapproved/anonymous callers, the
//     RLS that keeps rows un-enumerable, and the exact aggregate columns
//     the RPC exposes.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "src/supabase/migrations");
const MIGRATION_NAME = "20261115000000_follow_counts.sql";
const MIGRATION = path.join(MIGRATIONS_DIR, MIGRATION_NAME);
const STUB = path.join(ROOT, "tests/sql/00-stub-supabase-env.sql");
const STORAGE_STUB = path.join(ROOT, "tests/sql/05-stub-supabase-storage.sql");
const DEFAULT_ACL = path.join(ROOT, "tests/sql/10-supabase-default-acl.sql");

const FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = readFileSync(MIGRATION, "utf8");
const stripped = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// ==========================================================================
// Static guards
// ==========================================================================
test("migration file name follows the convention and lands after profile-directory", () => {
  assert.match(path.basename(MIGRATION), /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(
    FILES.indexOf("20261113160000_profile_directory.sql") >= 0 &&
      FILES.indexOf("20261113160000_profile_directory.sql") <
        FILES.indexOf(MIGRATION_NAME),
    "must apply after the profile-directory migration it builds on",
  );
  // Like the special-awards guard, "newest" is relaxed to an explicit
  // allow-list: later, unrelated migrations may land after this one. Only the
  // special-awards master-control RPC (20261115120000) and the position-group
  // awards migration (20261120120000, additive) do so today — nothing may
  // redefine get_follow_counts.
  const newer = FILES.slice(FILES.indexOf(MIGRATION_NAME) + 1);
  assert.deepEqual(
    newer,
    [
      "20261115120000_special_awards_master_control.sql",
      "20261120120000_position_group_awards.sql",
    ],
    "only the special-awards migrations may land after follow-counts",
  );
});

test("the RPC is SECURITY DEFINER with a fixed search_path and auth gates", () => {
  assert.match(
    stripped,
    /CREATE OR REPLACE FUNCTION public\.get_follow_counts\(_user_id uuid\)/,
  );
  assert.match(stripped, /SECURITY DEFINER/);
  assert.match(stripped, /SET search_path = public, pg_temp/);
  // Fail-closed viewer gate (anon -> auth.uid() IS DISTINCT FROM target,
  // then assert_voter_approved raises 'voter approval: ...').
  assert.match(stripped, /PERFORM private\.assert_voter_approved\(v_uid\)/);
  assert.match(stripped, /private\.is_approved\(_user_id\)/);
  assert.match(
    stripped,
    /private\.has_role\(v_uid, 'admin'::public\.app_role\)/,
  );
  // Missing/unapproved targets fail with the same non-leaking text the
  // existing follow RPCs use.
  assert.match(stripped, /'follow counts: player not found'/);
  // Target existence is verified for every caller — admins included —
  // and only after the viewer gate, so an unapproved caller cannot probe
  // which ids exist.
  assert.match(
    stripped,
    /IF NOT EXISTS \(\s*SELECT 1 FROM public\.profiles p WHERE p\.id = _user_id\s*\) THEN/,
  );
  assert.ok(
    stripped.indexOf("PERFORM private.assert_voter_approved(v_uid)") <
      stripped.indexOf("SELECT 1 FROM public.profiles p WHERE p.id = _user_id"),
    "the viewer gate must run before the existence check (no probing)",
  );
});

test("only approved relationships are counted, never pending or rejected", () => {
  assert.match(stripped, /status = 'approved'::public\.follow_request_status/);
  assert.match(stripped, /FILTER \(WHERE fr\.followee_id = _user_id\)/);
  assert.match(stripped, /FILTER \(WHERE fr\.follower_id = _user_id\)/);
});

test("EXECUTE is revoked from PUBLIC/anon and granted to authenticated only", () => {
  assert.ok(
    stripped.includes(
      "REVOKE ALL ON FUNCTION public.get_follow_counts(uuid) FROM PUBLIC, anon;",
    ),
    "must revoke PUBLIC and anon",
  );
  assert.ok(
    stripped.includes(
      "GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO authenticated;",
    ),
    "authenticated needs EXECUTE",
  );
  assert.ok(
    !/GRANT[^;]*get_follow_counts[^;]*\banon\b/i.test(stripped),
    "anon must never receive EXECUTE",
  );
});

test("the file adds no table privileges and touches no RLS policies", () => {
  assert.ok(
    !/\bGRANT\b[^;]*\bON TABLE\b/i.test(stripped),
    "no table GRANT may appear",
  );
  assert.ok(
    !/ON public\.follow_requests\s+TO/i.test(stripped),
    "follow_requests privileges must stay exactly as profile-directory left them",
  );
  assert.ok(
    !/CREATE POLICY|DROP POLICY|ALTER TABLE/i.test(stripped),
    "no policy or table shape changes",
  );
  // Aggregate-only signature: two bigint columns, nothing else.
  assert.match(
    stripped,
    /RETURNS TABLE \(followers bigint, following bigint\)/,
  );
});

// ==========================================================================
// Functional tests (PGlite, hermetic: full migration chain, never Supabase)
// ==========================================================================
let db;

async function readFile(p) {
  return readFileSync(p, "utf8");
}

// PGlite runs PostgreSQL 18, where POSITION is not usable as a RETURNS TABLE
// output column (same accommodation as every other full-chain suite).
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

async function bootPg() {
  const db = new PGlite();
  await db.exec(await readFile(STUB));
  await db.exec(await readFile(STORAGE_STUB));
  await db.exec(await readFile(DEFAULT_ACL));
  return db;
}

async function applyChain(db, files) {
  for (const f of files) {
    await db.exec(loadMigration(path.join(MIGRATIONS_DIR, f)));
  }
}

async function createUser(email, fullName) {
  await asSuper();
  const id = randomUUID();
  await db.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [id, email, JSON.stringify({ full_name: fullName })],
  );
  return id;
}

async function approve(userId) {
  await db.query(
    "UPDATE public.voter_approvals SET status = 'approved', decided_at = now() WHERE user_id = $1",
    [userId],
  );
}

async function asUser(userId) {
  await db.query("SELECT set_config('test.user_id', $1, false)", [
    userId ?? "",
  ]);
  await db.query("SET ROLE authenticated");
}

async function asSuper() {
  await db.query("RESET ROLE");
  await db.query("SELECT set_config('test.user_id', '', false)");
}

/** Call the RPC as the current session and normalise bigint -> number. */
async function counts(targetId) {
  const r = await db.query(
    "SELECT followers, following FROM public.get_follow_counts($1)",
    [targetId],
  );
  assert.equal(r.rows.length, 1, "the RPC returns exactly one aggregate row");
  return {
    followers: Number(r.rows[0].followers),
    following: Number(r.rows[0].following),
  };
}

/** The pending request id between two members, read under RLS as `viewer`. */
async function requestIdBetween(followerId, followeeId) {
  const r = await db.query(
    "SELECT id FROM public.follow_requests WHERE follower_id = $1 AND followee_id = $2",
    [followerId, followeeId],
  );
  assert.equal(r.rows.length, 1, "the request row must be visible to RLS");
  return r.rows[0].id;
}

before(async () => {
  db = await bootPg();
  await applyChain(db, FILES);
});

after(async () => {
  await db?.close();
});

test("a profile with no followers reads 0 Followers, following nobody 0 Following", async () => {
  const a = await createUser(`fc-a-${randomUUID().slice(0, 8)}@one.test`, "A");
  const b = await createUser(`fc-b-${randomUUID().slice(0, 8)}@one.test`, "B");
  await approve(a);
  await approve(b);

  await asUser(a);
  assert.deepEqual(await counts(a), { followers: 0, following: 0 });
  assert.deepEqual(await counts(b), { followers: 0, following: 0 });
  await asUser(b);
  assert.deepEqual(await counts(a), { followers: 0, following: 0 });
  assert.deepEqual(await counts(b), { followers: 0, following: 0 });
  await asSuper();
});

test("a pending request changes neither count; accepting moves both by one", async () => {
  const a = await createUser(`fc-c-${randomUUID().slice(0, 8)}@one.test`, "C");
  const b = await createUser(`fc-d-${randomUUID().slice(0, 8)}@one.test`, "D");
  await approve(a);
  await approve(b);

  await asUser(b);
  const sent = await db.query("SELECT public.request_follow($1) AS s", [a]);
  assert.equal(sent.rows[0].s, "pending");

  // Pending: neither side moves.
  await asUser(a);
  assert.deepEqual(await counts(a), { followers: 0, following: 0 });
  await asUser(b);
  assert.deepEqual(await counts(b), { followers: 0, following: 0 });

  // Accept: A gains a follower, B starts following one.
  await asUser(a);
  const rid = await requestIdBetween(b, a);
  await db.query("SELECT public.decide_follow($1, 'approved')", [rid]);
  assert.deepEqual(await counts(a), { followers: 1, following: 0 });
  await asUser(b);
  assert.deepEqual(await counts(b), { followers: 0, following: 1 });
  await asSuper();
});

test("unfollowing brings both counts back down", async () => {
  const a = await createUser(`fc-e-${randomUUID().slice(0, 8)}@one.test`, "E");
  const b = await createUser(`fc-f-${randomUUID().slice(0, 8)}@one.test`, "F");
  await approve(a);
  await approve(b);

  await asUser(b);
  await db.query("SELECT public.request_follow($1)", [a]);
  await asUser(a);
  const rid = await requestIdBetween(b, a);
  await db.query("SELECT public.decide_follow($1, 'approved')", [rid]);
  assert.deepEqual(await counts(a), { followers: 1, following: 0 });

  await asUser(b);
  await db.query("SELECT public.remove_follow($1)", [a]);
  await asUser(a);
  assert.deepEqual(await counts(a), { followers: 0, following: 0 });
  await asUser(b);
  assert.deepEqual(await counts(b), { followers: 0, following: 0 });
  await asSuper();
});

test("declined requests never affect counts", async () => {
  const a = await createUser(`fc-g-${randomUUID().slice(0, 8)}@one.test`, "G");
  const b = await createUser(`fc-h-${randomUUID().slice(0, 8)}@one.test`, "H");
  await approve(a);
  await approve(b);

  await asUser(b);
  await db.query("SELECT public.request_follow($1)", [a]);
  await asUser(a);
  const rid = await requestIdBetween(b, a);
  await db.query("SELECT public.decide_follow($1, 'rejected')", [rid]);
  assert.deepEqual(await counts(a), { followers: 0, following: 0 });
  await asUser(b);
  assert.deepEqual(await counts(b), { followers: 0, following: 0 });
  await asSuper();
});

test("counts stay identical after a re-read and for every viewer (refresh)", async () => {
  const a = await createUser(`fc-i-${randomUUID().slice(0, 8)}@one.test`, "I");
  const b = await createUser(`fc-j-${randomUUID().slice(0, 8)}@one.test`, "J");
  const c = await createUser(`fc-k-${randomUUID().slice(0, 8)}@one.test`, "K");
  await approve(a);
  await approve(b);
  await approve(c);

  await asUser(b);
  await db.query("SELECT public.request_follow($1)", [a]);
  await asUser(a);
  const rid = await requestIdBetween(b, a);
  await db.query("SELECT public.decide_follow($1, 'approved')", [rid]);

  // Own profile, public profile (read by B) and a third member all see the
  // same numbers; re-reading (a page refresh) returns the same again.
  const reads = [];
  await asUser(a);
  reads.push(await counts(a));
  reads.push(await counts(a));
  await asUser(b);
  reads.push(await counts(a));
  await asUser(c);
  reads.push(await counts(a));
  assert.deepEqual(reads, [
    { followers: 1, following: 0 },
    { followers: 1, following: 0 },
    { followers: 1, following: 0 },
    { followers: 1, following: 0 },
  ]);
  await asSuper();
});

test("unapproved and anonymous callers cannot read other members' counts, or enumerate rows", async () => {
  const a = await createUser(`fc-l-${randomUUID().slice(0, 8)}@one.test`, "L");
  const b = await createUser(`fc-m-${randomUUID().slice(0, 8)}@one.test`, "M");
  const pending = await createUser(
    `fc-n-${randomUUID().slice(0, 8)}@one.test`,
    "N",
  );
  await approve(a);
  await approve(b);

  // Real approved relationship exists between A and B.
  await asUser(b);
  await db.query("SELECT public.request_follow($1)", [a]);
  await asUser(a);
  const rid = await requestIdBetween(b, a);
  await db.query("SELECT public.decide_follow($1, 'approved')", [rid]);

  // A pending member cannot read anyone else's counts.
  await asUser(pending);
  await assert.rejects(
    () => db.query("SELECT * FROM public.get_follow_counts($1)", [a]),
    /voter approval: pending admin approval/,
  );
  // ...and cannot enumerate other members' follow rows through RLS.
  const visible = await db.query(
    "SELECT count(*)::int AS n FROM public.follow_requests",
  );
  assert.equal(visible.rows[0].n, 0, "RLS hides everyone else's rows");

  // Anonymous callers are rejected outright.
  await asUser(null);
  await assert.rejects(
    () => db.query("SELECT * FROM public.get_follow_counts($1)", [a]),
    /voter approval: not authenticated/,
  );

  // An approved viewer reading an unapproved target fails closed with the
  // same non-leaking text the follow RPCs use.
  const rejected = await createUser(
    `fc-o-${randomUUID().slice(0, 8)}@one.test`,
    "O",
  );
  await db.query(
    "UPDATE public.voter_approvals SET status = 'rejected', decided_at = now() WHERE user_id = $1",
    [rejected],
  );
  await asUser(a);
  await assert.rejects(
    () => db.query("SELECT * FROM public.get_follow_counts($1)", [rejected]),
    /follow counts: player not found/,
  );
  await asSuper();
});

test("a member can always read their own counts, even while pending", async () => {
  const pending = await createUser(
    `fc-p-${randomUUID().slice(0, 8)}@one.test`,
    "P",
  );
  await asUser(pending);
  assert.deepEqual(await counts(pending), { followers: 0, following: 0 });
  await asSuper();
});

test("an admin viewer reads unapproved members, but never a nonexistent id", async () => {
  const admin = await createUser(
    `fc-q1-${randomUUID().slice(0, 8)}@one.test`,
    "Q1",
  );
  // Target stays pending: unapproved on purpose.
  const target = await createUser(
    `fc-q2-${randomUUID().slice(0, 8)}@one.test`,
    "Q2",
  );
  const member = await createUser(
    `fc-q3-${randomUUID().slice(0, 8)}@one.test`,
    "Q3",
  );
  await approve(member);
  // Admin role only — the voter_approvals row stays pending, so this also
  // proves the admin bypass inside assert_voter_approved.
  await db.query(
    "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
    [admin],
  );

  // Admin + unapproved target: allowed, like profiles_select_visible.
  await asUser(admin);
  assert.deepEqual(await counts(target), { followers: 0, following: 0 });
  assert.deepEqual(await counts(admin), { followers: 0, following: 0 });

  // A plain approved member gets the non-leaking refusal for the same target.
  await asUser(member);
  await assert.rejects(() => counts(target), /follow counts: player not found/);

  // Nonexistent targets fail closed for everyone — the admin bypass covers
  // approval only, never existence (regression: this used to read 0/0).
  await asUser(admin);
  await assert.rejects(
    () => counts(randomUUID()),
    /follow counts: player not found/,
  );
  await asUser(member);
  await assert.rejects(
    () => counts(randomUUID()),
    /follow counts: player not found/,
  );
  await asSuper();
});

test("unapproved viewers get one refusal for every id, real or not (no probing)", async () => {
  const approved = await createUser(
    `fc-q4-${randomUUID().slice(0, 8)}@one.test`,
    "Q4",
  );
  const pending = await createUser(
    `fc-q5-${randomUUID().slice(0, 8)}@one.test`,
    "Q5",
  );
  const rejected = await createUser(
    `fc-q6-${randomUUID().slice(0, 8)}@one.test`,
    "Q6",
  );
  await approve(approved);
  await asSuper();
  await db.query(
    "UPDATE public.voter_approvals SET status = 'rejected', decided_at = now() WHERE user_id = $1",
    [rejected],
  );

  // Pending viewer: an existing id and a non-existent id are
  // indistinguishable — both fail on the viewer gate first.
  await asUser(pending);
  await assert.rejects(
    () => counts(approved),
    /voter approval: pending admin approval/,
  );
  await assert.rejects(
    () => counts(randomUUID()),
    /voter approval: pending admin approval/,
  );

  // Rejected viewer: refused before anything about the target is revealed.
  await asUser(rejected);
  await assert.rejects(
    () => counts(approved),
    /voter approval: account rejected/,
  );
  await assert.rejects(
    () => counts(randomUUID()),
    /voter approval: account rejected/,
  );
  await asSuper();
});

test("only aggregate columns are returned: no rows, no identities", async () => {
  const a = await createUser(`fc-q-${randomUUID().slice(0, 8)}@one.test`, "Q");
  const b = await createUser(`fc-r-${randomUUID().slice(0, 8)}@one.test`, "R");
  await approve(a);
  await approve(b);

  await asUser(a);
  const r = await db.query("SELECT * FROM public.get_follow_counts($1)", [b]);
  assert.deepEqual(Object.keys(r.rows[0]).sort(), ["followers", "following"]);

  const sig = await db.query(
    "SELECT pg_get_function_result(oid) AS sig FROM pg_proc WHERE proname = 'get_follow_counts'",
  );
  assert.equal(sig.rows.length, 1);
  assert.equal(sig.rows[0].sig, "TABLE(followers bigint, following bigint)");

  // EXECUTE never reaches anon, always reaches authenticated.
  await asSuper();
  const priv = await db.query(
    `SELECT has_function_privilege('anon', 'public.get_follow_counts(uuid)', 'EXECUTE') AS a,
            has_function_privilege('authenticated', 'public.get_follow_counts(uuid)', 'EXECUTE') AS e`,
  );
  assert.deepEqual(priv.rows[0], { a: false, e: true });
});

// ---------------------------------------------------------------------------
// Frontend wiring: correct owner id, real numbers (0 included), and RPC
// failures that stay visible instead of collapsing into a silent placeholder.
// ---------------------------------------------------------------------------

const componentSrc = readFileSync(
  path.join(ROOT, "src/components/profile/FollowCounts.tsx"),
  "utf8",
);
const followSrc = readFileSync(
  path.join(ROOT, "src/lib/use-follow.ts"),
  "utf8",
);
const buttonSrc = readFileSync(
  path.join(ROOT, "src/components/profile/FollowButton.tsx"),
  "utf8",
);
const profileSrc = readFileSync(
  path.join(ROOT, "src/routes/_authenticated/profile.tsx"),
  "utf8",
);
const usernameSrc = readFileSync(
  path.join(ROOT, "src/routes/_authenticated/players/$username.tsx"),
  "utf8",
);

test("the counts query targets the profile owner's id, not the viewer's", () => {
  assert.match(
    followSrc,
    /supabase\.rpc\("get_follow_counts", \{\s*\n\s*_user_id: userId!/,
  );
  // Public page passes the profile row id; own page the signed-in form id.
  assert.match(usernameSrc, /<FollowCounts userId=\{p\.id\}/);
  assert.match(profileSrc, /<FollowCounts userId=\{form\.id\}/);
});

test("RPC failures are logged and rendered as a labelled, retryable error state", () => {
  // The hook keeps the PostgREST message (PGRST202 etc.) diagnosable.
  assert.match(
    followSrc,
    /console\.error\("\[follow\] failed to load follow counts", error\)/,
  );
  assert.match(followSrc, /throw error;/);
  // The old collapse that turned every error into an unexplained em dash
  // indistinguishable from loading must not come back.
  assert.doesNotMatch(
    componentSrc,
    /q\.isPending \|\| \(!data && q\.isError\)/,
  );
  assert.match(componentSrc, /q\.isError/);
  assert.match(componentSrc, /title=\{state\.message\}/); // tooltip carries the message
  assert.match(componentSrc, /text-destructive/); // visually distinct from loading
  assert.match(componentSrc, /q\.refetch\(\)/); // one-click retry
  assert.match(componentSrc, /animate-pulse/); // loading renders a skeleton bar
});

test("a successful zero renders 0, never a placeholder", () => {
  assert.match(componentSrc, /\{state\.n\}/); // raw number, 0 included
  assert.doesNotMatch(componentSrc, /state\.n \?\?/); // no nullish fallback of a real 0
  assert.match(followSrc, /followers: Number\(row\?\.followers \?\? 0\)/);
  assert.match(followSrc, /following: Number\(row\?\.following \?\? 0\)/);
});

test("counts refresh after accepting, cancelling or removing a relationship", () => {
  // Accepting a request moves the count, so it invalidates.
  assert.match(
    followSrc,
    /if \(decision === "approved"\) invalidateFollowCounts\(qc\)/,
  );
  // Cancelling a pending request and unfollowing both run through
  // useRemoveFollow, which always invalidates the counts.
  assert.match(
    followSrc,
    /useRemoveFollow[\s\S]*?invalidateFollowCounts\(qc\)/,
  );
  assert.match(
    buttonSrc,
    /status === "pending"[\s\S]*?remove\.mutate\(targetId/,
  );
});
