-- TEST-ONLY: minimal Supabase `storage` schema stub so the storage-policy
-- migration (20260623050522_8801e8b4-...sql) can apply inside PGlite, which
-- does not ship Supabase's storage extension. Applied between 00-stub and the
-- migrations, exactly like production where the schema already exists.
-- Never apply to any real environment.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Production signature: the folder path of an object, excluding the file name.
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (string_to_array(name, '/'))
    [1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
