-- ===========================================================================
-- PROPOSAL - NOT APPROVED, NOT EXECUTED. Draft for human review.
--
--   File:  scripts/proposal-default-privileges.sql
--   Date:  2026-10-23 (revised after the live verification runs of that date)
--   Scope: ALTER DEFAULT PRIVILEGES for future objects, plus read-only
--          verification and monitoring queries. Existing objects are
--          Migration 1's job (src/supabase/migrations/
--          20261023120000_reconcile_permissions.sql) - that file is
--          UNCHANGED by this proposal and contains no ALTER DEFAULT
--          PRIVILEGES statements itself.
--
-- NO SQL IN THIS FILE IS APPROVED TO RUN YET. "Runnable" below means only
-- that the current SQL Editor session is technically permitted to execute
-- the statement - it does NOT mean anyone has approved running it.
--
-- STATUS TABLE (read this before anything else)
--
--   SET       STATEMENTS      STATUS                       RUNNABLE FROM CURRENT
--                                                        SQL EDITOR SESSION?
--   Set R     R1, R2          PROPOSED - awaiting approval  YES: session IS
--               (tables +            (run only after a            postgres and
--                sequences)          human says go)               alters only
--                                                                 postgres's own
--                                                                 defaults, only
--                                                                 in `public`
--   Track F   F1, F2          PROPOSED + GATED: do not      Technically yes,
--               (functions)         run until the branch-        but FORBIDDEN
--                                    only probe in section        until the probe
--                                    TRACK F passes AND           passes and a
--                                    a human re-approves          human re-approves
--   Track D2  none            ALTERNATIVE to Track F -      n/a (no SQL)
--                             policy + checks, no SQL
--   Set P     P1..P4          PARKED - pending a            NO - NOT EXECUTABLE
--               (supabase_           supported platform          from this session.
--                admin)              path (see SET P)            Running it here
--                                                                 would fail and
--                                                                 roll back.
--   V0, M1..M3  four SELECTs  READ-ONLY - safe anytime      YES (catalog SELECTs)
--
-- ---------------------------------------------------------------------------
-- LIVE EVIDENCE THIS REVISION IS BASED ON (2026-10-23, PostgreSQL 17.6)
-- Four read-only verification exports, run in the Supabase SQL Editor:
--   query-results-export-2026-10-23_12-13-18.csv  -> section V0 (authority)
--   query-results-export-2026-10-23_12-13-34.csv  -> section M1 (functions)
--   query-results-export-2026-10-23_12-13-56.csv  -> section M2 (exploded)
--   query-results-export-2026-10-23_12-14-18.csv  -> section M2 (summary)
-- Findings:
--   1. Authority: session = postgres, rolsuper = false, NO membership in
--      supabase_admin. postgres can alter its OWN defaults; it cannot alter
--      supabase_admin's defaults (PostgreSQL docs: "you can change your own
--      default privileges and the defaults of roles that you are a member
--      of"). This is why Set P is parked and Set R is not.
--   2. Default ACLs: BOTH postgres and supabase_admin hold `public` rows for
--      object types 'r' (tables/views), 'S' (sequences) and 'f' (functions),
--      each granting to anon AND authenticated (plus service_role; postgres's
--      r/S rows also list sandbox_exec). Six rows total in `public`.
--   3. NO default-ACL row anywhere (any schema, either role) contains a
--      PUBLIC entry, and there are NO global (defaclnamespace = 0) rows.
--   4. PUBLIC EXECUTE on functions still applies to every new function:
--      it comes from PostgreSQL's BUILT-IN default, not from a stored row.
--      See the corrected explanation in TRACK F below.
--   5. Functions: 8 public functions are executable by anon (7 SECURITY
--      DEFINER + set_updated_at), and ALL EIGHT have non-NULL proacl with
--      explicit anon entries (set_updated_at additionally lists PUBLIC).
--      Migration 1 fixes all 8; it has not been applied yet.
--   6. Historical 2026 counts match the expected baseline
--      (183 votes / 21 voters / 21 profiles / 1299 points / 1 hall_of_fame).
--
-- HOW TO USE (human, Supabase SQL Editor - never executed by any tool)
--   0. Migration 1 first, unchanged, as its own run: it fixes the EXISTING
--      objects (8 functions, 6 tables, profiles.email, votes policy).
--      Run scripts/preflight-migration-1.sql before and after it.
--   1. Run section V0. Confirm row 1 says session_is_target_role = true for
--      postgres (Set R runnable) and note row 2's supabase_admin values.
--   2. Run section M2. Save as the BEFORE snapshot.
--   3. APPROVAL GATE: only after a human approves Set R, run R1 + R2 as one
--      batch (they are independent of Migration 1; order does not matter).
--   4. Run M2 again: postgres/public/r and postgres/public/S rows must show
--      includes_anon = false and includes_authenticated = false. Run M1:
--      expect 0 rows after Migration 1. Run preflight section 6 spot-checks:
--      183 / 21 / 21 / 1299 / 1 unchanged. Smoke-test the app.
--   5. DECISION GATE for functions: either run the TRACK F probe on a
--      throwaway branch and (only if it passes + re-approval) apply F1+F2,
--      or adopt TRACK D2 (no SQL, enforcement = M1 returns 0 rows).
--   6. Re-run M2 and M3 after any platform operation (branch create, reset,
--      upgrade) - section 5.7.
--   7. Set P: never pasted into the SQL Editor expecting success. It is
--      verbatim payload for a supported administrative path (section SET P).
-- ===========================================================================


