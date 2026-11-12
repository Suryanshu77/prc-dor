-- 20261112120000_fix_admin_list_registration_requests_return_types.sql
--
-- PRODUCTION DEFECT (confirmed, not speculative)
--   SQLSTATE 42804: "structure of query does not match function result type"
--   detail: "Returned type character varying(255) does not match expected
--   type text." The admin Registrations queue failed for every caller while
--   grants, SECURITY DEFINER, owner and RLS were all verified correct.
--
-- ROOT CAUSE
--   public.admin_list_registration_requests declares `email text` in its
--   RETURNS TABLE, but its RETURN QUERY selected bare `u.email` from
--   auth.users. Supabase's auth.users.email is character varying(255), and
--   plpgsql compares a RETURN QUERY result shape to the declared output
--   types exactly (no assignment cast), so the call raised before returning
--   a single row. Every other output column already matched:
--     user_id / decided_by  uuid          <- voter_approvals
--     display_name          text          <- already CAST ::text
--     status                voter_approval_status <- enum
--     rejection_reason      text          <- voter_approvals
--     decided_at/created_at/updated_at timestamptz
--   Only `u.email` was wrong.
--
-- WHY IT WAS INVISIBLE LOCALLY
--   tests/sql/00-stub-supabase-env.sql declared auth.users.email as `text`,
--   so the local PGlite chain never reproduced production's type. The stub
--   now mirrors production (varchar(255)) and the regression test asserts
--   that parity plus the declared-vs-returned column types.
--
-- SCOPE / SAFETY (forward-only; 20261111140000 is applied in production and
-- is deliberately left byte-identical)
--   * One expression changes: `u.email` -> `u.email::text`.
--   * Signature, return column names and order, LANGUAGE/STABLE/SECURITY
--     DEFINER/SET search_path, authorization guard, status validation,
--     filtering, ORDER BY and audit behaviour are unchanged.
--   * No GRANT/REVOKE: CREATE OR REPLACE preserves the existing ACL and
--     prosecdef (anon stays denied, authenticated stays granted).
--   * No RLS, policy, table, row or data change of any kind.
--   * Idempotent (CREATE OR REPLACE) and re-runnable.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_registration_requests(
  _status text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  status public.voter_approval_status,
  rejection_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  IF _status IS NOT NULL
     AND lower(_status) NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION
      'admin_list_registration_requests: status must be pending, approved or rejected';
  END IF;

  RETURN QUERY
  SELECT
    va.user_id,
    u.email::text,
    COALESCE(p.full_name, p.nickname, split_part(u.email, '@', 1))::text,
    va.status,
    va.rejection_reason,
    va.decided_by,
    va.decided_at,
    va.created_at,
    va.updated_at
  FROM public.voter_approvals va
  JOIN auth.users u ON u.id = va.user_id
  LEFT JOIN public.profiles p ON p.id = va.user_id
  WHERE _status IS NULL
     OR va.status::text = lower(_status)
  ORDER BY
    CASE va.status
      WHEN 'pending'::public.voter_approval_status THEN 0
      WHEN 'rejected'::public.voter_approval_status THEN 1
      ELSE 2
    END,
    va.updated_at DESC,
    va.user_id;
END $$;

COMMIT;
