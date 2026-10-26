-- Simulates the live Supabase pg_default_acl rows documented in
-- scripts/proposal-default-privileges.sql (Set R): postgres defaults that
-- grant ALL privileges on new public tables and EXECUTE on new public
-- functions to anon, authenticated and service_role.
--
-- Applied between the stub and the real migrations so every table/function
-- created afterwards INHERITS these grants, exactly like production.
-- The special-awards migration must then explicitly REVOKE them (B1).
--
-- The probe table is the harness negative control: it is created AFTER the
-- ALTER DEFAULT PRIVILEGES statements, so has_table_privilege(authenticated,
-- 'public.privilege_probe', 'INSERT') must be true. If this file is not
-- applied (or the ALTERs fail), the probe has no inherited grants and the
-- control fails, proving the privilege assertions are not vacuous.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
CREATE TABLE public.privilege_probe (id int);