-- ===========================================================================
-- V0 - READ-ONLY RUNNER CAPABILITY CHECK (run any time; two rows)
--
--   Row 1 (postgres): session_is_target_role must be TRUE - that is the
--     documented permission for Set R ("your own default privileges").
--     Observed live 2026-10-23: true, rolsuper false.
--   Row 2 (supabase_admin): session_is_target_role false AND
--     session_is_member_of_target false AND no membership row - the
--     documented conditions for ALTER DEFAULT PRIVILEGES ... FOR ROLE
--     supabase_admin are ALL absent. Observed live: all false.
--     This is the evidence that Set P is not executable from this session.
--     It is also why this file must never be run as one big batch: a single
--     failing statement rolls the whole SQL Editor batch back.
-- ===========================================================================
SELECT
  t.rolname AS target_role,
  (SELECT r.rolname FROM pg_catalog.pg_roles r WHERE r.rolname = current_user) AS session_role,
  (SELECT r.rolsuper FROM pg_catalog.pg_roles r WHERE r.rolname = current_user) AS session_is_superuser,
  (t.oid = (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = current_user)) AS session_is_target_role,
  pg_catalog.pg_has_role(t.oid, 'MEMBER') AS session_is_member_of_target,
  (m.member IS NOT NULL) AS direct_membership_row_exists,
  m.admin_option AS direct_membership_admin_option
FROM pg_catalog.pg_roles t
LEFT JOIN pg_catalog.pg_auth_members m
  ON m.roleid = t.oid
 AND m.member = (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = current_user)
WHERE t.rolname IN ('postgres', 'supabase_admin')
ORDER BY t.rolname;


-- ===========================================================================
-- M1 - READ-ONLY FULL FUNCTION AUDIT (run any time; expect 0 rows AFTER
--      Migration 1)
--
--   Lists EVERY public function executable by anon, REGARDLESS OF WHETHER
--   proacl IS NULL or not. The old draft audited only proacl IS NULL rows;
--   live evidence disproved that as a sufficient audit: all 8 anon-
--   executable functions have NON-NULL proacl with explicit anon entries.
--   proacl_is_null and proacl_raw are included so the reader can see WHERE
--   the access comes from (built-in default vs stored row vs PUBLIC entry
--   inside the row); the filter itself is purely "can anon execute".
--   is_security_definer flags the high-risk subset (7 of 8 live).
-- ===========================================================================
SELECT
  p.oid AS function_oid,
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prokind::text AS kind,
  p.prosecdef AS is_security_definer,
  p.proacl IS NULL AS proacl_is_null,
  coalesce(p.proacl::text, '(null)') AS proacl_raw,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY p.proname, identity_arguments;


-- ===========================================================================
-- M2 - READ-ONLY DEFAULT-ACL INVENTORY, ALL SCHEMAS INCLUDING GLOBAL ROWS
--      (run BEFORE and AFTER Set R / Track F; the pass/fail instrument)
--
--   One row per pg_default_acl entry (any owner, any schema, plus global
--   rows where defaclnamespace = 0 -> default_schema '(global)'), with the
--   stored ACL in full and per-grantee flags. editable_by_current_session
--   separates what this session could change (its own rows) from what it
--   cannot (supabase_admin's rows - Set P territory).
--
--   EXPECTED BEFORE Set R (live 2026-10-23):
--     postgres;public;r|S|f        includes_anon=true, includes_authenticated=true
--     supabase_admin;public;r|S|f  includes_anon=true, includes_authenticated=true
--     includes_public=false on EVERY row (no stored PUBLIC entry anywhere)
--     no '(global)' rows
--   EXPECTED AFTER Set R:
--     postgres;public;r and postgres;public:S -> includes_anon=false,
--       includes_authenticated=false  (Set R goal)
--     postgres;public:f unchanged until Track F; supabase_admin rows
--       unchanged until a platform path runs Set P.
--   EXPECTED AFTER Track F (if approved and probe passed):
--     postgres;public:f -> includes_anon=false, includes_authenticated=false;
--     a NEW '(global)' row for postgres/f is expected to appear (the global
--     REVOKE materialises it - exact stored shape is an implementation
--     detail, which is why the branch probe, not this query, is the proof).
-- ===========================================================================
SELECT
  coalesce(n.nspname, '(global)') AS default_schema,
  pg_catalog.pg_get_userbyid(d.defaclrole) AS default_owner,
  d.defaclobjtype::text AS object_type,
  d.defaclacl::text AS complete_default_acl_row,
  EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(d.defaclacl) x
    WHERE x.grantee = 0
  ) AS includes_public,
  EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(d.defaclacl) x
    WHERE x.grantee = (SELECT q.oid FROM pg_catalog.pg_roles q WHERE q.rolname = 'anon')
  ) AS includes_anon,
  EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(d.defaclacl) x
    WHERE x.grantee = (SELECT q.oid FROM pg_catalog.pg_roles q WHERE q.rolname = 'authenticated')
  ) AS includes_authenticated,
  EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(d.defaclacl) x
    WHERE x.grantee = (SELECT q.oid FROM pg_catalog.pg_roles q WHERE q.rolname = 'service_role')
  ) AS includes_service_role,
  (pg_catalog.pg_get_userbyid(d.defaclrole) = current_user) AS editable_by_current_session
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY default_schema, default_owner, object_type;


-- ===========================================================================
-- M3 - READ-ONLY: DOES supabase_admin CREATE OBJECTS IN `public` AT ALL?
--      (run with M2; sizes the residual risk that Set P cannot close)
--
--   Set P is parked because this session cannot alter supabase_admin's
--   defaults. The parked set only matters if supabase_admin actually creates
--   future objects in `public`. This query counts what exists TODAY.
--   0 rows -> the parked exposure is theoretical so far (platform objects
--   live in auth/storage/realtime/graphql/etc.), still not zero for the
--   future; non-zero -> list is the concrete inventory to review with
--   Supabase support.
-- ===========================================================================
SELECT 'function' AS object_kind, p.proname::text AS object_name
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_catalog.pg_get_userbyid(p.proowner) = 'supabase_admin'
UNION ALL
SELECT 'relation' AS object_kind, c.relname::text AS object_name
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'v', 'm', 'f', 'p', 'S')
  AND pg_catalog.pg_get_userbyid(c.relowner) = 'supabase_admin'
ORDER BY 1, 2;


-- ===========================================================================
-- [SET R] PROPOSED FOR APPROVAL - two statements, nothing else in this
-- section. NOT APPROVED YET: run only after an explicit human go-ahead.
--   Runnable from the current SQL Editor session (session IS postgres;
--   PostgreSQL docs: you may alter "your own default privileges").
--   Scope: FOR ROLE postgres (owner of objects postgres creates),
--   IN SCHEMA public only, future objects only.
--
-- WHY THESE WORK (documented, PG 17 ALTER DEFAULT PRIVILEGES):
--   "Default privileges that are specified per-schema are added to whatever
--    the global default privileges are ... Per-schema REVOKE is only useful
--    to reverse the effects of a previous per-schema GRANT."
--   Live M2 shows the matching per-schema GRANTS exist: postgres's public
--   'r' and 'S' rows explicitly list anon and authenticated. Revoking them
--   per-schema undoes exactly those stored grants.
--
-- TABLES ('r'): built-in table default grants anon nothing, so removing the
--   stored anon/authenticated entries is the whole fix for future tables and
--   views: they then default to owner (+ service_role + sandbox_exec, which
--   stay - trusted/platform roles this proposal never touches). Fail-closed:
--   a future table/view needs an explicit GRANT, which this repo's
--   migrations already do.
--
-- SEQUENCES ('S'): IN SCOPE because live evidence shows it - both roles'
--   public 'S' rows grant rwU (USAGE/SELECT/UPDATE) to anon and
--   authenticated. It is NOT dismissed because current migrations use
--   `uuid ... default gen_random_uuid()`: sequences still arrive via future
--   serial/identity migrations, generated columns, or extensions installed
--   as postgres into `public`. Impact of revoking now: zero (no sequences
--   exist - verified repo-wide). Impact if left: a future sequence would be
--   nextval/setval-usable by anon until someone notices. Fail-closed: the
--   first migration that creates a sequence must GRANT USAGE explicitly.
-- ===========================================================================

-- R1 - tables, views, materialised views, foreign tables in `public`
--      created by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- R2 - sequences in `public` created by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;


-- ===========================================================================
-- [TRACK F] PROPOSED, NOT APPROVED, GATED - functions in `public` created
-- by postgres. DO NOT RUN UNTIL ALL THREE HOLD:
--   (1) Migration 1 applied and verified, Set R applied and verified;
--   (2) the branch-only probe below passes;
--   (3) a human explicitly re-approves after seeing the probe result.
--
-- WHY TWO STATEMENTS ARE NEEDED (the corrected explanation):
--   A future function's effective default = built-in default + any global
--   row + the per-schema row (PG 17: per-schema entries are "added to
--   whatever the global default privileges are").
--   * Built-in function default = owner EXECUTE + PUBLIC EXECUTE.
--     PUBLIC EXECUTE is granted "by default" = GLOBALLY. PG 17 docs are
--     explicit that per-schema cannot remove it: "you cannot revoke
--     privileges per-schema if they are granted globally (either by
--     default ...)" and, for the exact statement
--     `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON
--     FUNCTIONS FROM PUBLIC`, "This command has no effect, unless it is
--     undoing a matching GRANT ... per-schema default privileges can only
--     add privileges to the global setting, not remove privileges granted
--     by it." Live M2 shows NO stored PUBLIC entry exists anywhere, so
--     there is no matching per-schema PUBLIC grant to undo - the PUBLIC
--     portion of a per-schema revoke is a DOCUMENTED NO-OP here.
--   * Because anon is a member of PUBLIC, removing only the stored anon
--     entries (F1) leaves anon executing every future function via PUBLIC.
--     Removing only PUBLIC globally (F2) leaves the stored per-schema
--     anon/authenticated entries granting directly. F1 alone fails; F2
--     alone fails; F1+F2 together close the hole (owner + service_role
--     remain). PUBLIC is still listed in F1 deliberately: harmless today
--     (documented no-op) and it would undo any future per-schema PUBLIC
--     grant, keeping the row self-cleaning.
--
-- WHY F2 IS GLOBAL: PG 17 provides exactly one documented way to remove
--   "the public EXECUTE permission that is normally granted on functions":
--     ALTER DEFAULT PRIVILEGES FOR ROLE admin REVOKE EXECUTE ON FUNCTIONS
--     FROM PUBLIC;
--   (the docs' own example - note: no IN SCHEMA clause). Scope cost: it
--   applies to every schema postgres creates functions in (public, private,
--   storage, auth, extensions, ...), not just `public`. That scope
--   expansion beyond "public only" is precisely why this track is gated
--   rather than proposed for immediate run. Not claimed live-compatible
--   until the probe passes (see risk 5.10).
--
-- BRANCH-ONLY COMPATIBILITY PROBE (throwaway branch or local `supabase`
--   stack from src/supabase/config.toml - NEVER production):
--   1. Run V0 there; confirm the postgres row is target_role-eligible.
--   2. Run F1 + F2 in that branch database (own session, own defaults).
--   3. As postgres: CREATE a scratch function in `public`, then
--        SELECT has_function_privilege('anon', 'public.<scratch>()',
--                                       'EXECUTE');
--      PASS = false. Also create one scratch function in a second scratch
--      schema to confirm the global scope of F2, and drop both.
--   4. Re-run M2 there: expect postgres;public:f includes_anon=false and a
--      new '(global)' postgres/f row.
--   5. Smoke-test whatever the branch app exercises.
--   FAIL at any step -> Track F is abandoned and TRACK D2 below becomes the
--   chosen (mandatory, not optional) function strategy.
-- ===========================================================================

-- F1 - strip stored anon/authenticated (and the no-op PUBLIC) from postgres's
--      per-schema function template in `public`.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- F2 - remove the BUILT-IN PUBLIC EXECUTE for future functions created by
--      postgres, database-wide. This is the documented global form; it is
--      intentionally NOT limited to `public`. Gated - see above.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;


-- ===========================================================================
-- [TRACK D2] ALTERNATIVE TO TRACK F - NO SQL AT ALL.
--
-- If the Track F probe fails, or the global scope of F2 is declined, D2 is
-- the chosen strategy (not a fallback of convenience): future functions are
-- protected by convention + audit instead of by default-ACL surgery.
--   1. CONVENTION (already the repo's de-facto rule, set by Migration 1
--      sections 4-5): every migration that creates or replaces a function
--      in `public` must carry explicit statements:
--        REVOKE ALL ON FUNCTION public.<name>(<args>) FROM PUBLIC, anon;
--        GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;
--      (trigger functions: revoke PUBLIC+anon+authenticated, per Migration 1
--      lines 237-241; service_role handled per Migration 1 policy.)
--   2. ENFORCEMENT: section M1 is the check. M1 returning 0 rows = every
--      public function is closed to anon, by explicit per-object ACLs,
--      regardless of what the defaults say. Any non-zero row after a deploy
--      is a violation of this convention and blocks approval of that
--      deploy's next step. Run M1 in preflight review after every migration
--      batch.
--   3. What D2 does NOT fix: the stored defaults still say "anon yes" for
--      future functions, so D2 depends on the convention holding. That is
--      the accepted trade of choosing D2 over F; it is recorded in 5.10.
-- ===========================================================================


-- ===========================================================================
-- [SET P] PARKED - NOT EXECUTABLE FROM THE CURRENT SQL EDITOR SESSION.
--
-- Live authority check (V0, 2026-10-23): the session is postgres,
-- rolsuper = false, with NO membership in supabase_admin. PostgreSQL's
-- documented permission for ALTER DEFAULT PRIVILEGES is: your own defaults,
-- or defaults of roles you are a member of (or superuser). The session
-- satisfies NONE of these for supabase_admin. If these four statements are
-- pasted into the SQL Editor, they will fail with a permission error and -
-- because the Editor runs the batch transactionally - roll back whatever
-- was in the same batch. DO NOT batch them with Set R or Track F.
--
-- WHAT WOULD UNBLOCK SET P (a supported administrative path - verify, do
-- not assume): Supabase support executing this section verbatim as
-- supabase_admin; or documentation of a supported self-service path if one
-- exists. Also confirm with support whether platform operations (branch
-- creation, reset, upgrade) re-seed supabase_admin's `public` rows - if
-- they do, any one-time fix is temporary and monitoring (M2) becomes the
-- durable control.
--
-- WHAT THIS SET WOULD DO IF RUN BY AN AUTHORIZED ROLE: mirror Set R + Track
-- F for the rows owned by supabase_admin (live M2: the other three `public`
-- rows - 'r', 'S', 'f' - all granting anon/authenticated). F2's counterpart
-- (P4) is global for the same documented reason F2 is.
--
-- EXPLICIT NON-RECOMMENDATION: do not `GRANT supabase_admin TO postgres`
-- to make these statements run. That would hand every holder of the postgres
-- credentials platform-wide authority over auth/storage/realtime - a
-- weakening of platform security, not a remediation. Do not weaken role
-- membership, rolsuper, or platform roles for this purpose.
-- ===========================================================================

-- P1 - tables/views in `public` created by supabase_admin.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- P2 - sequences in `public` created by supabase_admin.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- P3 - functions in `public` created by supabase_admin (per-schema part;
--      PUBLIC portion is the same documented no-op as F1).
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- P4 - built-in PUBLIC EXECUTE removal for supabase_admin's future
--      functions, database-wide (global form, same reason as F2).
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;


-- ===========================================================================
-- SECTION 5 - RISKS AND CHECKS RESERVED FOR HUMAN REVIEW
-- (nothing below is executable SQL; it is the review checklist)
--
-- 5.1 AUTHORITY IS LIVE-CONFIRMED, NOT ASSUMED. V0 reproduces it any time:
--     postgres may alter its own defaults (Set R, Track F); supabase_admin
--     is unreachable from this session (Set P parked). ADMIN OPTION was
--     never the deciding factor here - plain membership itself is absent.
--     No role membership, no rolsuper, and no platform role is to be
--     changed to work around this.
--
-- 5.2 PER-SCHEMA PUBLIC REVOKE CANNOT REMOVE THE BUILT-IN DEFAULT (the
--     correction this revision exists for). The old draft claimed statements
--     revoking PUBLIC per-schema would stop PUBLIC EXECUTE on future
--     functions. PG 17 says the opposite for exactly that statement when no
--     matching per-schema PUBLIC grant exists: "This command has no effect,
--     unless it is undoing a matching GRANT." Live M2 confirms no stored
--     PUBLIC entry exists. Therefore: per-schema PUBLIC revokes are kept
--     only as documented no-ops that would undo a future matching grant;
--     the only documented removal path for the built-in PUBLIC EXECUTE is
--     the GLOBAL statement (F2/P4).
--
-- 5.3 SEQUENCES ARE IN SCOPE ON EVIDENCE, NOT ON ASSUMPTION. Live 'S' rows
--     grant anon/authenticated in `public` for both roles (M2). Current
--     migrations create no sequences (repo-wide check: only REPLICA IDENTITY
--     matches the pattern), so Set R removes a future risk today at zero
--     present cost. The first future migration that needs a sequence must
--     grant USAGE explicitly - that is the fail-closed trade, same as 5.5.
--
-- 5.4 THE FUNCTION AUDIT IS COMPLETE-BY-DESIGN. M1 filters solely on
--     has_function_privilege('anon', ..., 'EXECUTE') and never on proacl
--     nullity, because live evidence showed the risky set is exactly the
--     NON-NULL-proacl rows (8/8 explicit grants, 7 SECURITY DEFINER). After
--     Migration 1, M1 must return 0 rows; that zero is the standing
--     definition of "functions are closed to anon".
--
-- 5.5 FUTURE MIGRATIONS. After Set R, any migration creating a table, view
--     or sequence in `public` must carry explicit GRANTs or the feature
--     fails closed. After Track F (or under D2), same for functions.
--     Every migration in this repo already carries explicit grants - keep
--     that as a standing review item.
--
-- 5.6 DURABILITY. This file is a proposal in `scripts/`, not a migration:
--     `supabase db reset` and any branch rebuilt from migrations will NOT
--     reproduce Set R or Track F. At approval, decide its permanent home -
--     a new forward-only migration run out-of-band like Migration 1 (which
--     would update the "newest migration" pins in the tests) or manual
--     re-run. Until then, treat the SQL Editor run as the source of truth
--     and re-check with M2.
--
-- 5.7 PLATFORM RE-SEEDING. Supabase platform operations (branch create,
--     local reset, project re-init, upgrades) can rebuild default ACLs -
--     especially supabase_admin's rows (Set P territory) and possibly
--     postgres's. Re-run M2 (and V0) after any such operation; M2 is the
--     drift alarm, M3 the ownership inventory.
--
-- 5.8 DATA SAFETY. Nothing in this file can alter rows: every statement is
--     either a catalog SELECT or an ALTER DEFAULT PRIVILEGES (pinned by
--     tests/default-privileges-proposal.test.mjs). Re-run preflight section
--     6 anyway: 183 / 21 / 21 / 1299 / 1 must be unchanged.
--
-- 5.9 DELIBERATELY LEFT ALONE: service_role, sandbox_exec and postgres stay
--     in every template; the `storage`, `auth`, `graphql`, `graphql_public`,
--     `realtime` and `extensions` schemas are never named as targets (M2
--     only reports them - postgres's storage-schema rows DO list
--     anon/authenticated, observed live; that is platform-managed territory:
--     raise it as a support question, do not change it here); Migration 1
--     is not edited; no GRANT, DROP, ALTER TABLE, CREATE, INSERT, UPDATE,
--     DELETE or TRUNCATE appears in any executable statement (test-pinned).
--
-- 5.10 NO LIVE-COMPATIBILITY CLAIMS. As of this draft: Set R is
--      documented-correct and live-evidenced but UNEXECUTED; Track F is
--      documented-correct but UNPROBED and UNEXECUTED (global scope);
--      D2 is policy only; Set P is parked. Nothing here may be described as
--      "applied", "safe on live" or "verified" until its named gate (run +
--      M2/M1 diff for Set R, probe pass for Track F, platform path for Set
--      P) has actually happened and been recorded.
-- ===========================================================================
